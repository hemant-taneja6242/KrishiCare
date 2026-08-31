"""
routes/diagnose.py — POST /api/diagnose

Accepts an image upload (+ optional farm_id/lat/lon), runs the pretrained
classifier, stores the result, and returns disease/confidence/severity.

Day 1 deliverable: this must work end-to-end with Postman + a leaf image.
Day 2 hooks already in place: confidence < 0.85 -> needs_expert_review,
so the Day 2 expert queue can just filter on expert_status='pending'.
"""
import io
import os
import shutil
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from typing import Optional

import ml_inference
from models import Diagnosis, get_db
import schemas
from schemas import DiagnoseResponse
from routes.alerts import create_alerts_for_diagnosis

logger = logging.getLogger("krishicare.diagnose")
router = APIRouter(prefix="/api", tags=["diagnose"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8MB
EXPERT_REVIEW_THRESHOLD = 0.85

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_gemini_vision_model = None


def _get_gemini_vision():
    global _gemini_vision_model
    if _gemini_vision_model is not None:
        return _gemini_vision_model
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_vision_model = genai.GenerativeModel("gemini-1.5-flash")
        return _gemini_vision_model
    except Exception:
        logger.exception("Failed to init Gemini vision client")
        return None


def is_plant_image(image_bytes: bytes) -> tuple[bool, str]:
    """
    Uses Gemini 1.5 Flash to check whether the image contains a plant,
    crop, or leaf. Returns (is_plant: bool, reason: str).
    Defaults to True (allow) if Gemini is unavailable — avoiding a hard
    dependency that would break offline demo scenarios.
    """
    model = _get_gemini_vision()
    if model is None:
        logger.warning("Gemini vision not available — skipping plant guard, allowing image through.")
        return True, "guard_skipped"

    try:
        from PIL import Image
        import google.generativeai as genai
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        prompt = (
            "You are a plant disease detection gatekeeper. "
            "Look at this image and answer ONLY with one of two exact strings:\n"
            "  PLANT — if the image shows a plant, crop, leaf, stem, root, flower, "
            "fruit on a plant, or any agricultural vegetation.\n"
            "  NOT_PLANT — if the image is anything else (person, animal, object, "
            "document, landscape without plants, etc.).\n"
            "Do not explain. Just output PLANT or NOT_PLANT."
        )
        response = model.generate_content([prompt, pil_image])
        verdict = response.text.strip().upper()
        if "NOT_PLANT" in verdict:
            return False, "not_plant"
        return True, "plant_confirmed"
    except Exception as e:
        logger.warning("Plant guard Gemini call failed (%s) — allowing through.", e)
        return True, "guard_error"


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

    # --- plant/crop image guard ---
    plant_ok, guard_reason = is_plant_image(contents)
    if not plant_ok:
        raise HTTPException(
            status_code=422,
            detail=(
                "This image does not appear to show a plant or crop. "
                "Please photograph a leaf, stem, or fruit of the crop you want diagnosed."
            ),
        )

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
    raw_max_prob = result.get("raw_max_prob", confidence)

    # --- post-inference plant guard ---
    # We use two complementary signals from the disease model:
    #   1. norm_entropy >= 0.72  →  probability is nearly uniform across all 38 classes
    #                               (no plant structure recognised at all)
    #   2. raw_max_prob < 0.12   →  model's uncalibrated top class is below random-chance
    #                               threshold for 38 classes (~1/38 = 2.6%, so 12% is very safe)
    # Either alone can produce false positives; both together are robust.
    # If both fire simultaneously it's almost certainly not a plant.
    norm_entropy = result.get("norm_entropy", 0.0)
    NON_PLANT_ENTROPY = 0.72   # measured: real plants ≤ 0.67, solid colors ≥ 0.71
    NON_PLANT_RAWMAX  = 0.12   # certificate image raw_max was ~0.08, all real plants > 0.20

    is_non_plant = (norm_entropy >= NON_PLANT_ENTROPY) or (raw_max_prob < NON_PLANT_RAWMAX)

    if is_non_plant:
        logger.info(
            "Non-plant image rejected: norm_entropy=%.4f (thresh %.2f), raw_max=%.4f (thresh %.2f)",
            norm_entropy, NON_PLANT_ENTROPY, raw_max_prob, NON_PLANT_RAWMAX,
        )
        raise HTTPException(
            status_code=422,
            detail=(
                "This image does not appear to show a plant or crop. "
                "Please photograph a leaf, stem, or fruit of the crop you want diagnosed."
            ),
        )

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

    if diagnosis.expert_status == "auto_confirmed" and diagnosis.disease_label != "Healthy" and diagnosis.severity not in ("Low", "None", "Unknown"):
        create_alerts_for_diagnosis(diagnosis, radius_km=5.0, db=db)

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

@router.get("/history", response_model=list[schemas.DiagnosisOut])
def get_history(farm_id: Optional[int] = None, limit: int = 50, db: Session = Depends(get_db)):
    """Fetch past diagnoses. Filter by farm_id if provided."""
    query = db.query(Diagnosis)
    if farm_id:
        query = query.filter(Diagnosis.farm_id == farm_id)
    return query.order_by(Diagnosis.created_at.desc()).limit(limit).all()
