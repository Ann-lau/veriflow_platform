"""Extract the Kajiado County rows from the WPDx enhanced Kenya export.

Usage (from the repo root):
    python scripts/make_kajiado_extract.py path/to/wpdx_enhanced.csv

Rules applied, and nothing else:
  1. Skip the second line of the file (it holds column-metadata tags, not data).
  2. Keep rows whose `clean_adm1` (county) is Kajiado.
All 54 original columns are kept unchanged.

Source: Water Point Data Exchange (WPDx), https://www.waterpointdata.org, CC BY 4.0.
"""
import csv
import sys
from pathlib import Path

COUNTY_COLUMN = "clean_adm1"
COUNTY = "kajiado"
OUT = Path("data/wpdx_kajiado.csv")


def main(src: str) -> None:
    with open(src, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        next(reader)  # metadata row
        col = header.index(COUNTY_COLUMN)
        rows = [r for r in reader if len(r) > col and r[col].strip().lower() == COUNTY]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python scripts/make_kajiado_extract.py path/to/wpdx_enhanced.csv")
    main(sys.argv[1])