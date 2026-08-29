"""
routes/expert.py — GET /api/expert/queue, POST /api/expert/validate

Day 2 goal: experts (e.g. ICAR agronomists) review AI diagnoses the model
wasn't confident about, and can approve or correct them.

Anything with confidence < EXPERT_REVIEW_THRESHOLD (set in diagnose.py,
0.85) lands here automatically as expert_status='pending'. Healthy /
high-confidence results skip review entirely (expert_status='auto_confirmed')
so experts aren't wasting time on obvious cases.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Diagnosis, get_db
from schemas import DiagnosisOut, ExpertValidateRequest

router = APIRouter(prefix="/api/expert", tags=["expert"])


@router.get("/queue", response_model=List[DiagnosisOut])
def get_queue(db: Session = Depends(get_db)):
    """All diagnoses still waiting on expert review, oldest first so
    nothing sits unreviewed indefinitely."""
    return (
        db.query(Diagnosis)
        .filter(Diagnosis.expert_status == "pending")
        .order_by(Diagnosis.created_at.asc())
        .all()
    )


@router.post("/validate", response_model=DiagnosisOut)
def validate_diagnosis(payload: ExpertValidateRequest, db: Session = Depends(get_db)):
    diagnosis = db.query(Diagnosis).filter(Diagnosis.id == payload.diagnosis_id).first()
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")

    if diagnosis.expert_status not in ("pending",):
        raise HTTPException(
            status_code=400,
            detail=f"This diagnosis is already '{diagnosis.expert_status}' and cannot be re-validated.",
        )

    if payload.action == "approve":
        diagnosis.expert_status = "approved"
        if payload.corrected_disease:
            # expert can approve AND correct the label in one step
            diagnosis.disease_label = payload.corrected_disease
    elif payload.action == "reject":
        diagnosis.expert_status = "rejected"
        if payload.corrected_disease:
            diagnosis.disease_label = payload.corrected_disease

    if payload.note:
        diagnosis.expert_note = payload.note

    db.commit()
    db.refresh(diagnosis)
    return diagnosis
