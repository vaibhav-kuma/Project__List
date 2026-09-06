"""
agents/orchestrator.py
======================
AutoApplyOrchestrator – the top-level coordinator that chains:
  1. JobSearchAgent   → search & score jobs
  2. ApplicationAgent → fill & submit each application
  3. database/db      → persist every result
  4. WebSocket        → stream real-time status to the frontend

Designed to run as a long-lived async task, typically kicked off by a
FastAPI WebSocket endpoint.

Usage
─────
    orchestrator = await AutoApplyOrchestrator.create(user_id="uuid-here")
    summary = await orchestrator.run(websocket=ws)

Or without a WebSocket (background job):
    orchestrator = await AutoApplyOrchestrator.create(user_id="uuid-here")
    summary = await orchestrator.run()
"""

from __future__ import annotations

import asyncio
import logging
import os
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import openai

from agents.application_agent import ApplicationAgent, ApplicationResult
from agents.job_search_agent import JobListing, JobSearchAgent
from database.db import (
    create_application,
    create_job,
    get_user,
    get_user_stats,
    mark_application_failed,
    mark_application_submitted,
    upsert_job,
)
from services.tinyfish_client import TinyFishClient

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Defaults (overridable via env vars or constructor kwargs)
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_MIN_SCORE           = 70    # Only apply to jobs scoring ≥ this
DEFAULT_MAX_SEARCH_RESULTS  = 50    # Max jobs to surface from search
DEFAULT_MAX_APPLICATIONS    = 20    # Max applications per run
DEFAULT_DELAY_MIN           = 5     # Min seconds between applications
DEFAULT_DELAY_MAX           = 15    # Max seconds between applications


# ─────────────────────────────────────────────────────────────────────────────
# Summary data class
# ─────────────────────────────────────────────────────────────────────────────

class RunSummary:
    """Aggregated results from a single orchestrator run."""

    def __init__(self) -> None:
        self.jobs_found:      int = 0
        self.jobs_qualified:  int = 0   # passed min_score filter
        self.attempted:       int = 0
        self.submitted:       int = 0
        self.failed:          int = 0
        self.skipped_captcha: int = 0
        self.skipped_login:   int = 0
        self.errors:          int = 0
        self.applications:    List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "jobs_found":      self.jobs_found,
            "jobs_qualified":  self.jobs_qualified,
            "attempted":       self.attempted,
            "submitted":       self.submitted,
            "failed":          self.failed,
            "skipped_captcha": self.skipped_captcha,
            "skipped_login":   self.skipped_login,
            "errors":          self.errors,
            "applications":    self.applications,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Orchestrator
# ─────────────────────────────────────────────────────────────────────────────

class AutoApplyOrchestrator:
    """
    Coordinates the full auto-apply pipeline for a single user.

    Do not instantiate directly — use the async factory:
        orchestrator = await AutoApplyOrchestrator.create(user_id)
    """

    def __init__(
        self,
        user: Dict[str, Any],
        tinyfish: TinyFishClient,
        oai_client: openai.AsyncOpenAI,
        *,
        min_score: int = DEFAULT_MIN_SCORE,
        max_search_results: int = DEFAULT_MAX_SEARCH_RESULTS,
        max_applications: int = DEFAULT_MAX_APPLICATIONS,
        delay_min: float = DEFAULT_DELAY_MIN,
        delay_max: float = DEFAULT_DELAY_MAX,
    ) -> None:
        self.user            = user
        self.user_id: str    = user["id"]
        self.tinyfish        = tinyfish
        self.oai_client      = oai_client
        self.min_score       = min_score
        self.max_search_results = max_search_results
        self.max_applications   = max_applications
        self.delay_min       = delay_min
        self.delay_max       = delay_max

        self.searcher = JobSearchAgent(
            tinyfish_client=tinyfish,
            openai_client=oai_client,
        )
        self.applier = ApplicationAgent(
            tinyfish_client=tinyfish,
            openai_client=oai_client,
            user_profile=user,
        )

    # ── Factory ───────────────────────────────────────────────────────────────

    @classmethod
    async def create(
        cls,
        user_id: str,
        *,
        min_score: int = DEFAULT_MIN_SCORE,
        max_search_results: int = DEFAULT_MAX_SEARCH_RESULTS,
        max_applications: int = DEFAULT_MAX_APPLICATIONS,
        delay_min: float = DEFAULT_DELAY_MIN,
        delay_max: float = DEFAULT_DELAY_MAX,
    ) -> "AutoApplyOrchestrator":
        """
        Async factory.  Loads user from database, initialises API clients.

        Raises
        ──────
        ValueError  : if user not found or API keys missing.
        """
        # Load user
        user = await get_user(user_id)
        if not user:
            raise ValueError(f"User not found: {user_id}")
        logger.info("Orchestrator: loaded user %s (%s)", user_id, user.get("email", ""))

        # Init TinyFish
        tf_key = os.getenv("TINYFISH_API_KEY", "")
        if not tf_key:
            raise ValueError("TINYFISH_API_KEY environment variable not set.")
        tinyfish = TinyFishClient(api_key=tf_key)

        # Init OpenAI
        oai_key = os.getenv("OPENAI_API_KEY", "")
        if not oai_key:
            raise ValueError("OPENAI_API_KEY environment variable not set.")
        oai_client = openai.AsyncOpenAI(api_key=oai_key)

        return cls(
            user=user,
            tinyfish=tinyfish,
            oai_client=oai_client,
            min_score=min_score,
            max_search_results=max_search_results,
            max_applications=max_applications,
            delay_min=delay_min,
            delay_max=delay_max,
        )

    # ── WebSocket emit ────────────────────────────────────────────────────────

    async def emit(
        self,
        websocket: Any,
        message: str,
        status: str = "info",
        data: Any = None,
    ) -> None:
        """
        Send a real-time JSON update to the connected WebSocket client.

        Payload schema
        ──────────────
        {
          "message"  : "Human-readable status message",
          "status"   : "info" | "success" | "warning" | "error" | "done",
          "timestamp": "2025-01-01T12:00:00Z",
          "data"     : {}   // optional arbitrary detail
        }
        """
        if not websocket:
            return
        payload: Dict[str, Any] = {
            "message":   message,
            "status":    status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if data is not None:
            payload["data"] = data
        try:
            await websocket.send_json(payload)
        except Exception as exc:
            logger.warning("WebSocket send failed: %s", exc)

    # ── Application callback (bridges applier events → websocket) ────────────

    def _make_app_callback(self, websocket: Any, job: JobListing):
        """
        Return an async callback that translates ApplicationAgent step events
        into human-readable WebSocket messages.
        """
        step_labels = {
            "navigate":           "🌐 Navigating to application page",
            "dismiss_popup":      "✖️  Dismissing popup",
            "detect_ats":         "🔍 Identifying application system",
            "cover_letter":       "✍️  Generating cover letter",
            "analyze_form":       "🔎 Analysing form fields",
            "fill_fields":        "✏️  Filling in your details",
            "screening_question": "💬 Answering screening question",
            "next_page":          "➡️  Moving to next page",
            "submit":             "📤 Submitting application",
            "batch_progress":     "📋 Batch progress",
            "batch_complete":     "✅ Batch complete",
        }

        async def callback(step: str, status: str, detail: Any) -> None:
            label = step_labels.get(step, step.replace("_", " ").title())
            ws_status = {
                "start": "info",
                "done":  "success",
                "warn":  "warning",
                "error": "error",
            }.get(status, "info")

            msg = f"{label}"
            if isinstance(detail, str) and detail:
                msg += f" — {detail[:120]}"
            elif isinstance(detail, dict):
                sub = detail.get("question") or detail.get("filled") or ""
                if sub:
                    msg += f" — {str(sub)[:80]}"

            await self.emit(
                websocket,
                message=msg,
                status=ws_status,
                data={
                    "step":    step,
                    "job":     job.title,
                    "company": job.company,
                    "detail":  detail,
                },
            )

        return callback

    # ── Main run ──────────────────────────────────────────────────────────────

    async def run(
        self,
        websocket: Any = None,
        *,
        search_query: Optional[str] = None,
        search_location: Optional[str] = None,
    ) -> RunSummary:
        """
        Execute the full auto-apply pipeline.

        Parameters
        ──────────
        websocket       : FastAPI WebSocket (or any object with send_json).
                          Pass None to run silently (background job).
        search_query    : Override job title search query.
                          Defaults to user's job_preferences.title.
        search_location : Override location search.
                          Defaults to user's job_preferences.location.

        Returns
        ───────
        RunSummary with counts and per-application outcomes.
        """
        summary = RunSummary()
        prefs   = self.user.get("job_preferences") or {}

        # Resolve search params from user prefs
        query    = search_query    or prefs.get("title",    "Software Engineer")
        location = search_location or prefs.get("location", "Remote")

        await self.emit(
            websocket,
            f"🚀 Starting auto-apply for **{self.user.get('full_name', 'you')}**",
            status="info",
            data={"query": query, "location": location},
        )

        # ── Phase 1: Search ───────────────────────────────────────────────
        await self.emit(
            websocket,
            f"🔍 Searching for '{query}' jobs in '{location}'…",
            status="info",
        )

        try:
            jobs = await self.searcher.search_jobs(
                query=query,
                location=location,
                max_results=self.max_search_results,
            )
            summary.jobs_found = len(jobs)
            await self.emit(
                websocket,
                f"📋 Found **{len(jobs)}** job listings",
                status="success",
                data={"count": len(jobs)},
            )
        except Exception as exc:
            logger.error("Job search failed: %s", exc)
            await self.emit(websocket, f"❌ Job search failed: {exc}", status="error")
            return summary

        if not jobs:
            await self.emit(websocket, "😕 No jobs found. Try a different query.", status="warning")
            return summary

        # ── Phase 2: Score & filter ───────────────────────────────────────
        await self.emit(
            websocket,
            f"🧠 Scoring {len(jobs)} jobs for relevance with GPT-4…",
            status="info",
        )
        try:
            jobs = await self.searcher.score_jobs(jobs, self.user)
        except Exception as exc:
            logger.warning("Scoring failed: %s — proceeding with unscored jobs", exc)
            await self.emit(
                websocket,
                f"⚠️  Scoring unavailable: {exc}. Proceeding without scores.",
                status="warning",
            )

        # Filter by min score
        qualified = [j for j in jobs if j.relevance_score >= self.min_score]
        # Also include unscored jobs (score=0) if they slipped through without scoring
        qualified = qualified or jobs[:self.max_applications]
        # Cap
        qualified = qualified[:self.max_applications]

        summary.jobs_qualified = len(qualified)
        await self.emit(
            websocket,
            f"✅ **{len(qualified)}** jobs qualify (score ≥ {self.min_score})",
            status="success",
            data={
                "qualified": len(qualified),
                "top_jobs": [
                    {"title": j.title, "company": j.company, "score": j.relevance_score}
                    for j in qualified[:5]
                ],
            },
        )

        if not qualified:
            await self.emit(
                websocket,
                f"😕 No jobs scored ≥ {self.min_score}. Lower min_score or change query.",
                status="warning",
            )
            return summary

        # ── Phase 3: Enrich top jobs with full descriptions ───────────────
        try:
            enrich_n = min(10, len(qualified))
            await self.emit(
                websocket,
                f"📄 Fetching full descriptions for top {enrich_n} jobs…",
                status="info",
            )
            qualified = await self.searcher.enrich_top_jobs(qualified, top_n=enrich_n)
        except Exception as exc:
            logger.warning("Enrich failed: %s", exc)

        # ── Persist all qualified jobs to DB ──────────────────────────────
        db_job_ids: Dict[str, str] = {}   # job.url → db job_id
        for job in qualified:
            try:
                db_id = await upsert_job(
                    user_id=self.user_id,
                    url=job.url,
                    title=job.title,
                    company=job.company,
                    location=job.location,
                    salary=job.salary,
                    description=job.description or job.snippet,
                    relevance_score=job.relevance_score,
                    source=job.source,
                )
                db_job_ids[job.url] = db_id
            except Exception as exc:
                logger.warning("Failed to persist job %s: %s", job.url, exc)

        # ── Phase 4: Apply to each qualifying job ─────────────────────────
        await self.emit(
            websocket,
            f"🤖 Starting applications — **{len(qualified)}** jobs queued",
            status="info",
        )

        for idx, job in enumerate(qualified, 1):
            job_db_id = db_job_ids.get(job.url, "")

            await self.emit(
                websocket,
                f"📝 [{idx}/{len(qualified)}] Applying to **{job.title}** at **{job.company}**",
                status="info",
                data={
                    "job":     job.title,
                    "company": job.company,
                    "url":     job.url,
                    "score":   job.relevance_score,
                },
            )

            # Create application record (status=pending)
            app_db_id = ""
            if job_db_id:
                try:
                    app_db_id = await create_application(
                        user_id=self.user_id,
                        job_id=job_db_id,
                        status="pending",
                    )
                except Exception as exc:
                    logger.warning("Failed to create application record: %s", exc)

            summary.attempted += 1

            # Build callback
            app_callback = self._make_app_callback(websocket, job)

            # Run application
            app_result: Optional[ApplicationResult] = None
            try:
                app_result = await self.applier.apply_to_job(
                    job_url=job.url,
                    job_title=job.title,
                    company=job.company,
                    job_description=job.description or job.snippet,
                    callback=app_callback,
                )
            except Exception as exc:
                logger.error("Application unhandled exception for %s: %s", job.url, exc)
                app_result = None
                summary.errors += 1

            # Evaluate outcome and persist
            outcome: Dict[str, Any] = {
                "job_title":    job.title,
                "company":      job.company,
                "job_url":      job.url,
                "score":        job.relevance_score,
                "success":      False,
                "status":       "failed",
                "confirmation": "",
                "error":        "",
                "ats_type":     "",
            }

            if app_result is None:
                outcome["error"] = "Unhandled exception during application"
                ws_status, ws_icon = "error", "❌"
                summary.failed += 1
                if app_db_id:
                    try:
                        await mark_application_failed(
                            app_db_id,
                            error_message=outcome["error"],
                        )
                    except Exception: pass

            elif app_result.status == "captcha":
                summary.skipped_captcha += 1
                outcome.update(status="captcha", error="CAPTCHA – flagged for manual review")
                ws_status, ws_icon = "warning", "🔒"
                if app_db_id:
                    try:
                        await mark_application_failed(
                            app_db_id,
                            error_message="CAPTCHA detected",
                            screenshot_path=app_result.screenshot_url,
                        )
                    except Exception: pass

            elif app_result.status == "login_required":
                summary.skipped_login += 1
                outcome.update(status="login_required", error="Login required")
                ws_status, ws_icon = "warning", "🔐"
                if app_db_id:
                    try:
                        await mark_application_failed(
                            app_db_id,
                            error_message="Login required",
                        )
                    except Exception: pass

            elif app_result.success:
                summary.submitted += 1
                outcome.update(
                    success=True,
                    status="submitted",
                    confirmation=app_result.confirmation_text,
                    ats_type=app_result.ats_type,
                )
                ws_status, ws_icon = "success", "✅"
                if app_db_id:
                    try:
                        await mark_application_submitted(
                            app_db_id,
                            confirmation_text=app_result.confirmation_text,
                            screenshot_path=app_result.screenshot_url,
                        )
                    except Exception: pass

            else:
                summary.failed += 1
                outcome.update(
                    status="failed",
                    error=app_result.error_message,
                    ats_type=app_result.ats_type,
                )
                ws_status, ws_icon = "error", "❌"
                if app_db_id:
                    try:
                        await mark_application_failed(
                            app_db_id,
                            error_message=app_result.error_message,
                            screenshot_path=getattr(app_result, "screenshot_url", ""),
                        )
                    except Exception: pass

            summary.applications.append(outcome)

            confirm_snippet = (
                f" — {outcome['confirmation'][:80]}" if outcome.get("confirmation") else ""
            )
            await self.emit(
                websocket,
                f"{ws_icon} [{idx}/{len(qualified)}] {job.title} @ {job.company}"
                f" → {outcome['status'].upper()}{confirm_snippet}",
                status=ws_status,
                data=outcome,
            )

            # ── Delay between applications ─────────────────────────────
            if idx < len(qualified):
                delay = random.uniform(self.delay_min, self.delay_max)
                logger.info("Waiting %.1fs before next application…", delay)
                await self.emit(
                    websocket,
                    f"⏳ Waiting {delay:.0f}s before next application…",
                    status="info",
                )
                await asyncio.sleep(delay)

        # ── Phase 5: Final summary ────────────────────────────────────────
        db_stats: Dict[str, Any] = {}
        try:
            db_stats = await get_user_stats(self.user_id)
        except Exception: pass

        summary_msg = (
            f"🎉 Run complete! "
            f"Submitted: {summary.submitted} | "
            f"Failed: {summary.failed} | "
            f"CAPTCHA: {summary.skipped_captcha} | "
            f"Login required: {summary.skipped_login}"
        )
        await self.emit(
            websocket,
            summary_msg,
            status="done",
            data={
                "run_summary":  summary.to_dict(),
                "total_stats":  db_stats,
            },
        )
        logger.info(summary_msg)
        return summary

    # ── Convenience: run a single application from the orchestrator ───────────

    async def apply_one(
        self,
        job_url: str,
        job_title: str = "",
        company: str = "",
        job_description: str = "",
        websocket: Any = None,
    ) -> ApplicationResult:
        """
        Apply to a single explicitly-provided job URL.
        Useful for testing or manual-trigger flows from the API.
        """
        # Upsert job in DB
        db_job_id = ""
        try:
            db_job_id = await upsert_job(
                user_id=self.user_id,
                url=job_url,
                title=job_title,
                company=company,
                description=job_description,
                source="manual",
            )
        except Exception as exc:
            logger.warning("Could not persist job: %s", exc)

        app_db_id = ""
        if db_job_id:
            try:
                app_db_id = await create_application(
                    user_id=self.user_id,
                    job_id=db_job_id,
                    status="pending",
                )
            except Exception: pass

        fake_job = JobListing(
            title=job_title, company=company, url=job_url
        )
        callback = self._make_app_callback(websocket, fake_job)

        result = await self.applier.apply_to_job(
            job_url=job_url,
            job_title=job_title,
            company=company,
            job_description=job_description,
            callback=callback,
        )

        # Persist result
        if app_db_id:
            try:
                if result.success:
                    await mark_application_submitted(
                        app_db_id,
                        confirmation_text=result.confirmation_text,
                        screenshot_path=result.screenshot_url,
                    )
                else:
                    await mark_application_failed(
                        app_db_id,
                        error_message=result.error_message,
                        screenshot_path=result.screenshot_url,
                    )
            except Exception as exc:
                logger.warning("Could not update application record: %s", exc)

        return result
