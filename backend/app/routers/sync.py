from datetime import datetime
import math
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..models import utcnow

router = APIRouter(prefix="/sync", tags=["sync"])

VALID_TRANSITIONS = {
    "logged": {"dispatched"},
    "dispatched": {"parts_replaced"},
    "parts_replaced": {"flow_verified"},
    "flow_verified": set(),
}

@router.post("")
def sync(operations: list[dict], db: Session = Depends(get_db)):
    results = []
    for op in operations:
        op_id = op.get("op_id")
        if not op_id:
            results.append({"op_id": None, "status": "error",
                            "detail": "missing op_id"})
            continue

        # 1. Idempotency check: has this exact operation been applied before?
        prior = db.get(models.AppliedOperation, op_id)
        if prior:
            results.append({"op_id": op_id, "status": "duplicate",
                            "detail": "already applied in an earlier sync"})
            continue

        # 2. Apply the operation
        try:
            status, detail = apply_operation(db, op)
            db.add(models.AppliedOperation(op_id=op_id, entity=op.get("entity", ""),
                                           applied_at=utcnow(), result=status))
            db.commit()
            results.append({"op_id": op_id, "status": status, "detail": detail})
        except Exception as e:
            db.rollback()
            results.append({"op_id": op_id, "status": "error", "detail": str(e)})
    return results

def apply_operation(db: Session, op: dict):
    entity = op.get("entity")
    action = op.get("action")
    payload = op.get("payload", {})

    if entity == "workorder" and action == "create":
        return create_workorder(db, payload)
    if entity == "workorder" and action == "update":
        return update_workorder(db, payload)
    if entity == "evidence" and action == "create":
        return create_evidence(db, payload)
    return "error", f"unsupported: {entity}/{action}"

def create_workorder(db: Session, p: dict):
    existing = db.get(models.WorkOrder, p.get("id"))
    if existing:
        return "duplicate", "work order already exists"
    if not db.get(models.WaterPoint, p.get("waterpoint_id")):
        return "error", "water point not found"
    wo = models.WorkOrder(id=p["id"], waterpoint_id=p["waterpoint_id"],
                          technician_id=p.get("technician_id"),
                          state="logged", description=p.get("description", ""))
    db.add(wo)
    db.add(models.StateTransition(workorder_id=wo.id, from_state=None,
                                  to_state="logged", actor_id=p.get("technician_id")))
    return "applied", None

def update_workorder(db: Session, p: dict):
    wo = db.get(models.WorkOrder, p.get("id"))
    if not wo:
        return "error", "work order not found"
    new_state = p.get("state")
    if new_state and new_state != wo.state:
        allowed = VALID_TRANSITIONS.get(wo.state, set())
        if new_state not in allowed:
            return "error", f"illegal transition {wo.state} -> {new_state}"
        db.add(models.StateTransition(workorder_id=wo.id, from_state=wo.state,
                                      to_state=new_state, actor_id=p.get("technician_id")))
        wo.state = new_state
    if p.get("description"):
        wo.description = p["description"]
    return "applied", None

def create_evidence(db: Session, p: dict):
    wo = db.get(models.WorkOrder, p.get("workorder_id"))
    if not wo:
        return "error", "work order not found"
    result, reason = validate_evidence(wo, p)
    db.add(models.EvidenceBundle(
        id=p.get("id") or str(uuid.uuid4()),
        workorder_id=wo.id,
        photo_ref=p.get("photo_ref"),
        gps_captured_lat=p.get("gps_captured_lat"),
        gps_captured_lon=p.get("gps_captured_lon"),
        captured_at=parse_dt(p.get("captured_at")),
        validation_result=result,
        validation_reason=reason))
    return "applied", None

def validate_evidence(wo, p: dict):
    """Simple, explainable checks (FR12): media present, GPS close to the
    water point, timestamp plausible. Returns result + reason."""
    import math
    reasons = []
    if not p.get("photo_ref"):
        reasons.append("missing required media")
    lat, lon = p.get("gps_captured_lat"), p.get("gps_captured_lon")
    if lat is None or lon is None:
        reasons.append("missing GPS on evidence")
    else:
        d = haversine_km(float(wo.water_point.gps_lat), float(wo.water_point.gps_lon),
                         float(lat), float(lon))
        if d > 0.5:
            reasons.append(f"GPS mismatch: {d:.2f} km from water point")
    dt = parse_dt(p.get("captured_at"))
    if dt is None:
        reasons.append("missing capture timestamp")
    else:
        now = utcnow()
        if dt > now:
            reasons.append("capture time is in the future")
    if len(reasons) >= 2:
        return "rejected", "; ".join(reasons)
    if reasons:
        return "flagged", "; ".join(reasons)
    return "accepted", None

def parse_dt(s):
    if isinstance(s, datetime):
        return s
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None

def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * r * math.asin(math.sqrt(a))
