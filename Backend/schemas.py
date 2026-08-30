"""
Pydantic schemas used across routes.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------- Farms ----------

class FarmCreate(BaseModel):
    farmer_name: str
    phone: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: float
    longitude: float
    primary_crop: Optional[str] = None


class FarmOut(BaseModel):
    id: int
    farmer_name: str
    phone: Optional[str]
    village: Optional[str]
    district: Optional[str]
    state: Optional[str]
    latitude: float
    longitude: float
    primary_crop: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Diagnosis ----------

class DiagnoseResponse(BaseModel):
    diagnosis_id: int
    type: str = "disease"  # disease | pest
    name: str              # specific disease or pest name
    disease: str           # backward-compatible alias matching name
    crop_type: Optional[str] = None
    confidence: float
    severity: str
    is_uncertain: bool = False
    needs_expert_review: bool
    image_path: Optional[str] = None


class DiagnosisOut(BaseModel):
    id: int
    farm_id: Optional[int]
    crop: Optional[str]
    disease_label: str
    type: Optional[str] = "disease"
    name: Optional[str] = None
    confidence: float
    severity: str
    is_uncertain: bool = False
    expert_status: str
    expert_note: Optional[str] = None
    image_path: Optional[str] = None
    advisory_text: Optional[str]
    advisory_lang: str
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Expert validation ----------

class ExpertValidateRequest(BaseModel):
    diagnosis_id: int
    action: str = Field(..., pattern="^(approve|reject)$")
    corrected_disease: Optional[str] = None
    note: Optional[str] = None


class ThresholdUpdateRequest(BaseModel):
    threshold: float = Field(..., ge=0.50, le=0.95)


# ---------- Alerts ----------

class AlertTriggerRequest(BaseModel):
    diagnosis_id: int
    radius_km: float = 5.0


class AlertOut(BaseModel):
    id: int
    diagnosis_id: Optional[int] = None
    source_farm_id: Optional[int] = None
    target_farm_id: Optional[int] = None
    message: str
    radius_km: float = 5.0
    created_at: datetime
    disease: Optional[str] = None
    district: Optional[str] = None
    severity: Optional[str] = "High"
    farms_affected: Optional[int] = 1
    status: Optional[str] = "Active"

    class Config:
        from_attributes = True
