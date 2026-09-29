# VeriFlow

Offline-first tracking for water point repairs, with verifiable evidence to support results-based funding.

## Description

Rural water infrastructure in sub-Saharan Africa fails at maintenance rather than construction: roughly one in four handpumps is non-functional at any given time. Professional maintenance providers that fix this are paid through results-based funding, which depends on performance data funders can trust. VeriFlow is an offline-first platform where field technicians log breakdowns and capture geotagged repair evidence in low-connectivity areas, an evidence-validation engine checks each repair against its work order, and funders receive compliance reports aligned with results-based contract indicators.

**GitHub repository:** https://github.com/Annlau/veriflow_platform

## Tech Stack

- **Frontend:** React + Vite (PWA, offline-capable)
- **Offline layer:** IndexedDB via Dexie.js
- **Backend:** Python + FastAPI
- **Database:** SQLite (dev) / PostgreSQL on Neon (production)

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows  (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload
