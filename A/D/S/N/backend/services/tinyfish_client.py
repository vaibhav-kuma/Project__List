"""
TinyFish Web Agent Client
=========================
Async client for the TinyFish API (https://docs.tinyfish.ai)

Authentication : X-API-Key header
Base URL       : https://agent.tinyfish.ai/v1

TinyFish is a *goal-oriented* browser-automation agent.  You describe WHAT
you want in natural language (the `goal` parameter) and the agent figures out
HOW to do it—clicking, typing, scrolling, extracting, etc.

Key endpoints
─────────────
POST /automation/run-sse    → SSE streaming (recommended for long tasks)
POST /automation/run        → Synchronous, blocks until complete
POST /automation/run-async  → Fire-and-forget (returns run_id immediately)

SSE event types
───────────────
STARTED        – run has begun
STREAMING_URL  – live browser preview URL
PROGRESS       – intermediate step description
COMPLETE       – final result / status
HEARTBEAT      – keep-alive (ignore)
ERROR          – something went wrong
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL = "https://agent.tinyfish.ai/v1"
DEFAULT_TIMEOUT = 300          # seconds – automation can take a while
DEFAULT_MAX_RETRIES = 3
DEFAULT_RETRY_DELAY = 2.0      # seconds (doubles on each retry)
RATE_LIMIT_RETRY_AFTER = 60   # seconds to wait on 429


# ─────────────────────────────────────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────────────────────────────────────

class BrowserProfile(str, Enum):
    """Browser profile options."""
    LITE    = "lite"    # Standard browser – faster, less resource-intensive
    STEALTH = "stealth" # Anti-detection browser – better for bot-protected sites


@dataclass
class ProxyConfig:
    """Optional proxy configuration for a run."""
    enabled: bool = False
    country_code: Optional[str] = None   # e.g. "US", "GB", "DE"

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {"enabled": self.enabled}
        if self.country_code:
            d["country_code"] = self.country_code
        return d


@dataclass
class AutomationRequest:
    """
    Parameters for a single automation run.

    `goal` is the core parameter – write it as a clear natural-language
    instruction describing exactly what the agent should do and what it
    should return.  See https://docs.tinyfish.ai/key-concepts/goals
    """
    url: str
    goal: str
    browser_profile: BrowserProfile = BrowserProfile.LITE
    proxy_config: Optional[ProxyConfig] = None
    use_vault: bool = False
    credential_item_ids: List[str] = field(default_factory=list)
    api_integration: Optional[str] = None   # e.g. "custom-agent"

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "url": self.url,
            "goal": self.goal,
            "browser_profile": self.browser_profile.value,
        }
        if self.proxy_config:
            d["proxy_config"] = self.proxy_config.to_dict()
        if self.use_vault:
            d["use_vault"] = True
        if self.credential_item_ids:
            d["credential_item_ids"] = self.credential_item_ids
        if self.api_integration:
            d["api_integration"] = self.api_integration
        return d


@dataclass
class SSEEvent:
    """A single Server-Sent Event from TinyFish."""
    type: str
    run_id: Optional[str] = None
    timestamp: Optional[str] = None
    purpose: Optional[str] = None        # PROGRESS events
    streaming_url: Optional[str] = None  # STREAMING_URL events
    status: Optional[str] = None         # COMPLETE events
    result: Any = None                   # COMPLETE events
    raw: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SSEEvent":
        return cls(
            type=data.get("type", "UNKNOWN"),
            run_id=data.get("run_id"),
            timestamp=data.get("timestamp"),
            purpose=data.get("purpose"),
            streaming_url=data.get("streaming_url"),
            status=data.get("status"),
            result=data.get("result"),
            raw=data,
        )

    @property
    def is_complete(self) -> bool:
        return self.type == "COMPLETE"

    @property
    def is_error(self) -> bool:
        return self.type == "ERROR" or self.status == "FAILED"

    @property
    def is_heartbeat(self) -> bool:
        return self.type == "HEARTBEAT"


@dataclass
class AutomationResult:
    """Final result of a completed automation run."""
    run_id: str
    status: str
    result: Any
    streaming_url: Optional[str] = None
    progress_steps: List[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# Exceptions
# ─────────────────────────────────────────────────────────────────────────────

class TinyFishError(Exception):
    """Base error for TinyFish client."""


class TinyFishAuthError(TinyFishError):
    """Raised on 401 – missing or invalid API key."""


class TinyFishRateLimitError(TinyFishError):
    """Raised on 429 – too many requests."""


class TinyFishAutomationError(TinyFishError):
    """Raised when an automation run completes with FAILED status."""


# ─────────────────────────────────────────────────────────────────────────────
# Client
# ─────────────────────────────────────────────────────────────────────────────

class TinyFishClient:
    """
    Async client for the TinyFish Web Agent API.

    Usage
    ─────
        client = TinyFishClient()           # reads TINYFISH_API_KEY from env

        # High-level: run a complete task and get the result
        result = await client.run(
            url="https://linkedin.com/jobs",
            goal="Search for 'Python developer' jobs in Bangalore. "
                 "Return the first 5 job titles, companies, and URLs as JSON.",
        )
        print(result.result)

        # Mid-level: navigate, fill forms, extract data
        result = await client.fill_form_and_submit(
            url="https://some-job-board.com/apply",
            form_data={"name": "Jane Doe", "email": "jane@example.com"},
            submit_text="Submit Application",
        )

        # Low-level: stream SSE events
        async for event in client.stream(url=..., goal=...):
            if event.type == "PROGRESS":
                print(f"  → {event.purpose}")
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
        retry_delay: float = DEFAULT_RETRY_DELAY,
    ) -> None:
        self._api_key = api_key or os.getenv("TINYFISH_API_KEY")
        if not self._api_key:
            raise TinyFishAuthError(
                "TINYFISH_API_KEY not set. "
                "Pass api_key= or set the TINYFISH_API_KEY environment variable."
            )
        self._timeout = timeout
        self._max_retries = max_retries
        self._retry_delay = retry_delay
        self._headers = {
            "X-API-Key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        logger.info("TinyFishClient initialised (base_url=%s)", BASE_URL)

    # ── Private helpers ───────────────────────────────────────────────────────

    def _make_client(self, stream: bool = False) -> httpx.AsyncClient:
        """Return a configured httpx client."""
        return httpx.AsyncClient(
            base_url=BASE_URL,
            headers=self._headers,
            timeout=httpx.Timeout(self._timeout),
        )

    async def _post_with_retry(
        self,
        path: str,
        payload: Dict[str, Any],
    ) -> httpx.Response:
        """POST with exponential-backoff retry and rate-limit handling."""
        delay = self._retry_delay
        last_exc: Optional[Exception] = None

        for attempt in range(1, self._max_retries + 1):
            try:
                async with self._make_client() as client:
                    logger.debug("POST %s (attempt %d)", path, attempt)
                    response = await client.post(path, json=payload)

                if response.status_code == 401:
                    raise TinyFishAuthError(
                        f"Authentication failed: {response.text}"
                    )
                if response.status_code == 429:
                    retry_after = int(
                        response.headers.get("Retry-After", RATE_LIMIT_RETRY_AFTER)
                    )
                    logger.warning(
                        "Rate limited. Waiting %ds before retry.", retry_after
                    )
                    await asyncio.sleep(retry_after)
                    continue
                if response.status_code >= 500:
                    logger.warning(
                        "Server error %d on attempt %d. Retrying in %.1fs…",
                        response.status_code, attempt, delay,
                    )
                    raise httpx.HTTPStatusError(
                        f"Server error {response.status_code}",
                        request=response.request,
                        response=response,
                    )

                response.raise_for_status()
                return response

            except TinyFishAuthError:
                raise  # don't retry auth errors
            except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                last_exc = exc
                if attempt < self._max_retries:
                    logger.warning(
                        "Request failed (attempt %d/%d): %s. Retrying in %.1fs…",
                        attempt, self._max_retries, exc, delay,
                    )
                    await asyncio.sleep(delay)
                    delay *= 2
                else:
                    logger.error(
                        "Request failed after %d attempts: %s",
                        self._max_retries, exc,
                    )

        raise TinyFishError(
            f"Request to {path} failed after {self._max_retries} attempts."
        ) from last_exc

    @staticmethod
    def _parse_sse_line(line: str) -> Optional[Dict[str, Any]]:
        """Parse a single SSE `data: {...}` line into a dict."""
        line = line.strip()
        if not line.startswith("data:"):
            return None
        raw_json = line[len("data:"):].strip()
        if not raw_json:
            return None
        try:
            return json.loads(raw_json)
        except json.JSONDecodeError as exc:
            logger.warning("Could not parse SSE line %r: %s", line, exc)
            return None

    # ── Streaming (SSE) ───────────────────────────────────────────────────────

    async def stream(
        self,
        url: str,
        goal: str,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
        proxy_config: Optional[ProxyConfig] = None,
        use_vault: bool = False,
        credential_item_ids: Optional[List[str]] = None,
    ) -> AsyncGenerator[SSEEvent, None]:
        """
        Stream automation events via SSE.

        Yields SSEEvent objects as they arrive.  The last event with
        `type == "COMPLETE"` contains the final result.

        Example
        ───────
            async for event in client.stream(url=..., goal=...):
                if not event.is_heartbeat:
                    print(event.type, event.purpose or event.result)
        """
        payload = AutomationRequest(
            url=url,
            goal=goal,
            browser_profile=browser_profile,
            proxy_config=proxy_config,
            use_vault=use_vault,
            credential_item_ids=credential_item_ids or [],
            api_integration="job-application-agent",
        ).to_dict()

        sse_headers = {**self._headers, "Accept": "text/event-stream"}
        delay = self._retry_delay

        for attempt in range(1, self._max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    base_url=BASE_URL,
                    headers=sse_headers,
                    timeout=httpx.Timeout(self._timeout),
                ) as client:
                    async with client.stream(
                        "POST", "/automation/run-sse", json=payload
                    ) as response:
                        if response.status_code == 401:
                            raise TinyFishAuthError(
                                f"Authentication failed: {await response.aread()}"
                            )
                        if response.status_code == 429:
                            retry_after = int(
                                response.headers.get("Retry-After", RATE_LIMIT_RETRY_AFTER)
                            )
                            logger.warning("Rate limited. Retrying in %ds.", retry_after)
                            await asyncio.sleep(retry_after)
                            continue
                        response.raise_for_status()

                        async for line in response.aiter_lines():
                            parsed = self._parse_sse_line(line)
                            if parsed is None:
                                continue
                            event = SSEEvent.from_dict(parsed)
                            logger.debug("SSE event: %s", event.type)
                            yield event
                            if event.is_complete or event.is_error:
                                return
                break  # success – no retry needed

            except TinyFishAuthError:
                raise
            except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                if attempt < self._max_retries:
                    logger.warning(
                        "SSE stream error (attempt %d/%d): %s. Retrying in %.1fs…",
                        attempt, self._max_retries, exc, delay,
                    )
                    await asyncio.sleep(delay)
                    delay *= 2
                else:
                    raise TinyFishError(
                        f"SSE stream failed after {self._max_retries} attempts."
                    ) from exc

    # ── High-level helpers ────────────────────────────────────────────────────

    async def run(
        self,
        url: str,
        goal: str,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
        proxy_config: Optional[ProxyConfig] = None,
        use_vault: bool = False,
        credential_item_ids: Optional[List[str]] = None,
        on_progress: Optional[Any] = None,   # async callable(step: str)
    ) -> AutomationResult:
        """
        Run an automation task and wait for the final result.

        Internally uses SSE streaming so you can optionally get live progress
        via the `on_progress` callback.

        Parameters
        ──────────
        url              : Target website URL.
        goal             : Natural-language description of the task.
        browser_profile  : LITE (default) or STEALTH.
        proxy_config     : Optional proxy settings.
        use_vault        : Include vault credentials.
        credential_item_ids : Specific vault items to include.
        on_progress      : Async callable called with each progress step string.

        Returns
        ───────
        AutomationResult with the final result and metadata.
        """
        run_id: Optional[str] = None
        streaming_url: Optional[str] = None
        progress_steps: List[str] = []

        logger.info("Starting automation: %s → %s", url, goal[:80])
        start = time.monotonic()

        async for event in self.stream(
            url=url,
            goal=goal,
            browser_profile=browser_profile,
            proxy_config=proxy_config,
            use_vault=use_vault,
            credential_item_ids=credential_item_ids,
        ):
            if event.run_id and not run_id:
                run_id = event.run_id

            if event.type == "STREAMING_URL" and event.streaming_url:
                streaming_url = event.streaming_url
                logger.info("Live preview: %s", streaming_url)

            elif event.type == "PROGRESS" and event.purpose:
                progress_steps.append(event.purpose)
                logger.info("  → %s", event.purpose)
                if on_progress:
                    await on_progress(event.purpose)

            elif event.is_complete:
                elapsed = time.monotonic() - start
                logger.info(
                    "Automation complete (run_id=%s, status=%s, %.1fs)",
                    run_id, event.status, elapsed,
                )
                if event.status == "FAILED":
                    raise TinyFishAutomationError(
                        f"Automation run {run_id} failed. "
                        f"Result: {event.result}"
                    )
                return AutomationResult(
                    run_id=run_id or "unknown",
                    status=event.status or "COMPLETED",
                    result=event.result,
                    streaming_url=streaming_url,
                    progress_steps=progress_steps,
                )

            elif event.is_error:
                raise TinyFishAutomationError(
                    f"Automation error (run_id={run_id}): {event.raw}"
                )

        raise TinyFishError("SSE stream ended without a COMPLETE event.")

    # ── Specialised task helpers ──────────────────────────────────────────────

    async def navigate_and_extract(
        self,
        url: str,
        extraction_prompt: str,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
    ) -> Any:
        """
        Navigate to `url` and extract structured data described by
        `extraction_prompt`.

        Example
        ───────
            data = await client.navigate_and_extract(
                url="https://news.ycombinator.com",
                extraction_prompt=(
                    "Extract the top 5 story titles, their URLs, and "
                    "point counts. Return as a JSON array."
                ),
            )
        """
        goal = (
            f"Navigate to the page and extract the following information. "
            f"Return the result as JSON.\n\n"
            f"What to extract: {extraction_prompt}"
        )
        result = await self.run(url=url, goal=goal, browser_profile=browser_profile)
        return result.result

    async def click_element(
        self,
        url: str,
        element_description: str,
        then_extract: Optional[str] = None,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
    ) -> AutomationResult:
        """
        Navigate to `url`, click the described element, and optionally
        extract data from the resulting page.

        Example
        ───────
            result = await client.click_element(
                url="https://example.com",
                element_description="the 'Sign In' button",
                then_extract="the error message if login failed",
            )
        """
        goal = f"Click {element_description}."
        if then_extract:
            goal += f" After clicking, extract: {then_extract}. Return as JSON."
        return await self.run(url=url, goal=goal, browser_profile=browser_profile)

    async def fill_form(
        self,
        url: str,
        form_data: Dict[str, str],
        submit: bool = False,
        submit_button_description: str = "the submit button",
        then_extract: Optional[str] = None,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
    ) -> AutomationResult:
        """
        Navigate to `url`, fill the form fields described in `form_data`,
        and optionally submit.

        Parameters
        ──────────
        url                         : Page containing the form.
        form_data                   : Mapping of field label/description → value.
        submit                      : Whether to click the submit button.
        submit_button_description   : How to identify the submit button.
        then_extract                : What to extract after submission.

        Example
        ───────
            result = await client.fill_form(
                url="https://jobs.example.com/apply/123",
                form_data={
                    "First name field": "Jane",
                    "Last name field": "Doe",
                    "Email field": "jane@example.com",
                    "Cover letter textarea": "I am excited to apply…",
                },
                submit=True,
                then_extract="confirmation message or application ID",
            )
        """
        fields_desc = "\n".join(
            f"  - {label}: {value}" for label, value in form_data.items()
        )
        goal = f"Fill in the following form fields:\n{fields_desc}"
        if submit:
            goal += f"\n\nThen click {submit_button_description}."
        if then_extract:
            goal += f"\n\nAfter that, extract: {then_extract}. Return as JSON."
        return await self.run(url=url, goal=goal, browser_profile=browser_profile)

    async def search_and_extract(
        self,
        url: str,
        search_query: str,
        extraction_prompt: str,
        search_field_description: str = "the search box",
        browser_profile: BrowserProfile = BrowserProfile.LITE,
    ) -> Any:
        """
        Navigate to `url`, type `search_query` into the search field,
        submit, and extract data from the results page.

        Example
        ───────
            jobs = await client.search_and_extract(
                url="https://linkedin.com/jobs",
                search_query="Python developer",
                extraction_prompt=(
                    "Extract the first 10 job listings: "
                    "title, company, location, and job URL. Return as JSON array."
                ),
            )
        """
        goal = (
            f"Type '{search_query}' into {search_field_description} and submit. "
            f"Then extract the following from the results:\n"
            f"{extraction_prompt}\n"
            f"Return the extracted data as JSON."
        )
        result = await self.run(url=url, goal=goal, browser_profile=browser_profile)
        return result.result

    async def upload_file(
        self,
        url: str,
        file_field_description: str,
        file_path: str,
        additional_instructions: Optional[str] = None,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
    ) -> AutomationResult:
        """
        Navigate to `url` and upload a file via the described upload field.

        Note: The file must be accessible to the TinyFish agent. For cloud
        uploads you may need to provide a publicly accessible URL instead.

        Example
        ───────
            result = await client.upload_file(
                url="https://jobs.example.com/apply",
                file_field_description="the 'Upload Resume' button",
                file_path="/path/to/resume.pdf",
                additional_instructions="Then fill Name field with 'Jane Doe'",
            )
        """
        goal = (
            f"Upload the file at path '{file_path}' using "
            f"{file_field_description}."
        )
        if additional_instructions:
            goal += f"\n\nAdditional instructions: {additional_instructions}"
        return await self.run(url=url, goal=goal, browser_profile=browser_profile)

    async def take_screenshot(
        self,
        url: str,
        instructions: Optional[str] = None,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
    ) -> Optional[str]:
        """
        Navigate to `url` and return a live preview / streaming URL where the
        browser session can be observed.

        Note: TinyFish does not return raw screenshot bytes via the API; it
        provides a streaming URL (live browser view).  This method returns that
        URL so the caller can display it in a frontend.

        Example
        ───────
            preview_url = await client.take_screenshot("https://example.com")
        """
        goal = instructions or (
            "Navigate to the page and stay there briefly so a screenshot can be taken."
        )
        streaming_url_captured: Optional[str] = None

        async for event in self.stream(url=url, goal=goal, browser_profile=browser_profile):
            if event.type == "STREAMING_URL" and event.streaming_url:
                streaming_url_captured = event.streaming_url
                logger.info("Screenshot/preview URL: %s", streaming_url_captured)
            if event.is_complete or event.is_error:
                break

        return streaming_url_captured

    async def get_page_content(
        self,
        url: str,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
    ) -> Optional[str]:
        """
        Navigate to `url` and return the full visible text / HTML content.

        Example
        ───────
            html = await client.get_page_content("https://example.com")
        """
        result = await self.run(
            url=url,
            goal=(
                "Extract the complete visible text content of this page. "
                "Include all headings, paragraphs, links, and list items. "
                "Return as a single JSON object with a 'content' key."
            ),
            browser_profile=browser_profile,
        )
        if isinstance(result.result, dict):
            return result.result.get("content") or str(result.result)
        return str(result.result) if result.result else None

    async def wait_and_extract(
        self,
        url: str,
        wait_condition: str,
        extraction_prompt: str,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
    ) -> Any:
        """
        Navigate to `url`, wait for a condition, then extract data.

        Example
        ───────
            data = await client.wait_and_extract(
                url="https://dashboard.example.com",
                wait_condition="the loading spinner disappears",
                extraction_prompt="the total number of open jobs",
            )
        """
        goal = (
            f"Navigate to the page and wait until {wait_condition}. "
            f"Then extract: {extraction_prompt}. Return as JSON."
        )
        result = await self.run(url=url, goal=goal, browser_profile=browser_profile)
        return result.result

    async def apply_to_job(
        self,
        job_url: str,
        applicant_info: Dict[str, str],
        resume_url: Optional[str] = None,
        cover_letter: Optional[str] = None,
        browser_profile: BrowserProfile = BrowserProfile.STEALTH,
    ) -> AutomationResult:
        """
        High-level helper: navigate to a job application URL, fill in
        applicant information, optionally upload a resume, and submit.

        Parameters
        ──────────
        job_url        : Direct URL to the job application page.
        applicant_info : Dict of field descriptions to values, e.g.:
                         {"Full name field": "Jane Doe",
                          "Email field": "jane@example.com"}
        resume_url     : Publicly accessible URL of the resume PDF/DOCX
                         (if the form supports URL uploads).
        cover_letter   : Cover letter text to paste into a textarea.

        Returns
        ───────
        AutomationResult – check result.result for confirmation details.
        """
        fields_desc = "\n".join(
            f"  - {label}: {value}" for label, value in applicant_info.items()
        )

        goal_parts = [
            "Fill out the job application form on this page.",
            f"\nFill in these fields:\n{fields_desc}",
        ]

        if cover_letter:
            goal_parts.append(
                f"\nFor the cover letter field, enter:\n{cover_letter}"
            )

        if resume_url:
            goal_parts.append(
                f"\nFor the resume/CV upload field, use this URL: {resume_url}"
            )

        goal_parts.append(
            "\nAfter filling all fields, submit the application. "
            "Return a JSON object with 'success' (boolean) and "
            "'confirmation' (any confirmation message or ID shown)."
        )

        return await self.run(
            url=job_url,
            goal="\n".join(goal_parts),
            browser_profile=browser_profile,
        )

    async def run_sync(
        self,
        url: str,
        goal: str,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
        proxy_config: Optional[ProxyConfig] = None,
    ) -> Any:
        """
        Execute automation via the synchronous endpoint `/automation/run`.
        Blocks until the run completes.  Does not support cancellation.

        Use `run()` (SSE) when possible – this method is provided for
        environments where SSE streaming is not feasible.
        """
        payload = AutomationRequest(
            url=url,
            goal=goal,
            browser_profile=browser_profile,
            proxy_config=proxy_config,
            api_integration="job-application-agent",
        ).to_dict()

        logger.info("Sync automation: %s", url)
        response = await self._post_with_retry("/automation/run", payload)
        data = response.json()
        logger.info(
            "Sync automation complete: status=%s", data.get("status")
        )
        if data.get("status") == "FAILED":
            raise TinyFishAutomationError(
                f"Automation failed: {data.get('result')}"
            )
        return data.get("result")

    async def start_async(
        self,
        url: str,
        goal: str,
        browser_profile: BrowserProfile = BrowserProfile.LITE,
        proxy_config: Optional[ProxyConfig] = None,
    ) -> str:
        """
        Start an automation asynchronously (fire-and-forget).
        Returns the `run_id` immediately.  Use the TinyFish dashboard or
        the Runs API to poll for results.
        """
        payload = AutomationRequest(
            url=url,
            goal=goal,
            browser_profile=browser_profile,
            proxy_config=proxy_config,
            api_integration="job-application-agent",
        ).to_dict()

        logger.info("Async automation start: %s", url)
        response = await self._post_with_retry("/automation/run-async", payload)
        data = response.json()
        run_id: str = data.get("run_id", "")
        logger.info("Async run started: run_id=%s", run_id)
        return run_id


# ─────────────────────────────────────────────────────────────────────────────
# Module-level convenience instance
# ─────────────────────────────────────────────────────────────────────────────

def get_client() -> TinyFishClient:
    """Return a singleton-style TinyFishClient (creates a new one each call)."""
    return TinyFishClient()
