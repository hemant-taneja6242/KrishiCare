"""
routes/diagnose.py — POST /api/diagnose

Accepts an image upload (+ optional farm_id/lat/lon), runs the pretrained
classifier, stores the result, and returns disease/confidence/severity.

Day 1 deliverable: this must work end-to-end with Postman + a leaf image.
Day 2 hooks already in place: confidence < 0.85 -> needs_expert_review,
so the Day 2 expert queue can just filter on expert_status='pending'.
"""
import os
import shutil
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

import ml_inference
from models import Diagnosis, get_db
from schemas import DiagnoseResponse

logger = logging.getLogger("krishicare.diagnose")
router = APIRouter(prefix="/api", tags=["diagnose"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8MB
EXPERT_REVIEW_THRESHOLD = 0.85


@router.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(
    image: UploadFile = File(...),
    farm_id: int | None = Form(None),
    crop_hint: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    mode: str | None = Form("auto"),
    db: Session = Depends(get_db),
):
    logger.info("POST /api/diagnose: filename=%s, crop_hint=%r, mode=%r, farm_id=%s", image.filename, crop_hint, mode, farm_id)

    # --- validate upload ---
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{image.content_type}'. "
                   f"Please upload a JPEG, PNG, or WEBP photo of the leaf.",
        )

    contents = await image.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 8MB).")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # --- save the image for the record / demo replay ---
    ext = os.path.splitext(image.filename or "")[1] or ".jpg"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    with open(saved_path, "wb") as f:
        f.write(contents)

    clean_crop = crop_hint.strip() if (crop_hint and crop_hint.strip() and crop_hint.strip().lower() not in ("auto", "all", "unknown", "other", "none", "null", "undefined")) else None

    # --- run inference ---
    try:
        result = ml_inference.predict(contents, mode=mode or "auto", crop_hint=clean_crop)
    except ValueError as e:
        # not a readable image -> friendly error, not a 500
        raise HTTPException(
            status_code=400,
            detail="We couldn't read that image. Please upload a clear photo of a single leaf.",
        ) from e
    except Exception:
        logger.exception("Inference failed unexpectedly")
        raise HTTPException(
            status_code=503,
            detail="The AI model is temporarily unavailable. Please try again.",
        )

    diag_type = result.get("type", "disease")
    name = result.get("name", result.get("disease", "Unknown"))
    disease = result.get("disease", name)
    confidence = result["confidence"]
    # The returned crop_type MUST ALWAYS match clean_crop if one was provided!
    crop_type = clean_crop or result.get("crop") or "Crops"
    severity = result["severity"]
    is_uncertain = result.get("is_uncertain", False) or (confidence < 0.60)
    needs_review = (confidence < EXPERT_REVIEW_THRESHOLD and disease != "Healthy") or is_uncertain

    # --- persist ---
    diagnosis = Diagnosis(
        farm_id=farm_id,
        crop=crop_type,
        disease_label=name,
        diagnosis_type=diag_type,
        confidence=confidence,
        severity=severity,
        image_path=saved_path,
        expert_status="pending" if needs_review else "auto_confirmed",
        latitude=latitude,
        longitude=longitude,
        created_at=datetime.utcnow(),
    )
    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)

    return DiagnoseResponse(
        diagnosis_id=diagnosis.id,
        type=diag_type,
        name=name,
        disease=disease,
        crop_type=crop_type,
        confidence=confidence,
        severity=severity,
        is_uncertain=is_uncertain,
        needs_expert_review=needs_review,
        image_path=saved_path,
    )
