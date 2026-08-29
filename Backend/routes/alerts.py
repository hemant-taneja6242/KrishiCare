"""
routes/alerts.py — POST /api/alerts/trigger, GET /api/alerts

When a diagnosis is confirmed (approved by expert OR auto-confirmed with
high confidence), this finds other farms within `radius_km` of the
diagnosis location and creates an Alert row for each — this is what
your demo's "3 nearby farms alerted" notification is backed by.

Distance is computed with the haversine formula against real farm
lat/lon in the DB, so as long as you seed farms with realistic
coordinates (Day 4 mock data step), the "nearby" logic is genuinely
correct, not just randomly picked.
"""
from math import asin, cos, radians, sin, sqrt
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Alert, Diagnosis, Farm, get_db
from schemas import AlertOut, AlertTriggerRequest

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))


@router.post("/trigger", response_model=List[AlertOut])
def trigger_alert(payload: AlertTriggerRequest, db: Session = Depends(get_db)):
    diagnosis = db.query(Diagnosis).filter(Diagnosis.id == payload.diagnosis_id).first()
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")

    if diagnosis.latitude is None or diagnosis.longitude is None:
        raise HTTPException(
            status_code=400,
            detail="This diagnosis has no location, so nearby farms can't be found. "
                   "Pass latitude/longitude when calling /api/diagnose.",
        )

    source_farm_id = diagnosis.farm_id

    all_farms = db.query(Farm).all()
    nearby = []
    for farm in all_farms:
        if farm.id == source_farm_id:
            continue
        dist = haversine_km(diagnosis.latitude, diagnosis.longitude, farm.latitude, farm.longitude)
        if dist <= payload.radius_km:
            nearby.append((farm, dist))

    if not nearby:
        return []

    created_alerts = []
    for farm, dist in nearby:
        message = (
            f"{diagnosis.disease_label} detected {dist:.1f} km from your farm. "
            f"Check your {farm.primary_crop or 'crop'} for similar symptoms."
        )
        alert = Alert(
            diagnosis_id=diagnosis.id,
            source_farm_id=source_farm_id,
            target_farm_id=farm.id,
            message=message,
            radius_km=payload.radius_km,
        )
        db.add(alert)
        created_alerts.append(alert)

    db.commit()
    for a in created_alerts:
        db.refresh(a)

    return created_alerts


@router.get("", response_model=List[AlertOut])
def list_alerts(farm_id: int | None = None, db: Session = Depends(get_db)):
    """Alerts received by a farm (or all alerts if farm_id omitted) —
    used by the farmer app's notification list."""
    q = db.query(Alert)
    if farm_id is not None:
        q = q.filter(Alert.target_farm_id == farm_id)
    return q.order_by(Alert.created_at.desc()).all()
