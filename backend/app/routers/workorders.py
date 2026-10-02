from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..models import utcnow
import uuid

router = APIRouter(prefix="/workorders", tags=["workorders"])

VALID_TRANSITIONS = {
    "logged": {"dispatched"},
    "dispatched": {"parts_replaced"},
    "parts_replaced": {"flow_verified"},
    "flow_verified": set(),
}

@router.post("")
def create_workorder(waterpoint_id: str, description: str = "",
                     technician_id: str = None, db: Session = Depends(get_db)):
    if not db.get(models.WaterPoint, waterpoint_id):
        raise HTTPException(404, "Water point not found")
    wo = models.WorkOrder(
        id=str(uuid.uuid4()),
        waterpoint_id=waterpoint_id,
        technician_id=technician_id,
        state="logged",
        description=description,
    )
    db.add(wo)
    db.add(models.StateTransition(
        workorder_id=wo.id, from_state=None, to_state="logged",
        actor_id=technician_id))
    db.commit()
    db.refresh(wo)
    return wo

@router.get("")
def list_workorders(db: Session = Depends(get_db)):
    return db.query(models.WorkOrder).all()

@router.get("/{wo_id}")
def get_workorder(wo_id: str, db: Session = Depends(get_db)):
    wo = db.get(models.WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "Work order not found")
    return wo

@router.post("/{wo_id}/transition")
def transition(wo_id: str, new_state: str, actor_id: str = None,
               db: Session = Depends(get_db)):
    wo = db.get(models.WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "Work order not found")
    allowed = VALID_TRANSITIONS.get(wo.state, set())
    if new_state not in allowed:
        raise HTTPException(
            422, f"Illegal transition: {wo.state} -> {new_state}. "
                 f"Allowed next: {sorted(allowed) or 'none'}")
    db.add(models.StateTransition(
        workorder_id=wo.id, from_state=wo.state, to_state=new_state,
        actor_id=actor_id))
    wo.state = new_state
    db.commit()
    db.refresh(wo)
    return wo

@router.get("/{wo_id}/history")
def history(wo_id: str, db: Session = Depends(get_db)):
    wo = db.get(models.WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "Work order not found")
    return [{"from": t.from_state, "to": t.to_state,
             "at": t.timestamp, "actor": t.actor_id} for t in wo.transitions]
