from fastapi import FastAPI
from .routers import waterpoints,workorders

app = FastAPI(title="VeriFlow API")
app.include_router(waterpoints.router)
app.include_router(workorders.router)

@app.get("/health")
def health():
    return {"status": "ok"}
