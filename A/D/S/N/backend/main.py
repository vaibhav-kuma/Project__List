"""
main.py
=======
FastAPI application entry point.

  • CORS configured for local dev and production origins
  • Database initialised on startup
  • All API routes mounted under /
  • Global exception handlers for 422, 500
  • Uvicorn dev server when run directly

Run:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import os
import sys
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ── Load env before any other app imports ────────────────────────────────────
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("main")

# ── App imports (after env is loaded) ────────────────────────────────────────
from api.routes import router
from database.db import init_database


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: initialise SQLite tables.
    Shutdown: nothing needed for SQLite.
    """
    logger.info("▶  Auto-Apply backend starting up…")

    # Validate required env vars (warn, don't crash, so /health still works)
    for key in ("TINYFISH_API_KEY", "OPENAI_API_KEY"):
        if not os.getenv(key):
            logger.warning("⚠️  %s is not set – some endpoints will fail.", key)

    await init_database()
    logger.info("✅ Database ready")
    logger.info("✅ API server ready on http://0.0.0.0:%s", os.getenv("PORT", "8000"))

    yield  # ← application runs here

    logger.info("⏹  Auto-Apply backend shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# Application instance
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Auto-Apply AI Backend",
    description=(
        "Autonomous job-application agent powered by TinyFish browser "
        "automation and OpenAI GPT-4.  Searches Indeed, scores jobs for "
        "relevance, and submits applications end-to-end."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ─────────────────────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,"
        "http://localhost:5173,"
        "http://localhost:8080,"
        "http://127.0.0.1:3000,"
        "http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Task-ID"],
)

logger.info("CORS origins: %s", ALLOWED_ORIGINS)


# ─────────────────────────────────────────────────────────────────────────────
# routes
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(router)


# ─────────────────────────────────────────────────────────────────────────────
# Global error handlers
# ─────────────────────────────────────────────────────────────────────────────

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not found",
            "path":  request.url.path,
            "hint":  "See /docs for available endpoints.",
        },
    )


@app.exception_handler(422)
async def validation_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error":   "Validation error",
            "detail":  exc.errors() if hasattr(exc, "errors") else str(exc),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error("Unhandled exception on %s:\n%s", request.url.path, tb)
    return JSONResponse(
        status_code=500,
        content={
            "error":     "Internal server error",
            "message":   str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Root info endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["root"])
async def root():
    return {
        "app":     "Auto-Apply AI Backend",
        "version": "1.0.0",
        "docs":    "/docs",
        "health":  "/health",
        "status":  "running",
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint for Docker and monitoring."""
    return {
        "status": "healthy",
        "service": "Auto-Apply AI Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Dev server entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level=LOG_LEVEL.lower(),
    )
