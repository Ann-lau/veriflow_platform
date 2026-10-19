"""Import the Kajiado WPDx extract into the water_points table.

Usage (from the backend folder, venv active):
    python -m scripts.import_wpdx ../data/wpdx_kajiado.csv

Safe to run more than once: rows are matched on wpdx_id, so a second run
updates existing rows instead of creating duplicates.
Source data: Water Point Data Exchange (WPDx), CC BY 4.0.
"""
import csv
import sys
from datetime import datetime
from decimal import Decimal

from app.database import SessionLocal
from app.models import WaterPoint


def clean(value):
    """Blank strings become None so the database stores NULL, not ''."""
    value = (value or "").strip()
    return value or None


def to_type(row):
    """VeriFlow's coarse water-point type, from the WPDx technology / source."""
    tech = (clean(row["water_tech_clean"]) or "").lower()
    if tech.startswith("hand pump"):
        return "handpump"
    if tech.startswith("public tapstand"):
        return "tapstand"
    if tech.startswith("motorized"):
        return "motorized_pump"
    source = (clean(row["water_source_category"]) or "unknown").lower()
    return source.replace(" ", "_")


def to_status(row):
    """Collapse the survey status to functional / broken / unknown.
    The original wording is kept separately in status_at_survey."""
    s = (clean(row["status_clean"]) or "").lower()
    if s.startswith("non-functional") or s.startswith("abandoned"):
        return "broken"
    if s.startswith("functional"):
        return "functional"
    return "unknown"


def to_year(value):
    value = clean(value)
    return int(float(value)) if value else None


def to_date(value):
    value = clean(value)
    return datetime.strptime(value, "%Y-%m-%d") if value else None


def to_coord(value):
    return Decimal(f"{float(value):.6f}")


def apply_row(wp, row):
    wp.type = to_type(row)
    wp.gps_lat = to_coord(row["lat_deg"])
    wp.gps_lon = to_coord(row["lon_deg"])
    wp.status = to_status(row)
    wp.water_tech = clean(row["water_tech_clean"])
    wp.county = clean(row["clean_adm1"])
    wp.sub_county = clean(row["clean_adm2"])
    wp.management = clean(row["management_clean"])
    wp.pay = clean(row["pay_clean"])
    wp.installer = clean(row["installer"])
    wp.install_year = to_year(row["install_year"])
    wp.status_at_survey = clean(row["status_clean"])
    wp.last_survey_date = to_date(row["report_date"])
    wp.source_org = clean(row["source"])
    wp.source_dataset = clean(row["dataset_title"])


def main(path):
    created = updated = 0
    db = SessionLocal()
    try:
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                wpdx_id = clean(row["wpdx_id"])
                wp = db.query(WaterPoint).filter_by(wpdx_id=wpdx_id).first()
                if wp is None:
                    wp = WaterPoint(wpdx_id=wpdx_id)
                    db.add(wp)
                    created += 1
                else:
                    updated += 1
                apply_row(wp, row)
        db.commit()  # all or nothing: one bad row leaves the table unchanged
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    print(f"Created {created}, updated {updated}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python -m scripts.import_wpdx ../data/wpdx_kajiado.csv")
    main(sys.argv[1])