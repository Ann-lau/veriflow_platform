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
venv\Scripts\activate          
pip install -r requirements.txt
uvicorn app.main:app --reload

The API runs at [http://127.0.0.1:8000](http://127.0.0.1:8000/) – interactive documentation at /docs.


Frontend
cd frontend
npm install
npm run dev

The app runs at [http://localhost:5173](http://localhost:5173/). It expects the backend at

[http://localhost:8000](http://localhost:8000/) (configurable in frontend/.env).

Designs
## Designs

- Figma mockups: https://www.figma.com/design/9uedRs1YBVaLp0sONR9uCr/Veriflow_ui_wireframes?node-id=0-1&t=Svs4pFXluDHmAIXW-1


Five screens: technician home, log breakdown, capture repair evidence,district dashboard, funder compliance report. Individual exports in docs/ui_01_home.png through docs/ui_05_funder_report.png.

- Wireframe sheet: docs/Veriflow_ui_wireframes.png (grayscale, all five screens)

- Screenshots of the running application: docs/screenshots/

(home online/offline, breakdown logging, offline save, sync results

including the duplicate-detection proof, work-order history).

- Style guide: wireframes are grayscale to evaluate layout without visual bias. The implemented palette: primary #2d3e50 (dark navy),success #4e8a63, flagged #f5e8d0, content background #f4f6f8,system-ui font, rounded corners throughout. The same navy carries across all system diagrams for consistency.

## Key Features

- Offline-first operation (NFR1): all technician functions work without

connectivity; data is stored in IndexedDB and queued for sync.

- Idempotent synchronization (FR11, NFR2): every queued operation carries

a client-generated op_id; replayed batches are detected and skipped,

so syncs on unstable connections never duplicate data.

- Evidence validation (FR12): submitted repair evidence is checked for

required media, GPS consistency with the registered water point

(Haversine distance), and timestamp plausibility; results are

accepted, flagged, or rejected with stored reasons.

- Append-only audit trail (NFR4): every work-order state change is

recorded as a new transition row; history is never edited or deleted.

- Compliance reporting (FR10): verified repairs are aggregated into

funding-period reports containing only evidence-backed entries.

## Deployment Plan

- Database: PostgreSQL on Neon (free tier, permanent storage).

- Backend: FastAPI on Render as a web service; the database URL is

supplied via the DATABASE_URL environment variable; tables are

created on startup by SQLAlchemy.

- Frontend: React production build deployed as a static site on Render,

with VITE_API_BASE pointing at the deployed backend URL.

- Process: push to GitHub → Render auto-deploys from the repository.

## Status
Initial MVP complete: offline data layer, idempotent synchronization,

work-order lifecycle, evidence validation, and compliance reporting.

Next increments: photo storage, community confirmation (FR5), and

authentication.

