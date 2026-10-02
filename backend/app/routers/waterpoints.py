from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models

router = APIRouter(prefix="/waterpoints", tags=["waterpoints"])

@router.post("")
def create_waterpoint(type: str, gps_lat: float, gps_lon: float,
                      db: Session = Depends(get_db)):
    wp = models.WaterPoint(type=type, gps_lat=gps_lat, gps_lon=gps_lon)
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return wp

@router.get("")
def list_waterpoints(db: Session = Depends(get_db)):
    return db.query(models.WaterPoint).all()

@router.get("/{wp_id}")
def get_waterpoint(wp_id: str, db: Session = Depends(get_db)):
    wp = db.get(models.WaterPoint, wp_id)
    if not wp:
        raise HTTPException(404, "Water point not found")
    return wp
