from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _group_counts(db, column):
    """Rows of (label, total, broken) for one WaterPoint column."""
    rows = (
        db.query(
            column,
            func.count(models.WaterPoint.id),
            func.sum(case((models.WaterPoint.status == "broken", 1), else_=0)),
        )
        .group_by(column)
        .order_by(func.count(models.WaterPoint.id).desc())
        .all()
    )
    return [
        {"label": label or "unknown", "total": total, "broken": int(broken or 0)}
        for label, total, broken in rows
    ]


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    wp = models.WaterPoint
    total = db.query(func.count(wp.id)).scalar()
    by_status = dict(db.query(wp.status, func.count(wp.id)).group_by(wp.status).all())

    work_orders = dict(
        db.query(models.WorkOrder.state, func.count(models.WorkOrder.id))
        .group_by(models.WorkOrder.state)
        .all()
    )
    evidence = dict(
        db.query(
            models.EvidenceBundle.validation_result,
            func.count(models.EvidenceBundle.id),
        )
        .group_by(models.EvidenceBundle.validation_result)
        .all()
    )
    survey_range = db.query(func.min(wp.last_survey_date), func.max(wp.last_survey_date)).one()

    return {
        "registry": {
            "total": total,
            "functional": by_status.get("functional", 0),
            "broken": by_status.get("broken", 0),
            "unknown": by_status.get("unknown", 0),
            "survey_from": survey_range[0],
            "survey_to": survey_range[1],
            "note": "Status is the reading at survey time, not live status.",
        },
        "by_sub_county": _group_counts(db, wp.sub_county),
        "by_type": _group_counts(db, wp.type),
        "by_management": _group_counts(db, wp.management),
        "work_orders": {
            "total": sum(work_orders.values()),
            "by_state": work_orders,
        },
        "evidence": {
            "total": sum(evidence.values()),
            "by_result": evidence,
        },
    }