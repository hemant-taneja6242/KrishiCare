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
    disease: str
    crop_type: Optional[str] = None
    confidence: float
    severity: str
    needs_expert_review: bool
    image_path: Optional[str] = None


class DiagnosisOut(BaseModel):
    id: int
    farm_id: Optional[int]
    crop: Optional[str]
    disease_label: str
    confidence: float
    severity: str
    expert_status: str
    advisory_text: Optional[str]
    advisory_lang: str
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Expert validation ----------

class ExpertValidateRequest(BaseModel):
    diagnosis_id: int
    action: str = Field(..., pattern="^(approve|reject)$")
    corrected_disease: Optional[str] = None
    note: Optional[str] = None


# ---------- Alerts ----------

class AlertTriggerRequest(BaseModel):
    diagnosis_id: int
    radius_km: float = 5.0


class AlertOut(BaseModel):
    id: int
    diagnosis_id: Optional[int]
    source_farm_id: Optional[int]
    target_farm_id: Optional[int]
    message: str
    radius_km: float
    created_at: datetime

    class Config:
        from_attributes = True
