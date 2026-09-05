"""
api/routes.py
=============
All FastAPI HTTP and WebSocket endpoints for the Auto-Apply backend.

Endpoints
─────────
POST   /api/onboard                  – create user + parse resume
POST   /api/search/{user_id}         – search & score jobs
POST   /api/apply/{user_id}          – start autonomous apply workflow
GET    /api/applications/{user_id}   – list all application records
GET    /api/status/{task_id}         – poll background task status
POST   /api/apply-one/{user_id}      – apply to a single explicit job URL
DELETE /api/users/{user_id}          – delete user + all data
GET    /api/users/{user_id}          – fetch user profile
PATCH  /api/users/{user_id}          – update user profile / preferences
GET    /api/stats/{user_id}          – application statistics dashboard
WS     /ws/{user_id}                 – real-time activity stream
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from asyncio import Lock
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from agents.orchestrator import AutoApplyOrchestrator
from database.db import (
    create_application,
    create_job,
    create_user,
    delete_user,
    get_application,
    get_user,
    get_user_by_email,
    get_user_stats,
    list_applications,
    list_jobs,
    update_user,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# In-memory task / connection registry
# (Replace with Redis in production)
# ─────────────────────────────────────────────────────────────────────────────

# task_id → {"status": str, "result": Any, "error": str}
_tasks: Dict[str, Dict[str, Any]] = {}
_tasks_lock = Lock()

# user_id → list[WebSocket]  (a user can have multiple browser tabs)
_ws_connections: Dict[str, List[WebSocket]] = {}
_ws_connections_lock = Lock()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────────────────────

class JobPreferences(BaseModel):
    title:      Optional[str] = None   # e.g. "Software Engineer"
    location:   Optional[str] = None   # e.g. "Remote" / "San Francisco, CA"
    salary_min: Optional[int] = None   # e.g. 120000
    work_type:  Optional[str] = None   # "remote" | "hybrid" | "onsite"


class UserUpdateRequest(BaseModel):
    full_name:       Optional[str]          = None
    email:           Optional[str]          = None
    phone:           Optional[str]          = None
    linkedin_url:    Optional[str]          = None
    website:         Optional[str]          = None
    job_preferences: Optional[JobPreferences] = None
    answer_bank:     Optional[List[Dict]]   = None


class SearchRequest(BaseModel):
    query:              Optional[str] = None
    location:           Optional[str] = None
    max_results:        int = Field(default=50,  ge=1, le=200)
    min_relevance_score: int = Field(default=0,  ge=0, le=100)


class ApplyRequest(BaseModel):
    query:           Optional[str] = None
    location:        Optional[str] = None
    min_score:       int = Field(default=70, ge=0, le=100)
    max_applications: int = Field(default=20, ge=1, le=50)
    delay_min:       float = Field(default=5.0,  ge=2.0)
    delay_max:       float = Field(default=15.0, ge=2.0)


class ApplyOneRequest(BaseModel):
    job_url:         str
    job_title:       Optional[str] = ""
    company:         Optional[str] = ""
    job_description: Optional[str] = ""


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "resumes")
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def _save_uploaded_file(upload: UploadFile, user_id: str) -> str:
    """Save an uploaded resume file. Returns the local path."""
    ext = os.path.splitext(upload.filename or "resume.pdf")[1] or ".pdf"
    filename = f"{user_id}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    content = await upload.read()
    with open(path, "wb") as f:
        f.write(content)
    logger.info("Saved resume to %s (%d bytes)", path, len(content))
    return path


async def _parse_resume(path: str, oai_client: Any) -> Dict[str, Any]:
    """
    Use GPT-4 to extract structured data from a resume file (plain-text read).

    Returns a dict with: summary, skills, years_experience, education,
    work_history, certifications.
    """
    try:
        import aiofiles
        async with aiofiles.open(path, "rb") as f:
            raw_bytes = await f.read()
        
        # Attempt to decode as UTF-8; fall back to latin-1
        try:
            text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            logger.debug("UTF-8 decode failed for %s, trying latin-1", path)
            text = raw_bytes.decode("latin-1", errors="replace")
        
        # Check for empty content
        if not text.strip():
            logger.error("Resume file is empty: %s", path)
            return {"error": "Resume file is empty or unreadable"}

        # Strip null bytes / control characters
        text = "".join(c for c in text if c.isprintable() or c in "\n\r\t")
        text = text[:8000]  # Limit for GPT context
    except Exception as exc:
        logger.error("Could not read resume file %s: %s", path, exc, exc_info=True)
        return {"error": f"Failed to read resume: {str(exc)}"}

    try:
        resp = await oai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a resume parser. Extract structured data from the "
                        "provided resume text and return ONLY valid JSON, no markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Parse this resume and return JSON with these keys:\n"
                        f"summary, skills (array), years_experience (integer), "
                        f"education (array of {{institution, degree, year}}), "
                        f"work_history (array of {{company, title, duration}}), "
                        f"certifications (array).\n\n"
                        f"Resume text:\n{text}"
                    ),
                },
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        return json.loads(raw)
    except Exception as exc:
        logger.warning("Resume GPT parse failed: %s", exc)
        return {}


def _new_task_id() -> str:
    return str(uuid.uuid4())


async def _broadcast_to_user(user_id: str, payload: Dict[str, Any]) -> None:
    """Send a JSON message to all WebSocket connections for a user."""
    connections = _ws_connections.get(user_id, [])
    dead: List[WebSocket] = []
    for ws in connections:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for d in dead:
        connections.remove(d)


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/ws/{user_id}")
async def websocket_stream(websocket: WebSocket, user_id: str):
    """
    Real-time activity stream for a user.

    The frontend connects here and receives JSON messages as the agent
    searches and applies.  The connection stays open until the workflow
    completes or the client disconnects.

    Message schema:
    {
      "type"     : "search" | "apply" | "success" | "error" | "complete" | "info",
      "message"  : "Human-readable update…",
      "status"   : "info" | "success" | "warning" | "error" | "done",
      "data"     : { … },
      "timestamp": "2025-01-15T10:30:00Z"
    }
    """
    await websocket.accept()
    logger.info("WebSocket connected: user_id=%s", user_id)

    # Register connection
    _ws_connections.setdefault(user_id, []).append(websocket)

    # Send welcome ping
    await websocket.send_json({
        "type":      "info",
        "message":   "Connected to Auto-Apply live stream",
        "status":    "info",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    try:
        # Keep connection alive – wait for client disconnect or ping
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Echo pings back as pongs
                if data.strip().lower() in ("ping", "keepalive"):
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                # Send server heartbeat every 30 s
                await websocket.send_json({
                    "type":      "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: user_id=%s", user_id)
    except Exception as exc:
        logger.warning("WebSocket error user_id=%s: %s", user_id, exc)
    finally:
        conns = _ws_connections.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/onboard
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/onboard", status_code=status.HTTP_201_CREATED)
async def onboard_user(
    full_name:       str       = Form(...),
    email:           str       = Form(...),
    phone:           str       = Form(""),
    linkedin_url:    str       = Form(""),
    website:         str       = Form(""),
    job_preferences: str       = Form("{}"),   # JSON string
    answer_bank:     str       = Form("[]"),   # JSON string
    resume:          Optional[UploadFile] = File(None),
):
    """
    Onboard a new user with profile data and an optional resume upload.

    - Parses the resume with GPT-4 to extract structured skills/experience.
    - Saves the user to the database.
    - Returns the new user_id.

    Form fields
    ───────────
    full_name       : Required. Candidate's full name.
    email           : Required. Contact email.
    phone           : Optional. Phone number.
    linkedin_url    : Optional.
    website         : Optional portfolio / GitHub URL.
    job_preferences : JSON string: {"title","location","salary_min","work_type"}
    answer_bank     : JSON array:  [{"question":"...","answer":"..."}, …]
    resume          : Optional PDF/DOCX file upload.
    """
    # Validate email uniqueness
    existing = await get_user_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email {email!r} already exists (id={existing['id']}). "
                   f"Use PATCH /api/users/{existing['id']} to update.",
        )

    # Parse JSON fields
    try:
        prefs = json.loads(job_preferences)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="job_preferences must be valid JSON")
    try:
        answers = json.loads(answer_bank)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="answer_bank must be valid JSON")

    # Create placeholder user first (to get the ID for file naming)
    user_id = await create_user(
        full_name=full_name,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
        website=website,
        job_preferences=prefs,
        answer_bank=answers,
    )

    # Save and parse resume
    resume_path = ""
    resume_data: Dict[str, Any] = {}

    if resume and resume.filename:
        resume_path = await _save_uploaded_file(resume, user_id)
        # Parse resume asynchronously with GPT-4
        oai_key = os.getenv("OPENAI_API_KEY", "")
        if oai_key:
            import openai as _openai
            oai = _openai.AsyncOpenAI(api_key=oai_key)
            resume_data = await _parse_resume(resume_path, oai)

    # Persist parsed data
    if resume_path or resume_data:
        await update_user(
            user_id,
            resume_path=resume_path,
            resume_data=resume_data,
        )

    logger.info("Onboarded user %s (%s)", user_id, email)
    return {
        "user_id":      user_id,
        "message":      "User created successfully",
        "resume_parsed": bool(resume_data),
        "skills_found": len((resume_data or {}).get("skills", [])),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/users/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/users/{user_id}")
async def get_user_profile(user_id: str):
    """Return the user profile (with JSON fields deserialised)."""
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/users/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/api/users/{user_id}")
async def update_user_profile(user_id: str, body: UserUpdateRequest):
    """
    Partially update a user profile (name, email, preferences, answer_bank, etc.).
    Only non-null fields in the request body are updated.
    """
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates: Dict[str, Any] = {}
    if body.full_name:       updates["full_name"]    = body.full_name
    if body.email:           updates["email"]         = body.email
    if body.phone:           updates["phone"]         = body.phone
    if body.linkedin_url:    updates["linkedin_url"]  = body.linkedin_url
    if body.website:         updates["website"]       = body.website
    if body.job_preferences: updates["job_preferences"] = body.job_preferences.model_dump()
    if body.answer_bank is not None: updates["answer_bank"] = body.answer_bank

    if updates:
        await update_user(user_id, **updates)

    return {"message": "User updated", "fields_updated": list(updates.keys())}


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/users/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/api/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user(user_id: str):
    """Delete a user and all their jobs + applications (cascade)."""
    deleted = await delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/search/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/search/{user_id}")
async def search_jobs(user_id: str, body: SearchRequest):
    """
    Trigger a job search for a user.

    Searches Indeed.com, scores results with GPT-4, persists them to the
    database, and returns them immediately (synchronous – may take ~30-60s).

    For an async/non-blocking version, use POST /api/apply/{user_id} which
    runs the full pipeline in the background.
    """
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prefs = user.get("job_preferences") or {}
    query    = body.query    or prefs.get("title",    "Software Engineer")
    location = body.location or prefs.get("location", "Remote")

    # Build clients
    tf_key  = os.getenv("TINYFISH_API_KEY", "")
    oai_key = os.getenv("OPENAI_API_KEY", "")
    if not tf_key:
        raise HTTPException(status_code=503, detail="TINYFISH_API_KEY not configured")

    from services.tinyfish_client import TinyFishClient
    from agents.job_search_agent import JobSearchAgent
    import openai as _openai

    tf  = TinyFishClient(api_key=tf_key)
    oai = _openai.AsyncOpenAI(api_key=oai_key) if oai_key else None
    agent = JobSearchAgent(tinyfish_client=tf, openai_client=oai)

    # Search
    jobs = await agent.search_jobs(
        query=query,
        location=location,
        max_results=body.max_results,
    )

    # Score if OpenAI available
    if oai and jobs:
        jobs = await agent.score_jobs(jobs, user)

    # Persist to DB and build response
    result_jobs = []
    for job in jobs:
        if job.relevance_score < body.min_relevance_score:
            continue
        try:
            from database.db import upsert_job
            db_id = await upsert_job(
                user_id=user_id,
                url=job.url,
                title=job.title,
                company=job.company,
                location=job.location,
                salary=job.salary,
                description=job.snippet,
                relevance_score=job.relevance_score,
                source=job.source,
            )
        except Exception as exc:
            logger.warning("Could not persist job to DB: %s", exc)
            db_id = None

        result_jobs.append({
            "id":              db_id,
            "title":           job.title,
            "company":         job.company,
            "location":        job.location,
            "salary":          job.salary,
            "url":             job.url,
            "snippet":         job.snippet,
            "relevance_score": job.relevance_score,
            "source":          job.source,
        })

    return {
        "user_id":   user_id,
        "query":     query,
        "location":  location,
        "total":     len(result_jobs),
        "jobs":      result_jobs,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/apply/{user_id}   (background task)
# ─────────────────────────────────────────────────────────────────────────────

async def _run_orchestrator_task(
    task_id: str,
    user_id: str,
    apply_req: ApplyRequest,
) -> None:
    """Background coroutine – runs the full orchestrator pipeline."""
    _tasks[task_id]["status"] = "running"

    # Build a minimal WebSocket emitter that pushes to all open WS connections
    class _FakeWS:
        async def send_json(self, payload: Dict[str, Any]) -> None:
            await _broadcast_to_user(user_id, payload)

    fake_ws = _FakeWS()

    try:
        orch = await AutoApplyOrchestrator.create(
            user_id,
            min_score=apply_req.min_score,
            max_applications=apply_req.max_applications,
            delay_min=apply_req.delay_min,
            delay_max=apply_req.delay_max,
        )
        summary = await orch.run(
            websocket=fake_ws,
            search_query=apply_req.query,
            search_location=apply_req.location,
        )
        _tasks[task_id]["status"] = "done"
        _tasks[task_id]["result"] = summary.to_dict()
        logger.info("Task %s completed: %s", task_id, summary.to_dict())
    except Exception as exc:
        logger.error("Task %s failed: %s", task_id, exc)
        _tasks[task_id]["status"] = "error"
        _tasks[task_id]["error"]  = str(exc)
        await _broadcast_to_user(user_id, {
            "type":      "error",
            "message":   f"Pipeline error: {exc}",
            "status":    "error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })


@router.post("/api/apply/{user_id}", status_code=status.HTTP_202_ACCEPTED)
async def start_apply_workflow(
    user_id: str,
    body: ApplyRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start the full autonomous auto-apply pipeline in the background.

    Returns immediately with a task_id.  Poll GET /api/status/{task_id}
    or subscribe to WS /ws/{user_id} for live updates.
    """
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check for already running task for this user
    running = [
        tid for tid, t in _tasks.items()
        if t.get("user_id") == user_id and t.get("status") == "running"
    ]
    if running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A workflow is already running for this user (task_id={running[0]}). "
                   f"Wait for it to complete or poll its status.",
        )

    task_id = _new_task_id()
    _tasks[task_id] = {
        "task_id": task_id,
        "user_id": user_id,
        "status":  "queued",
        "result":  None,
        "error":   None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    background_tasks.add_task(
        _run_orchestrator_task, task_id, user_id, body
    )

    return {
        "task_id":    task_id,
        "status":     "queued",
        "message":    "Auto-apply workflow started. Connect to /ws/{user_id} for live updates.",
        "poll_url":   f"/api/status/{task_id}",
        "ws_url":     f"/ws/{user_id}",
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/apply-one/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/apply-one/{user_id}", status_code=status.HTTP_202_ACCEPTED)
async def apply_to_single_job(
    user_id: str,
    body: ApplyOneRequest,
    background_tasks: BackgroundTasks,
):
    """
    Apply to a single explicitly provided job URL in the background.
    Useful for manual triggers from the UI ("Apply to this job now").

    Returns task_id; connect to /ws/{user_id} for live updates.
    """
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    task_id = _new_task_id()
    _tasks[task_id] = {
        "task_id":    task_id,
        "user_id":    user_id,
        "status":     "queued",
        "result":     None,
        "error":      None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "job_url":    body.job_url,
    }

    async def _run_one():
        _tasks[task_id]["status"] = "running"

        class _FakeWS:
            async def send_json(self, payload: Dict[str, Any]) -> None:
                await _broadcast_to_user(user_id, payload)

        try:
            orch = await AutoApplyOrchestrator.create(user_id)
            result = await orch.apply_one(
                job_url=body.job_url,
                job_title=body.job_title or "",
                company=body.company or "",
                job_description=body.job_description or "",
                websocket=_FakeWS(),
            )
            _tasks[task_id]["status"] = "done"
            _tasks[task_id]["result"] = {
                "success":      result.success,
                "status":       result.status,
                "confirmation": result.confirmation_text,
                "ats_type":     result.ats_type,
                "error":        result.error_message,
            }
        except Exception as exc:
            _tasks[task_id]["status"] = "error"
            _tasks[task_id]["error"]  = str(exc)

    background_tasks.add_task(_run_one)

    return {
        "task_id":  task_id,
        "status":   "queued",
        "job_url":  body.job_url,
        "poll_url": f"/api/status/{task_id}",
        "ws_url":   f"/ws/{user_id}",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/status/{task_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/status/{task_id}")
async def get_task_status(task_id: str):
    """
    Poll the status of a background workflow task.

    Returns
    ───────
    {
      "task_id": "...",
      "status":  "queued" | "running" | "done" | "error",
      "result":  { … },     // present when done
      "error":   "…"        // present on error
    }
    """
    task = _tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/applications/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/applications/{user_id}")
async def list_user_applications(
    user_id: str,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Return all application records for a user, joined with job details.

    Query params
    ────────────
    status_filter : "pending" | "submitted" | "failed" | "confirmed"
    limit         : Max records (default 50)
    offset        : Pagination offset
    """
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    apps = await list_applications(
        user_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return {"user_id": user_id, "total": len(apps), "applications": apps}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/stats/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/stats/{user_id}")
async def get_stats(user_id: str):
    """
    Return aggregated statistics for the user's dashboard.

    Response
    ────────
    {
      "total_jobs_found": 42,
      "total_applications": 10,
      "submitted": 7,
      "confirmed": 2,
      "failed": 1,
      "pending": 0
    }
    """
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    stats = await get_user_stats(user_id)
    return {"user_id": user_id, **stats}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/jobs/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/jobs/{user_id}")
async def list_user_jobs(
    user_id: str,
    min_relevance: int = 0,
    source: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Return all jobs found for a user, sorted by relevance score."""
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    jobs = await list_jobs(
        user_id,
        min_relevance=min_relevance,
        source=source,
        limit=limit,
        offset=offset,
    )
    return {"user_id": user_id, "total": len(jobs), "jobs": jobs}


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_tasks": sum(
            1 for t in _tasks.values() if t.get("status") == "running"
        ),
        "active_ws_connections": sum(
            len(v) for v in _ws_connections.values()
        ),
    }
