"""
agents/job_search_agent.py
==========================
Searches for jobs on Indeed.com using the TinyFish Web Agent (goal-oriented
browser automation) and scores them for relevance using OpenAI GPT-4.

Indeed.com structure (stable selectors as of 2025-2026)
────────────────────────────────────────────────────────
Home page
  • Job-title input   : input#text-input-what
  • Location input    : input#text-input-where
  • Search button     : button[type="submit"]

Results page
  • Job card          : div.job_seen_beacon
  • Title link        : h2.jobTitle a
  • Company           : [data-testid="company-name"]
  • Location          : [data-testid="text-location"]
  • Salary            : .salary-snippet-container  or
                        [data-testid="attribute_snippet_json"]
  • Next page         : a[data-testid="pagination-page-next"]

Job detail page
  • Title             : .jobsearch-JobInfoHeader-title
  • Description       : #jobDescriptionText
  • Company           : [data-testid="inline-company-name"]

Note: Indeed aggressively blocks bots.  TinyFishClient is used with
STEALTH profile + proxy.  All interactions are expressed as natural-
language goals; TinyFish handles the actual DOM interaction.
"""

from __future__ import annotations

import json
import logging
import math
import re
from typing import Any, Dict, List, Optional

from services.tinyfish_client import BrowserProfile, ProxyConfig, TinyFishClient

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

INDEED_BASE = "https://www.indeed.com"
DEFAULT_RESULTS_PER_PAGE = 15   # Indeed typically shows ~15 per page
MAX_SCORING_BATCH = 10          # How many jobs to score in one GPT call
GPT_SCORE_MODEL = "gpt-4o"


# ─────────────────────────────────────────────────────────────────────────────
# Data model
# ─────────────────────────────────────────────────────────────────────────────

class JobListing:
    """A single job found during search."""

    def __init__(
        self,
        title: str = "",
        company: str = "",
        location: str = "",
        salary: str = "",
        url: str = "",
        snippet: str = "",
        source: str = "indeed",
        relevance_score: int = 0,
        description: str = "",
        requirements: str = "",
        benefits: str = "",
    ) -> None:
        self.title = title
        self.company = company
        self.location = location
        self.salary = salary
        self.url = url
        self.snippet = snippet
        self.source = source
        self.relevance_score = relevance_score
        self.description = description
        self.requirements = requirements
        self.benefits = benefits

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "salary": self.salary,
            "url": self.url,
            "snippet": self.snippet,
            "source": self.source,
            "relevance_score": self.relevance_score,
            "description": self.description,
            "requirements": self.requirements,
            "benefits": self.benefits,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "JobListing":
        return cls(**{k: d.get(k, "") or "" for k in cls.__init__.__code__.co_varnames if k != "self"})

    def __repr__(self) -> str:
        return f"<JobListing {self.title!r} @ {self.company!r} [{self.relevance_score}]>"


# ─────────────────────────────────────────────────────────────────────────────
# Agent
# ─────────────────────────────────────────────────────────────────────────────

class JobSearchAgent:
    """
    Searches Indeed.com for jobs and scores them for relevance.

    Parameters
    ──────────
    tinyfish_client : Configured TinyFishClient instance.
    openai_client   : openai.AsyncOpenAI instance (or compatible).
    use_proxy       : Whether to route through a proxy (recommended for Indeed).
    proxy_country   : ISO-3166-1 alpha-2 country code for proxy (default "US").

    Usage
    ─────
        agent = JobSearchAgent(tinyfish_client, openai_client)

        # Search and score in one call
        jobs = await agent.search_and_score(
            query="Python developer",
            location="Remote",
            user_profile=user_dict,
            max_results=30,
        )

        # Or step-by-step
        jobs = await agent.search_jobs("Data Analyst", "New York", max_results=20)
        scored = await agent.score_jobs(jobs, user_profile=user_dict)
        details = await agent.get_job_details(jobs[0].url)
    """

    def __init__(
        self,
        tinyfish_client: TinyFishClient,
        openai_client: Any,
        use_proxy: bool = True,
        proxy_country: str = "US",
    ) -> None:
        self._tf = tinyfish_client
        self._oai = openai_client
        self._proxy = (
            ProxyConfig(enabled=True, country_code=proxy_country)
            if use_proxy
            else None
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    def _make_extraction_goal(self, query: str, location: str) -> str:
        """
        Build the natural-language goal that tells TinyFish exactly what to
        do on Indeed and what JSON to return.
        """
        return f"""
You are on Indeed.com.

Step 1 – Search
  • Find the job-title search box (placeholder "Job title, keywords, or company").
    Its HTML id is "text-input-what".
    Clear any existing text and type: {query!r}
  • Find the location search box (placeholder "City, state, zip, or remote").
    Its HTML id is "text-input-where".
    Clear any existing text and type: {location!r}
  • Click the "Find jobs" / "Search" submit button.
  • Wait for the job results to finish loading.

Step 2 – Close any popups
  • If a modal or overlay appears (e.g. "Sign in", "Job alerts", "Ready to
    apply?"), close it by clicking its X button or pressing Escape.

Step 3 – Extract job listings
  For every job card visible on the current results page
  (each card is a <div class="job_seen_beacon"> element):
    - "title"   : text inside <h2 class="jobTitle"> <a> element
    - "company" : text of element with data-testid="company-name"
    - "location": text of element with data-testid="text-location"
    - "salary"  : text of .salary-snippet-container element, or "" if absent
    - "url"     : full href of the <a> inside <h2 class="jobTitle">
                  (prefix with "https://www.indeed.com" if the href is relative)
    - "snippet" : text of the job-summary/snippet element if present, else ""

Return ONLY valid JSON with this exact schema – no markdown, no explanation:
{{
  "jobs": [
    {{
      "title": "...",
      "company": "...",
      "location": "...",
      "salary": "...",
      "url": "...",
      "snippet": "..."
    }}
  ],
  "has_next_page": true
}}

"has_next_page" should be true if a "Next" pagination link exists on the page
(look for <a data-testid="pagination-page-next"> or aria-label="Next Page").
"""

    def _make_next_page_goal(self) -> str:
        return """
On the current Indeed results page:

1. Look for the "Next" pagination button.
   Selector: a[data-testid="pagination-page-next"]  or  [aria-label="Next Page"]
2. Click it and wait for the next page of results to load.
3. Close any popup that appears.
4. Extract all job cards exactly as before:
   For every <div class="job_seen_beacon">:
     - title   : text inside h2.jobTitle a
     - company : [data-testid="company-name"] text
     - location: [data-testid="text-location"] text
     - salary  : .salary-snippet-container text, or ""
     - url     : full href from h2.jobTitle a
     - snippet : job snippet text or ""

Return ONLY valid JSON:
{
  "jobs": [...],
  "has_next_page": true/false
}
"""

    @staticmethod
    def _parse_jobs_json(raw: Any) -> tuple[List[JobListing], bool]:
        """
        Parse the JSON result from TinyFish into (list[JobListing], has_next).
        Handles cases where TinyFish returns a string or already-parsed dict.
        """
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Could not parse TinyFish result as JSON: %r", raw[:200])
                return [], False

        if not isinstance(raw, dict):
            logger.warning("Unexpected TinyFish result type: %s", type(raw))
            return [], False

        has_next: bool = raw.get("has_next_page", False)
        job_dicts: List[Dict] = raw.get("jobs", [])

        jobs: List[JobListing] = []
        for jd in job_dicts:
            url = jd.get("url", "")
            # Ensure Indeed relative URLs become absolute
            if url and not url.startswith("http"):
                url = INDEED_BASE + url
            jobs.append(
                JobListing(
                    title=jd.get("title", "").strip(),
                    company=jd.get("company", "").strip(),
                    location=jd.get("location", "").strip(),
                    salary=jd.get("salary", "").strip(),
                    url=url,
                    snippet=jd.get("snippet", "").strip(),
                    source="indeed",
                )
            )
        return jobs, has_next

    # ── Public API ────────────────────────────────────────────────────────────

    async def search_jobs(
        self,
        query: str,
        location: str,
        max_results: int = 30,
    ) -> List[JobListing]:
        """
        Search Indeed.com and return up to `max_results` job listings.

        Handles pagination automatically by clicking "Next" until enough
        results are collected or no more pages exist.

        Parameters
        ──────────
        query       : Job title, keywords, or company name.
        location    : City, state, zip, or "Remote".
        max_results : Maximum number of listings to return (default 30).

        Returns
        ───────
        List of JobListing objects (unsorted; call score_jobs() to rank them).
        """
        logger.info(
            "Searching Indeed for %r in %r (max_results=%d)",
            query, location, max_results,
        )
        all_jobs: List[JobListing] = []
        page = 1

        # ── Page 1: search + extract ──────────────────────────────────────
        try:
            result = await self._tf.run(
                url=INDEED_BASE,
                goal=self._make_extraction_goal(query, location),
                browser_profile=BrowserProfile.STEALTH,
                proxy_config=self._proxy,
                on_progress=lambda step: logger.info(
                    "  [Indeed page %d] %s", page, step
                ),
            )
            jobs, has_next = self._parse_jobs_json(result.result)
            logger.info("Page %d: found %d jobs (has_next=%s)", page, len(jobs), has_next)
            all_jobs.extend(jobs)
        except Exception as exc:
            logger.error("Failed to load Indeed page 1: %s", exc)
            return all_jobs

        # ── Subsequent pages ──────────────────────────────────────────────
        while has_next and len(all_jobs) < max_results:
            page += 1
            logger.info("Fetching page %d…", page)
            try:
                result = await self._tf.run(
                    url=result.streaming_url or INDEED_BASE,
                    goal=self._make_next_page_goal(),
                    browser_profile=BrowserProfile.STEALTH,
                    proxy_config=self._proxy,
                    on_progress=lambda step: logger.info(
                        "  [Indeed page %d] %s", page, step
                    ),
                )
                page_jobs, has_next = self._parse_jobs_json(result.result)
                logger.info(
                    "Page %d: found %d jobs (has_next=%s)",
                    page, len(page_jobs), has_next,
                )
                all_jobs.extend(page_jobs)
            except Exception as exc:
                logger.warning("Pagination failed on page %d: %s. Stopping.", page, exc)
                break

        # Trim to max_results, de-duplicate by URL
        seen_urls: set = set()
        unique_jobs: List[JobListing] = []
        for job in all_jobs[:max_results * 2]:
            if job.url not in seen_urls and job.url:
                seen_urls.add(job.url)
                unique_jobs.append(job)
            if len(unique_jobs) >= max_results:
                break

        logger.info(
            "search_jobs done: %d unique listings (from %d raw)",
            len(unique_jobs), len(all_jobs),
        )
        return unique_jobs

    async def score_jobs(
        self,
        jobs: List[JobListing],
        user_profile: Dict[str, Any],
    ) -> List[JobListing]:
        """
        Use GPT-4 to score each job 0–100 for relevance to the user's profile.

        Scoring criteria
        ─────────────────
        • Title match to user's preferred job title
        • Required skills overlap with user's experience
        • Location / work-type match
        • Salary alignment (if known)
        • Company culture signals in snippet

        Jobs are scored in batches of up to MAX_SCORING_BATCH to stay within
        token limits.  The `relevance_score` attribute is set in-place and the
        list is returned sorted descending by score.

        Parameters
        ──────────
        jobs         : List of JobListing objects to score.
        user_profile : User dict from the database (job_preferences, resume_data, etc.)

        Returns
        ───────
        The same list, each listing's `relevance_score` updated, sorted by score.
        """
        if not jobs:
            return jobs

        preferences = user_profile.get("job_preferences") or {}
        resume_data  = user_profile.get("resume_data") or {}
        answer_bank  = user_profile.get("answer_bank") or []

        # Build a compact profile summary for the prompt
        profile_summary = (
            f"Name: {user_profile.get('full_name', 'Candidate')}\n"
            f"Preferred title: {preferences.get('title', 'any')}\n"
            f"Preferred location/work-type: "
            f"{preferences.get('location', 'any')} / "
            f"{preferences.get('work_type', 'any')}\n"
            f"Desired salary (min): {preferences.get('salary_min', 'not specified')}\n"
            f"Skills / experience summary: "
            f"{json.dumps(resume_data.get('skills', []))}\n"
            f"Years of experience: {resume_data.get('years_experience', 'unknown')}\n"
        )

        num_batches = math.ceil(len(jobs) / MAX_SCORING_BATCH)
        logger.info(
            "Scoring %d jobs in %d GPT batch(es)…", len(jobs), num_batches
        )

        for batch_idx in range(num_batches):
            batch = jobs[
                batch_idx * MAX_SCORING_BATCH:
                (batch_idx + 1) * MAX_SCORING_BATCH
            ]

            jobs_payload = [
                {
                    "index": i + batch_idx * MAX_SCORING_BATCH,
                    "title": j.title,
                    "company": j.company,
                    "location": j.location,
                    "salary": j.salary,
                    "snippet": j.snippet,
                }
                for i, j in enumerate(batch)
            ]

            prompt = f"""You are an expert career coach and recruiter.

Below is a candidate's profile:
{profile_summary}

Rate each of the following job listings on a scale of 0–100 for how relevant
and suitable it is for this candidate. Consider:
  • Job title alignment with preferred title
  • Location / remote match
  • Salary vs minimum requirement (if info available)
  • Company reputation signals in the listing
  • Snippet language suggesting culture, growth, skill match

Jobs to score:
{json.dumps(jobs_payload, indent=2)}

Return ONLY a JSON array (no markdown, no explanation) in this exact format:
[
  {{"index": 0, "score": 85, "reason": "Strong title match, remote OK, good salary"}},
  ...
]
One entry per job, preserving the "index" values exactly.
"""
            try:
                response = await self._oai.chat.completions.create(
                    model=GPT_SCORE_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                )
                raw = response.choices[0].message.content or "[]"
                # GPT sometimes returns {"scores": [...]} or just [...]
                parsed = json.loads(raw)
                scores_list = parsed if isinstance(parsed, list) else (
                    parsed.get("scores") or parsed.get("jobs") or list(parsed.values())[0]
                    if isinstance(parsed, dict) else []
                )

                for entry in scores_list:
                    idx: int = entry.get("index", -1)
                    score: int = max(0, min(100, int(entry.get("score", 0))))
                    if 0 <= idx < len(jobs):
                        jobs[idx].relevance_score = score
                        logger.debug(
                            "Job[%d] '%s' → score=%d (%s)",
                            idx, jobs[idx].title, score, entry.get("reason", ""),
                        )
            except Exception as exc:
                logger.warning("GPT scoring batch %d failed: %s", batch_idx, exc)

        # Sort by score descending
        jobs.sort(key=lambda j: j.relevance_score, reverse=True)
        logger.info(
            "Scoring complete. Top job: %s (score=%d)",
            jobs[0].title if jobs else "N/A",
            jobs[0].relevance_score if jobs else 0,
        )
        return jobs

    async def get_job_details(self, job_url: str) -> JobListing:
        """
        Navigate to an individual Indeed job-posting page and extract full
        details: description, requirements, and benefits.

        Parameters
        ──────────
        job_url : The direct URL of the Indeed job posting.

        Returns
        ───────
        A JobListing enriched with `description`, `requirements`, `benefits`.
        """
        logger.info("Fetching job details: %s", job_url)

        goal = """
Navigate to this job posting page and extract the following:

1. "title"       : text of .jobsearch-JobInfoHeader-title  (main job title heading)
2. "company"     : text of [data-testid="inline-company-name"] or the company-name element
3. "location"    : text of the job location shown near the title
4. "salary"      : salary / compensation text if shown, else ""
5. "description" : FULL text content of the element with id="jobDescriptionText"
                   (this contains the complete job description, requirements, and benefits)
6. "requirements": if there is a clearly labelled "Requirements" or "Qualifications"
                   section inside the description, extract it separately, else ""
7. "benefits"    : if there is a clearly labelled "Benefits" or "Perks" section, else ""

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "...",
  "company": "...",
  "location": "...",
  "salary": "...",
  "description": "...",
  "requirements": "...",
  "benefits": "..."
}
"""
        try:
            result = await self._tf.run(
                url=job_url,
                goal=goal,
                browser_profile=BrowserProfile.STEALTH,
                proxy_config=self._proxy,
            )
            data = result.result
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    data = {}

            if not isinstance(data, dict):
                data = {}

            return JobListing(
                title=data.get("title", ""),
                company=data.get("company", ""),
                location=data.get("location", ""),
                salary=data.get("salary", ""),
                url=job_url,
                description=data.get("description", ""),
                requirements=data.get("requirements", ""),
                benefits=data.get("benefits", ""),
                source="indeed",
            )
        except Exception as exc:
            logger.error("get_job_details failed for %s: %s", job_url, exc)
            return JobListing(url=job_url, source="indeed")

    # ── Convenience combinator ────────────────────────────────────────────────

    async def search_and_score(
        self,
        query: str,
        location: str,
        user_profile: Dict[str, Any],
        max_results: int = 30,
        min_score: int = 0,
    ) -> List[JobListing]:
        """
        Convenience method: search Indeed, score with GPT, and return
        results above `min_score` (default: all).

        Parameters
        ──────────
        query        : Job search query.
        location     : Location or "Remote".
        user_profile : User dict from the database.
        max_results  : Maximum number of listings to search for.
        min_score    : Minimum relevance score to include in results.

        Returns
        ───────
        Scored and filtered list of JobListing objects, sorted by score.
        """
        jobs = await self.search_jobs(query, location, max_results=max_results)
        if not jobs:
            logger.warning("No jobs found for query=%r location=%r", query, location)
            return []

        jobs = await self.score_jobs(jobs, user_profile)

        if min_score > 0:
            before = len(jobs)
            jobs = [j for j in jobs if j.relevance_score >= min_score]
            logger.info(
                "Filtered to min_score=%d: %d/%d jobs kept",
                min_score, len(jobs), before,
            )

        return jobs

    async def enrich_top_jobs(
        self,
        jobs: List[JobListing],
        top_n: int = 5,
    ) -> List[JobListing]:
        """
        Fetch full job details for the top-N highest-scored jobs.
        This is useful before submitting applications so we have the full
        description available for cover-letter generation.

        Parameters
        ──────────
        jobs  : Scored list (from search_and_score).
        top_n : How many top jobs to enrich.

        Returns
        ───────
        The same list, with the top_n jobs' description/requirements filled in.
        """
        import asyncio
        top = jobs[:top_n]
        logger.info("Enriching details for top %d jobs…", len(top))
        enriched_tasks = [self.get_job_details(j.url) for j in top]
        enriched = await asyncio.gather(*enriched_tasks, return_exceptions=True)

        for i, result in enumerate(enriched):
            if isinstance(result, Exception):
                logger.warning("Failed to enrich job %d: %s", i, result)
                continue
            j = top[i]
            j.description  = result.description or j.description
            j.requirements = result.requirements or j.requirements
            j.benefits     = result.benefits or j.benefits
            # Preserve existing score/url/meta
        return jobs
