"""
routes/farms.py — POST /api/farms, GET /api/farms, GET /api/farms/{id}

Simple CRUD needed by Day 1 evening + used by the map/admin dashboard later.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models import Farm, get_db
from schemas import FarmCreate, FarmOut

router = APIRouter(prefix="/api/farms", tags=["farms"])


@router.post("", response_model=FarmOut)
def create_farm(payload: FarmCreate, db: Session = Depends(get_db)):
    farm = Farm(**payload.model_dump())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.get("", response_model=List[FarmOut])
def list_farms(
    district: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Farm)
    if district:
        q = q.filter(Farm.district == district)
    if state:
        q = q.filter(Farm.state == state)
    return q.order_by(Farm.id.desc()).all()


@router.get("/{farm_id}", response_model=FarmOut)
def get_farm(farm_id: int, db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm
