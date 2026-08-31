"""
routes/expert.py — GET /api/expert/queue, POST /api/expert/validate

Day 2 goal: experts (e.g. ICAR agronomists) review AI diagnoses the model
wasn't confident about, and can approve or correct them.

Anything with confidence < EXPERT_REVIEW_THRESHOLD (set in diagnose.py,
0.85) lands here automatically as expert_status='pending'. Healthy /
high-confidence results skip review entirely (expert_status='auto_confirmed')
so experts aren't wasting time on obvious cases.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models import Diagnosis, get_db
from schemas import DiagnosisOut, ExpertValidateRequest, ThresholdUpdateRequest
from routes.alerts import create_alerts_for_diagnosis

router = APIRouter(prefix="/api/expert", tags=["expert"])


@router.get("/queue", response_model=List[DiagnosisOut])
def get_queue(status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Diagnoses for expert review. If status specified, filter by it;
    otherwise return all diagnoses so the expert portal can view and filter
    across all tabs (pending, approved, rejected, auto_confirmed)."""
    q = db.query(Diagnosis)
    if status and status.lower() != "all":
        q = q.filter(Diagnosis.expert_status == status.lower())
    return q.order_by(Diagnosis.created_at.desc()).all()


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
    
    if payload.action == "approve" and diagnosis.disease_label != "Healthy" and diagnosis.severity not in ("Low", "None", "Unknown"):
        # Default radius of 5.0km for peer alerts triggered by expert confirmation
        create_alerts_for_diagnosis(diagnosis, radius_km=5.0, db=db)
        
    return diagnosis


@router.get("/threshold")
def get_threshold():
    from routes import diagnose
    return {"threshold": diagnose.EXPERT_REVIEW_THRESHOLD}


@router.post("/threshold")
def set_threshold(payload: ThresholdUpdateRequest, db: Session = Depends(get_db)):
    from routes import diagnose
    new_thresh = round(payload.threshold, 4)
    diagnose.EXPERT_REVIEW_THRESHOLD = new_thresh

    # Re-evaluate all diagnoses that haven't been manually validated by an expert
    unfinalized = (
        db.query(Diagnosis)
        .filter(
            Diagnosis.expert_status.in_(["pending", "auto_confirmed"]),
            Diagnosis.disease_label != "Healthy",
        )
        .all()
    )

    for diag in unfinalized:
        if diag.confidence < new_thresh:
            diag.expert_status = "pending"
        else:
            diag.expert_status = "auto_confirmed"

    db.commit()

    pending_count = (
        db.query(Diagnosis)
        .filter(Diagnosis.expert_status == "pending")
        .count()
    )

    return {
        "threshold": new_thresh,
        "pending_count": pending_count,
        "message": f"Review threshold updated to {int(new_thresh * 100)}%",
    }


EXPERTS_ROSTER = [
    {
        "id": 1,
        "name": "Dr. Priya Sharma",
        "title": "Senior Plant Pathologist & Epidemiologist",
        "specialization": "Fungal Epidemiology & Grape Diseases",
        "affiliation": "ICAR - National Research Centre for Grapes, Pune",
        "status": "Online",
        "avatar": "👩‍🔬",
        "active_cases": 4,
    },
    {
        "id": 2,
        "name": "Dr. Ramesh Patil",
        "title": "Chief Agronomist",
        "specialization": "Cereal Crops & Rice Blast Control",
        "affiliation": "MPKV, Rahuri",
        "status": "Online",
        "avatar": "👨‍🔬",
        "active_cases": 2,
    },
    {
        "id": 3,
        "name": "Dr. Sunita Deshmukh",
        "title": "Associate Professor",
        "specialization": "Horticultural Diseases & Tomato Blight",
        "affiliation": "Dr. PDKV, Akola",
        "status": "Online",
        "avatar": "👩‍🔬",
        "active_cases": 3,
    },
    {
        "id": 4,
        "name": "Dr. Amit Kulkarni",
        "title": "Entomologist & Biosecurity Lead",
        "specialization": "Pest Vectors & Crop Virology",
        "affiliation": "VNMKV, Parbhani",
        "status": "Online",
        "avatar": "👨‍🔬",
        "active_cases": 1,
    },
    {
        "id": 5,
        "name": "Dr. Kavita Joshi",
        "title": "Senior Extension Scientist",
        "specialization": "Soil Health & Downy Mildew",
        "affiliation": "Krishi Vigyan Kendra (KVK), Nashik",
        "status": "Online",
        "avatar": "👩‍🔬",
        "active_cases": 5,
    },
    {
        "id": 6,
        "name": "Dr. Rajeshwar Rao",
        "title": "Plant Virologist",
        "specialization": "Legume & Pulse Pathology",
        "affiliation": "IARI Regional Station",
        "status": "Online",
        "avatar": "👨‍🔬",
        "active_cases": 2,
    },
    {
        "id": 7,
        "name": "Dr. Ananya Sen",
        "title": "Microbiologist",
        "specialization": "Bacterial Blight Specialist",
        "affiliation": "National Institute of Plant Health Management",
        "status": "Online",
        "avatar": "👩‍🔬",
        "active_cases": 3,
    },
    {
        "id": 8,
        "name": "Dr. Mohan Shinde",
        "title": "Regional Surveillance Director",
        "specialization": "Climate Risk & Early Warning",
        "affiliation": "Maharashtra Dept of Agriculture",
        "status": "Online",
        "avatar": "👨‍🔬",
        "active_cases": 0,
    },
]


@router.get("/list")
def get_experts_list():
    """Returns the roster of experts active in the platform (matches dashboard stat of 8 active experts)."""
    return {"count": len(EXPERTS_ROSTER), "experts": EXPERTS_ROSTER}

