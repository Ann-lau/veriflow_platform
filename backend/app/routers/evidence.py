from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models

router = APIRouter(prefix="/evidence", tags=["evidence"])

@router.get("/workorder/{wo_id}")
def list_for_workorder(wo_id: str, db: Session = Depends(get_db)):
    wo = db.get(models.WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "Work order not found")
    return [{"id": b.id,
             "photo_ref": b.photo_ref,
             "captured_at": b.captured_at,
             "validation_result": b.validation_result,
             "validation_reason": b.validation_reason} for b in wo.evidence_bundles]

@router.get("/pending")
def pending_reviews(db: Session = Depends(get_db)):
    bundles = db.query(models.EvidenceBundle).filter(
        models.EvidenceBundle.validation_result.in_(["flagged", "pending"])).all()
    return [{"id": b.id, "workorder_id": b.workorder_id,
             "validation_result": b.validation_result,
             "validation_reason": b.validation_reason} for b in bundles]
