from fastapi import FastAPI
from .routers import waterpoints,workorders,sync,evidence,reports

app = FastAPI(title="VeriFlow API")
app.include_router(waterpoints.router)
app.include_router(workorders.router)
app.include_router(sync.router)
app.include_router(evidence.router)
app.include_router(reports.router)

@app.get("/health")
def health():
    return {"status": "ok"}
