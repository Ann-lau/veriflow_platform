from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from . import models  # noqa: F401  (registers all model classes on Base)
from .routers import waterpoints, workorders, sync, evidence, reports

# Create all tables from the models 
Base.metadata.create_all(bind=engine)

app = FastAPI(title="VeriFlow API")

# CORS: allow the frontend origin to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(waterpoints.router)
app.include_router(workorders.router)
app.include_router(sync.router)
app.include_router(evidence.router)
app.include_router(reports.router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "veriflow-api"}
