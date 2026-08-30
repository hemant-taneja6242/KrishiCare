"""
main.py — FastAPI app entrypoint.

Run with:
    uvicorn main:app --reload --port 8000

Docs auto-available at http://localhost:8000/docs (use this for Postman-style
testing if you don't have Postman installed — Day 1 deliverable check).
"""
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("krishicare")

import ml_inference
from models import init_db
from routes import diagnose, farms, expert, alerts, advisory, weather

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="KrishiCare API",
    description="Crop disease detection, advisory, risk & alert backend — SIH'26 (PS 26131)",
    version="0.1.0",
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS: allow_credentials=True is incompatible with allow_origins=["*"] per spec.
# Explicitly list dev origins so the browser doesn't reject the preflight.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diagnose.router)
app.include_router(farms.router)
app.include_router(expert.router)
app.include_router(alerts.router)
app.include_router(advisory.router)  # P2
app.include_router(weather.router)   # P2


@app.on_event("startup")
def on_startup():
    logger.info("Initializing database...")
    init_db()
    logger.info("Warming up ML model (this may take a few seconds)...")
    ml_inference.warm_up()
    logger.info("Startup complete. Visit /docs to test endpoints.")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Day 3 task: 'error handling everywhere.' Any exception that isn't
    already an HTTPException (i.e. something we didn't anticipate) is
    caught here so the demo never shows a raw Python traceback to
    judges — it always gets a clean JSON error instead.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again."},
    )


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_loaded": ml_inference._model is not None,
        "model_name": ml_inference._active_model_name,
    }


@app.get("/")
def root():
    return {"message": "KrishiCare API is running. See /docs for endpoints."}