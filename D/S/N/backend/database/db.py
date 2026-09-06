"""
database/db.py
==============
Async SQLite database layer using aiosqlite.

Tables
──────
  users        – user profile, resume, preferences, answer bank
  jobs         – discovered job listings linked to a user
  applications – application attempts with status tracking

All primary keys are UUIDs (stored as TEXT).
All JSON fields are stored as TEXT and (de)serialised automatically.
"""

from __future__ import annotations

import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

import aiosqlite

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

DB_PATH = Path(__file__).parent.parent / "data" / "app.db"


def _now() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _dumps(obj: Any) -> Optional[str]:
    """Serialise a Python object to JSON string, or None if obj is None."""
    if obj is None:
        return None
    return json.dumps(obj, ensure_ascii=False)


def _loads(s: Optional[str]) -> Any:
    """Deserialise a JSON string, returning None if s is None/empty."""
    if not s:
        return None
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return s  # return raw string if it can't be parsed


# ─────────────────────────────────────────────────────────────────────────────
# DDL – CREATE TABLE statements
# ─────────────────────────────────────────────────────────────────────────────

_DDL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
    id               TEXT PRIMARY KEY,
    full_name        TEXT,
    email            TEXT,
    phone            TEXT,
    linkedin_url     TEXT,
    website          TEXT,
    resume_path      TEXT,
    resume_data      TEXT,          -- JSON: parsed resume content
    job_preferences  TEXT,          -- JSON: {title, location, salary_min, work_type}
    answer_bank      TEXT,          -- JSON: [{question, answer}, ...]
    created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            TEXT,
    company          TEXT,
    location         TEXT,
    salary           TEXT,
    url              TEXT,
    description      TEXT,
    relevance_score  INTEGER DEFAULT 0,
    source           TEXT,          -- e.g. "indeed", "linkedin", "naukri"
    found_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_relevance ON jobs(user_id, relevance_score DESC);

CREATE TABLE IF NOT EXISTS applications (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id            TEXT NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','submitted','failed','confirmed')),
    confirmation_text TEXT,
    screenshot_path   TEXT,
    error_message     TEXT,
    applied_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_apps_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_job_id  ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_status  ON applications(user_id, status);
"""


# ─────────────────────────────────────────────────────────────────────────────
# Connection context manager
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Yield an open, row-factory-enabled database connection."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA foreign_keys=ON")
        await conn.execute("PRAGMA journal_mode=WAL")
        yield conn


# ─────────────────────────────────────────────────────────────────────────────
# Initialisation
# ─────────────────────────────────────────────────────────────────────────────

async def init_database() -> None:
    """
    Create all tables and indexes if they do not already exist.
    Safe to call on every startup.
    """
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.executescript(_DDL)
        await conn.commit()
    logger.info("Database initialised at %s", DB_PATH)


# ─────────────────────────────────────────────────────────────────────────────
# Helper: convert aiosqlite.Row → plain dict
# ─────────────────────────────────────────────────────────────────────────────

def _row(row: Optional[aiosqlite.Row]) -> Optional[Dict[str, Any]]:
    return dict(row) if row else None


def _rows(rows: List[aiosqlite.Row]) -> List[Dict[str, Any]]:
    return [dict(r) for r in rows]


# ─────────────────────────────────────────────────────────────────────────────
# ── USERS ─────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

async def create_user(
    *,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    linkedin_url: Optional[str] = None,
    website: Optional[str] = None,
    resume_path: Optional[str] = None,
    resume_data: Optional[Any] = None,
    job_preferences: Optional[Dict[str, Any]] = None,
    answer_bank: Optional[List[Dict[str, str]]] = None,
) -> str:
    """Insert a new user row. Returns the new user id."""
    user_id = _new_id()
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO users
                (id, full_name, email, phone, linkedin_url, website,
                 resume_path, resume_data, job_preferences, answer_bank, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                user_id,
                full_name,
                email,
                phone,
                linkedin_url,
                website,
                resume_path,
                _dumps(resume_data),
                _dumps(job_preferences),
                _dumps(answer_bank),
                _now(),
            ),
        )
        await db.commit()
    logger.debug("Created user id=%s email=%s", user_id, email)
    return user_id


async def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    """Return a user dict by id, with JSON fields deserialised."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM users WHERE id=?", (user_id,))
        row = _row(await cursor.fetchone())
    if row:
        row["resume_data"] = _loads(row.get("resume_data"))
        row["job_preferences"] = _loads(row.get("job_preferences"))
        row["answer_bank"] = _loads(row.get("answer_bank"))
    return row


async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Return a user dict by email address."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM users WHERE email=?", (email,))
        row = _row(await cursor.fetchone())
    if row:
        row["resume_data"] = _loads(row.get("resume_data"))
        row["job_preferences"] = _loads(row.get("job_preferences"))
        row["answer_bank"] = _loads(row.get("answer_bank"))
    return row


async def list_users() -> List[Dict[str, Any]]:
    """Return all users (JSON fields deserialised)."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM users ORDER BY created_at DESC")
        rows = _rows(await cursor.fetchall())
    for row in rows:
        row["resume_data"] = _loads(row.get("resume_data"))
        row["job_preferences"] = _loads(row.get("job_preferences"))
        row["answer_bank"] = _loads(row.get("answer_bank"))
    return rows


async def update_user(user_id: str, **fields: Any) -> bool:
    """
    Partially update a user row. Accepts any subset of column names.
    JSON-object fields (resume_data, job_preferences, answer_bank) are
    automatically serialised.

    Returns True if a row was updated.
    """
    json_fields = {"resume_data", "job_preferences", "answer_bank"}
    if not fields:
        return False

    serialised = {
        k: (_dumps(v) if k in json_fields else v)
        for k, v in fields.items()
    }
    set_clause = ", ".join(f"{k}=?" for k in serialised)
    values = list(serialised.values()) + [user_id]

    async with get_db() as db:
        cursor = await db.execute(
            f"UPDATE users SET {set_clause} WHERE id=?", values
        )
        await db.commit()
    return cursor.rowcount > 0


async def delete_user(user_id: str) -> bool:
    """Delete a user and (via CASCADE) all their jobs and applications."""
    async with get_db() as db:
        cursor = await db.execute("DELETE FROM users WHERE id=?", (user_id,))
        await db.commit()
    return cursor.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# ── JOBS ──────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

async def create_job(
    *,
    user_id: str,
    title: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    salary: Optional[str] = None,
    url: Optional[str] = None,
    description: Optional[str] = None,
    relevance_score: int = 0,
    source: Optional[str] = None,
) -> str:
    """Insert a new job row. Returns the new job id."""
    job_id = _new_id()
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO jobs
                (id, user_id, title, company, location, salary, url,
                 description, relevance_score, source, found_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                job_id,
                user_id,
                title,
                company,
                location,
                salary,
                url,
                description,
                relevance_score,
                source,
                _now(),
            ),
        )
        await db.commit()
    logger.debug("Created job id=%s title=%s company=%s", job_id, title, company)
    return job_id


async def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Return a single job dict by id."""
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
        return _row(await cursor.fetchone())


async def list_jobs(
    user_id: str,
    *,
    min_relevance: int = 0,
    source: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Return jobs for a user, ordered by relevance_score descending."""
    conditions = ["user_id=?", "relevance_score>=?"]
    params: list = [user_id, min_relevance]
    if source:
        conditions.append("source=?")
        params.append(source)
    where = " AND ".join(conditions)
    params += [limit, offset]

    async with get_db() as db:
        cursor = await db.execute(
            f"""
            SELECT * FROM jobs
            WHERE {where}
            ORDER BY relevance_score DESC
            LIMIT ? OFFSET ?
            """,
            params,
        )
        return _rows(await cursor.fetchall())


async def update_job(job_id: str, **fields: Any) -> bool:
    """Partially update a job row. Returns True if updated."""
    if not fields:
        return False
    set_clause = ", ".join(f"{k}=?" for k in fields)
    values = list(fields.values()) + [job_id]
    async with get_db() as db:
        cursor = await db.execute(
            f"UPDATE jobs SET {set_clause} WHERE id=?", values
        )
        await db.commit()
    return cursor.rowcount > 0


async def delete_job(job_id: str) -> bool:
    """Delete a job (and via CASCADE, its applications)."""
    async with get_db() as db:
        cursor = await db.execute("DELETE FROM jobs WHERE id=?", (job_id,))
        await db.commit()
    return cursor.rowcount > 0


async def delete_jobs_for_user(user_id: str) -> int:
    """Delete all jobs for a user. Returns number of rows deleted."""
    async with get_db() as db:
        cursor = await db.execute(
            "DELETE FROM jobs WHERE user_id=?", (user_id,)
        )
        await db.commit()
    return cursor.rowcount


async def upsert_job(
    *,
    user_id: str,
    url: str,
    title: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    salary: Optional[str] = None,
    description: Optional[str] = None,
    relevance_score: int = 0,
    source: Optional[str] = None,
) -> str:
    """
    Insert a job if the (user_id, url) pair doesn't exist, otherwise
    update it.  Returns the job id.

    Useful when re-running job searches – avoids duplicate rows.
    """
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id FROM jobs WHERE user_id=? AND url=?", (user_id, url)
        )
        existing = await cursor.fetchone()
        if existing:
            job_id = existing["id"]
            await db.execute(
                """
                UPDATE jobs SET
                    title=?, company=?, location=?, salary=?,
                    description=?, relevance_score=?, source=?, found_at=?
                WHERE id=?
                """,
                (title, company, location, salary, description,
                 relevance_score, source, _now(), job_id),
            )
            await db.commit()
            logger.debug("Upserted (updated) job id=%s url=%s", job_id, url)
            return job_id

    # Not found – create new
    return await create_job(
        user_id=user_id,
        title=title,
        company=company,
        location=location,
        salary=salary,
        url=url,
        description=description,
        relevance_score=relevance_score,
        source=source,
    )


# ─────────────────────────────────────────────────────────────────────────────
# ── APPLICATIONS ──────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

ApplicationStatus = str  # "pending" | "submitted" | "failed" | "confirmed"


async def create_application(
    *,
    user_id: str,
    job_id: str,
    status: ApplicationStatus = "pending",
) -> str:
    """Insert a new application row. Returns the new application id."""
    app_id = _new_id()
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO applications
                (id, user_id, job_id, status, applied_at)
            VALUES (?,?,?,?,?)
            """,
            (app_id, user_id, job_id, status, _now()),
        )
        await db.commit()
    logger.debug(
        "Created application id=%s user=%s job=%s status=%s",
        app_id, user_id, job_id, status,
    )
    return app_id


async def get_application(app_id: str) -> Optional[Dict[str, Any]]:
    """Return a single application dict by id."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM applications WHERE id=?", (app_id,)
        )
        return _row(await cursor.fetchone())


async def get_application_for_job(
    user_id: str, job_id: str
) -> Optional[Dict[str, Any]]:
    """Return the application row for a specific user+job pair, if any."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM applications WHERE user_id=? AND job_id=?",
            (user_id, job_id),
        )
        return _row(await cursor.fetchone())


async def list_applications(
    user_id: str,
    *,
    status: Optional[ApplicationStatus] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """
    Return applications for a user, joined with job details.
    Ordered by applied_at descending.
    """
    params: list = [user_id]
    status_filter = ""
    if status:
        status_filter = "AND a.status=?"
        params.append(status)
    params += [limit, offset]

    async with get_db() as db:
        cursor = await db.execute(
            f"""
            SELECT
                a.*,
                j.title       AS job_title,
                j.company     AS job_company,
                j.location    AS job_location,
                j.url         AS job_url,
                j.source      AS job_source,
                j.relevance_score
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE a.user_id=? {status_filter}
            ORDER BY a.applied_at DESC
            LIMIT ? OFFSET ?
            """,
            params,
        )
        return _rows(await cursor.fetchall())


async def update_application(app_id: str, **fields: Any) -> bool:
    """
    Partially update an application row.

    Example
    ───────
        await update_application(
            app_id,
            status="submitted",
            confirmation_text="Application #A12345 received",
        )
    """
    if not fields:
        return False
    set_clause = ", ".join(f"{k}=?" for k in fields)
    values = list(fields.values()) + [app_id]
    async with get_db() as db:
        cursor = await db.execute(
            f"UPDATE applications SET {set_clause} WHERE id=?", values
        )
        await db.commit()
    return cursor.rowcount > 0


async def mark_application_submitted(
    app_id: str,
    *,
    confirmation_text: Optional[str] = None,
    screenshot_path: Optional[str] = None,
) -> bool:
    """Convenience: mark an application as submitted."""
    return await update_application(
        app_id,
        status="submitted",
        confirmation_text=confirmation_text,
        screenshot_path=screenshot_path,
    )


async def mark_application_failed(
    app_id: str,
    *,
    error_message: Optional[str] = None,
    screenshot_path: Optional[str] = None,
) -> bool:
    """Convenience: mark an application as failed."""
    return await update_application(
        app_id,
        status="failed",
        error_message=error_message,
        screenshot_path=screenshot_path,
    )


async def mark_application_confirmed(
    app_id: str,
    *,
    confirmation_text: Optional[str] = None,
    screenshot_path: Optional[str] = None,
) -> bool:
    """Convenience: mark an application as confirmed by employer."""
    return await update_application(
        app_id,
        status="confirmed",
        confirmation_text=confirmation_text,
        screenshot_path=screenshot_path,
    )


async def delete_application(app_id: str) -> bool:
    """Delete an application row."""
    async with get_db() as db:
        cursor = await db.execute(
            "DELETE FROM applications WHERE id=?", (app_id,)
        )
        await db.commit()
    return cursor.rowcount > 0


# ─────────────────────────────────────────────────────────────────────────────
# ── STATS / AGGREGATES ────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

async def get_user_stats(user_id: str) -> Dict[str, Any]:
    """
    Return a summary dict for dashboards:

        {
          "total_jobs_found": 42,
          "total_applications": 10,
          "submitted": 7,
          "confirmed": 2,
          "failed": 1,
          "pending": 0,
        }
    """
    async with get_db() as db:
        cur = await db.execute(
            "SELECT COUNT(*) FROM jobs WHERE user_id=?", (user_id,)
        )
        total_jobs = (await cur.fetchone())[0]

        cur = await db.execute(
            """
            SELECT status, COUNT(*) AS cnt
            FROM applications
            WHERE user_id=?
            GROUP BY status
            """,
            (user_id,),
        )
        rows = await cur.fetchall()

    counts: Dict[str, int] = {
        "submitted": 0, "confirmed": 0, "failed": 0, "pending": 0
    }
    total_apps = 0
    for row in rows:
        s, c = row[0], row[1]
        counts[s] = c
        total_apps += c

    return {
        "total_jobs_found": total_jobs,
        "total_applications": total_apps,
        **counts,
    }
