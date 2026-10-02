from fastapi import FastAPI
from .routers import waterpoints

app = FastAPI(title="VeriFlow API")
app.include_router(waterpoints.router)

@app.get("/health")
def health():
    return {"status": "ok"}
