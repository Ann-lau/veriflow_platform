from fastapi import FastAPI

app = FastAPI(title="VeriFlow API")

@app.get("/health")
def health():
    return {"status": "ok"}
