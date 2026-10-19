from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(prefix="/registry", tags=["registry"])

# WPDx survey wording -> three classes the dashboard uses.
WORKING = "working"
ATTENTION = "attention"
NOT_WORKING = "not_working"
CLASS_BY_STATUS = {
    "Functional": WORKING,
    "Functional, not in use": ATTENTION,
    "Functional, needs repair": ATTENTION,
    "Non-Functional": NOT_WORKING,
    "Non-Functional, dry season": NOT_WORKING,
    "Abandoned/Decommissioned": NOT_WORKING,
}


def classify(status_at_survey):
    return CLASS_BY_STATUS.get(status_at_survey)


def technology_bucket(water_tech):
    t = (water_tech or "").lower()
    if t.startswith("hand pump"):
        return "Hand pump"
    if t.startswith("public tapstand"):
        return "Public tapstand"
    return "Other or not recorded"


MANAGEMENT_LABELS = {
    "Community Management": "Community",
    "Private Operator/Delegated Management": "Private operator",
    "No Management": "No management",
    "Other": "Other",
}


def split_by_class(rows):
    """[(label, class), ...] -> [{label, working, attention, not_working, total}], biggest first."""
    table = {}
    for label, cls in rows:
        entry = table.setdefault(
            label, {"label": label, WORKING: 0, ATTENTION: 0, NOT_WORKING: 0, "total": 0}
        )
        entry[cls] += 1
        entry["total"] += 1
    return sorted(table.values(), key=lambda e: -e["total"])


@router.get("")
def registry(db: Session = Depends(get_db)):
    # Only real WPDx points belong in the registry (test points have no wpdx_id).
    wps = (
        db.query(models.WaterPoint)
        .filter(models.WaterPoint.wpdx_id.isnot(None))
        .all()
    )

    points, rows_sub, rows_tech, rows_mgmt = [], [], [], []
    detail = Counter()
    years = Counter()
    sources = Counter()

    for wp in wps:
        cls = classify(wp.status_at_survey)
        if cls is None:
            continue  # status missing or unrecognised: leave it out rather than guess
        sub = (wp.sub_county or "Not recorded").replace("Kajiado ", "")
        year = wp.last_survey_date.year if wp.last_survey_date else None
        points.append(
            {
                "id": wp.id,
                "wpdx_id": wp.wpdx_id,
                "lat": float(wp.gps_lat),
                "lon": float(wp.gps_lon),
                "cls": cls,
                "tech": wp.water_tech or "Not recorded",
                "sub_county": sub,
                "year": year,
                "status": wp.status_at_survey,
            }
        )
        rows_sub.append((sub, cls))
        rows_tech.append((technology_bucket(wp.water_tech), cls))
        rows_mgmt.append((MANAGEMENT_LABELS.get(wp.management, "Not recorded"), cls))
        detail[wp.status_at_survey] += 1
        years[year] += 1
        sources[wp.source_org or "Not recorded"] += 1

    by_class = Counter(p["cls"] for p in points)
    total = len(points)
    year_rows = [{"label": str(y), "total": n} for y, n in sorted(years.items()) if y]
    top_year = max(years.items(), key=lambda kv: kv[1])[0] if years else None

    return {
        "summary": {
            "total": total,
            "working": by_class[WORKING],
            "attention": by_class[ATTENTION],
            "not_working": by_class[NOT_WORKING],
            "sub_counties": len({p["sub_county"] for p in points}),
            "attention_detail": {
                "not_in_use": detail["Functional, not in use"],
                "needs_repair": detail["Functional, needs repair"],
            },
            "not_working_detail": {
                "non_functional": detail["Non-Functional"],
                "dry_season": detail["Non-Functional, dry season"],
                "abandoned": detail["Abandoned/Decommissioned"],
            },
            "top_survey_year": top_year,
            "top_survey_year_count": years[top_year] if top_year else 0,
            "sources": dict(sources),
        },
        "by_sub_county": split_by_class(rows_sub),
        "by_technology": split_by_class(rows_tech),
        "by_management": split_by_class(rows_mgmt),
        "by_survey_year": year_rows,
        "points": points,
    }