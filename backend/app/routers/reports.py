from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..models import utcnow

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/generate")
def generate_report(start: str, end: str, db: Session = Depends(get_db)):
    """Aggregate verified repairs between two dates (YYYY-MM-DD) into a
    compliance report (FR10)."""
    # parse the dates simply
    from datetime import datetime
    try:
        s = datetime.fromisoformat(start)
        e = datetime.fromisoformat(end).replace(hour=23, minute=59)
    except ValueError:
        raise HTTPException(422, "Dates must be YYYY-MM-DD")

    orders = db.query(models.WorkOrder).all()
    verified = []
    for wo in orders:
        accepted = [b for b in wo.evidence_bundles if b.validation_result == "accepted"]
        if accepted and accepted[0].captured_at and s <= accepted[0].captured_at <= e:
            verified.append(wo)

    report = models.ComplianceReport(period_id=None, verified_repair_count=len(verified))
    # create the period implicitly for the demo
    period = db.query(models.FundingPeriod).filter_by(start_date=s).first()
    if not period:
        period = models.FundingPeriod(start_date=s, end_date=e)
        db.add(period)
        db.commit()
        db.refresh(period)
    report.period_id = period.id
    db.add(report)
    for wo in verified:
        db.add(models.ReportEntry(report_id=report.id, workorder_id=wo.id))
    db.commit()
    db.refresh(report)
    return {"id": report.id, "period": f"{start} to {end}",
            "verified_repair_count": report.verified_repair_count,
            "workorders": [o.id for o in verified]}

@router.get("/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db)):
    r = db.get(models.ComplianceReport, report_id)
    if not r:
        raise HTTPException(404, "Report not found")
    return {"id": r.id, "verified_repair_count": r.verified_repair_count,
            "entries": [{"workorder_id": e.workorder_id,
                         "verified": e.verified_flag} for e in r.entries]}
