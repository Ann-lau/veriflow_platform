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
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at http://127.0.0.1:8000, with interactive documentation at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:5173. It expects the backend at http://localhost:8000 (configurable in `frontend/.env`).

## Designs

- Figma mockups: https://www.figma.com/design/9uedRs1YBVaLp0sONR9uCr/Veriflow_ui_wireframes?node-id=0-1&t=Svs4pFXluDHmAIXW-1
- Five screens: technician home, log breakdown, capture repair evidence, district dashboard, funder compliance report. Individual exports in `docs/ui_01_home.png` through `docs/ui_05_funder_report.png`.
- Wireframe sheet: `docs/Veriflow_ui_wireframes.png` (grayscale, all five screens).
- Screenshots of the running application: `docs/screenshots/` (home online/offline, breakdown logging, offline save, sync results including the duplicate-detection proof, work-order history).
- Style guide: wireframes are grayscale to evaluate layout without visual bias. The implemented palette: primary #2d3e50 (dark navy), success #4e8a63, flagged #f5e8d0, content background #f4f6f8, system-ui font, rounded corners throughout. The same navy carries across all system diagrams for consistency.