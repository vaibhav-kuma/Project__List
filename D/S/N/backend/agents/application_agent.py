"""
agents/application_agent.py
============================
Core autonomous job-application agent.

Orchestrates TinyFish (browser automation) + OpenAI GPT-4 to:
  1. Navigate to a job posting
  2. Click Apply / Easy Apply
  3. Detect the ATS (Greenhouse, Lever, Workday, etc.)
  4. Parse all form fields using GPT-4
  5. Map form fields → user profile data
  6. Answer screening questions (answer_bank → GPT fallback)
  7. Generate cover letters
  8. Handle multi-page forms
  9. Submit and capture confirmation
  10. Report every step via an async callback

ATS systems supported
─────────────────────
  • Direct on-site form (most job boards)
  • Greenhouse   (boards.greenhouse.io / grnh.se)
  • Lever        (jobs.lever.co)
  • Workday      (*.myworkdayjobs.com)
  • LinkedIn Easy Apply
  • SmartRecruiters / JazzHR / iCIMS (generic fallback)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional, Tuple

from services.tinyfish_client import BrowserProfile, ProxyConfig, TinyFishClient

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

GPT_MODEL             = "gpt-4o"
GPT_ANALYSIS_MODEL    = "gpt-4o"
MAX_FORM_PAGES        = 8       # max multi-step pages before giving up
MAX_RETRY_ATTEMPTS    = 3
RETRY_BACKOFF_BASE    = 3.0     # seconds

Callback = Optional[Callable[[str, str, Any], Coroutine]]
"""
Async callback signature: callback(step_name, status, detail)
  step_name : e.g. "navigate", "detect_ats", "fill_field"
  status    : "start" | "done" | "warn" | "error"
  detail    : arbitrary data (string, dict, …)
"""


# ─────────────────────────────────────────────────────────────────────────────
# ATS detection
# ─────────────────────────────────────────────────────────────────────────────

class ATSType(str, Enum):
    DIRECT          = "direct"
    GREENHOUSE      = "greenhouse"
    LEVER           = "lever"
    WORKDAY         = "workday"
    LINKEDIN        = "linkedin"
    SMARTRECRUITERS = "smartrecruiters"
    JAZZHR          = "jazzhr"
    ICIMS           = "icims"
    BREEZY          = "breezy"
    UNKNOWN         = "unknown"


_ATS_URL_PATTERNS: List[Tuple[str, ATSType]] = [
    (r"boards\.greenhouse\.io|grnh\.se",          ATSType.GREENHOUSE),
    (r"jobs\.lever\.co",                           ATSType.LEVER),
    (r"myworkdayjobs\.com",                        ATSType.WORKDAY),
    (r"linkedin\.com/jobs/easy-apply",             ATSType.LINKEDIN),
    (r"jobs\.smartrecruiters\.com|smartjob",       ATSType.SMARTRECRUITERS),
    (r"app\.jazz\.co|jazzhr\.com",                 ATSType.JAZZHR),
    (r"careers\.icims\.com|icims\.com",            ATSType.ICIMS),
    (r"app\.breezy\.hr",                           ATSType.BREEZY),
]


def _detect_ats_from_url(url: str) -> ATSType:
    """Heuristic ATS detection from URL string."""
    for pattern, ats in _ATS_URL_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            return ats
    return ATSType.DIRECT


# ─────────────────────────────────────────────────────────────────────────────
# Application step / result
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ApplicationStep:
    """A single step in the application workflow."""
    name: str
    status: str          # "pending" | "running" | "done" | "skipped" | "error"
    detail: str = ""
    data: Any = None


@dataclass
class ApplicationResult:
    """Final outcome of apply_to_job()."""
    success: bool
    status: str          # "submitted" | "failed" | "skipped" | "captcha" | "login_required"
    confirmation_text: str = ""
    screenshot_url: str = ""
    error_message: str = ""
    ats_type: str = ATSType.UNKNOWN
    steps: List[ApplicationStep] = field(default_factory=list)
    form_fields_filled: int = 0
    cover_letter_generated: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# Field mapping
# ─────────────────────────────────────────────────────────────────────────────

def _extract_name_parts(full_name: str) -> Tuple[str, str]:
    """Split "Jane Doe" → ("Jane", "Doe")."""
    parts = full_name.strip().split(maxsplit=1)
    return (parts[0], parts[1] if len(parts) > 1 else "")


FIELD_MAP: Dict[str, str] = {
    # Keys are regex patterns matched against field labels (case-insensitive)
    # Values are keys into the resolved_data dict built in _build_field_data()
    r"first.?name|given.?name|forename":              "first_name",
    r"last.?name|family.?name|surname":               "last_name",
    r"full.?name|your.?name|name$":                   "full_name",
    r"e.?mail|email.?address":                         "email",
    r"phone|mobile|cell|telephone":                    "phone",
    r"linkedin|linked.in":                             "linkedin_url",
    r"website|portfolio|personal.?url|github":        "website",
    r"resume|cv|curriculum.vitae":                    "resume_path",
    r"cover.?letter":                                  "cover_letter",
    r"city|current.?city":                             "city",
    r"state|province":                                 "state",
    r"country":                                        "country",
    r"zip|postal":                                     "zip",
    r"salary|compensation|expected.?pay":              "salary_expectation",
    r"start.?date|available.?from|notice.?period":    "start_date",
    r"years.?of.?exp|experience.?years|how.?many.?years": "years_experience",
    r"work.?auth|authoriz|legally.?allowed|visa":     "work_authorization",
    r"require.?sponsor|sponsorship":                   "requires_sponsorship",
    r"gender|pronouns":                                "gender",
    r"race|ethnicity":                                 "race",
    r"veteran|military":                               "veteran_status",
    r"disability|disabled":                            "disability_status",
    r"refer|how.?did.?you.?hear|source":               "referral_source",
}


def _map_field_label(label: str) -> Optional[str]:
    """
    Try to map a field label to a known data key.
    Returns None if no match found (→ treated as screening question).
    """
    label_lower = label.lower().strip()
    for pattern, key in FIELD_MAP.items():
        if re.search(pattern, label_lower):
            return key
    return None


def _build_field_data(user_profile: Dict[str, Any], cover_letter: str = "") -> Dict[str, str]:
    """Build a flat dict of all values the agent can use to fill form fields."""
    first, last = _extract_name_parts(user_profile.get("full_name") or "")
    prefs = user_profile.get("job_preferences") or {}
    resume_data = user_profile.get("resume_data") or {}

    location_raw = prefs.get("location", "")
    location_parts = re.split(r"[,/]", location_raw)
    city  = location_parts[0].strip() if location_parts else ""
    state = location_parts[1].strip() if len(location_parts) > 1 else ""

    return {
        "first_name":           first,
        "last_name":            last,
        "full_name":            user_profile.get("full_name", ""),
        "email":                user_profile.get("email", ""),
        "phone":                user_profile.get("phone", ""),
        "linkedin_url":         user_profile.get("linkedin_url", ""),
        "website":              user_profile.get("website", ""),
        "resume_path":          user_profile.get("resume_path", ""),
        "cover_letter":         cover_letter,
        "city":                 city,
        "state":                state,
        "country":              "United States",
        "zip":                  "",
        "salary_expectation":   str(prefs.get("salary_min", "")),
        "start_date":           "Immediately",
        "years_experience":     str(resume_data.get("years_experience", "")),
        "work_authorization":   "Yes",
        "requires_sponsorship": "No",
        "gender":               "Prefer not to say",
        "race":                 "Prefer not to say",
        "veteran_status":       "I am not a veteran",
        "disability_status":    "No",
        "referral_source":      "Job board",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Agent
# ─────────────────────────────────────────────────────────────────────────────

class ApplicationAgent:
    """
    Autonomous job application agent.

    Parameters
    ──────────
    tinyfish_client : Configured TinyFishClient.
    openai_client   : openai.AsyncOpenAI instance.
    user_profile    : User dict from the database (with job_preferences,
                      resume_data, answer_bank, etc.)
    use_proxy       : Route browser through a proxy (recommended).
    proxy_country   : ISO country code for proxy.

    Usage
    ─────
        agent = ApplicationAgent(tf_client, oai_client, user_profile)
        result = await agent.apply_to_job(
            job_url="https://jobs.lever.co/acme/abc123",
            job_description="We are looking for a Python developer…",
            callback=my_websocket_updater,
        )
        if result.success:
            print("Applied! Confirmation:", result.confirmation_text)
    """

    def __init__(
        self,
        tinyfish_client: TinyFishClient,
        openai_client: Any,
        user_profile: Dict[str, Any],
        use_proxy: bool = False,
        proxy_country: str = "US",
    ) -> None:
        self._tf           = tinyfish_client
        self._oai          = openai_client
        self._user         = user_profile
        self._answer_bank: List[Dict[str, str]] = user_profile.get("answer_bank") or []
        self._proxy = (
            ProxyConfig(enabled=True, country_code=proxy_country)
            if use_proxy else None
        )

    # ── Callback helper ───────────────────────────────────────────────────────

    async def _emit(
        self,
        callback: Callback,
        step: str,
        status: str,
        detail: Any = "",
    ) -> None:
        """Fire the callback and log the event."""
        logger.info("[%s] %s – %s", status.upper(), step, detail)
        if callback:
            try:
                await callback(step, status, detail)
            except Exception as exc:
                logger.warning("Callback error: %s", exc)

    # ── GPT helpers ───────────────────────────────────────────────────────────

    async def _gpt(self, system: str, user: str, temperature: float = 0.3) -> str:
        """Single GPT call; returns the raw response text."""
        resp = await self._oai.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=temperature,
        )
        return (resp.choices[0].message.content or "").strip()

    async def _gpt_json(self, system: str, user: str) -> Any:
        """GPT call that always returns parsed JSON. Falls back to {} on error."""
        resp = await self._oai.chat.completions.create(
            model=GPT_ANALYSIS_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        raw = (resp.choices[0].message.content or "{}").strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("GPT returned invalid JSON: %r", raw[:300])
            return {}

    # ── Cover letter generation ───────────────────────────────────────────────

    async def _generate_cover_letter(
        self, job_title: str, company: str, job_description: str
    ) -> str:
        """Generate a concise, personalised cover letter using GPT-4."""
        resume_data = self._user.get("resume_data") or {}
        skills      = resume_data.get("skills", [])
        exp         = resume_data.get("years_experience", "several")
        summary     = resume_data.get("summary", "")

        system = (
            "You are an expert career coach who writes compelling, concise "
            "cover letters. Write in first-person, professional yet warm tone. "
            "Keep it to 3 paragraphs, under 250 words."
        )
        user_msg = f"""
Write a cover letter for this application:

Job Title  : {job_title}
Company    : {company}
Job Desc   : {job_description[:1500]}

Candidate profile:
  Name               : {self._user.get("full_name", "")}
  Years experience   : {exp}
  Key skills         : {", ".join(skills[:12])}
  Professional summary: {summary[:500]}

Instructions:
- Opening: Express genuine enthusiasm for the specific role and company.
- Middle: Highlight 2-3 most relevant skills/experiences matching the JD.
- Closing: Call to action + thank you.
- Do NOT use generic phrases like "I am writing to apply".
- Return ONLY the cover letter text, no subject line, no date, no address blocks.
"""
        letter = await self._gpt(system, user_msg, temperature=0.6)
        logger.info("Cover letter generated (%d chars)", len(letter))
        return letter

    # ── Screening question answering ──────────────────────────────────────────

    def _check_answer_bank(self, question: str) -> Optional[str]:
        """
        Look for a matching answer in the user's pre-defined answer bank.
        Returns the answer if a close match is found, else None.
        """
        q_lower = question.lower()
        for entry in self._answer_bank:
            stored_q = (entry.get("question") or "").lower()
            # Simple substring / keyword match
            keywords = [w for w in stored_q.split() if len(w) > 4]
            if keywords and sum(k in q_lower for k in keywords) >= len(keywords) * 0.6:
                return entry.get("answer", "")
        return None

    async def _answer_screening_question(
        self,
        question: str,
        field_type: str,
        options: List[str],
        job_description: str,
    ) -> str:
        """
        Answer a screening/custom question using:
        1. answer_bank (exact/fuzzy match)
        2. GPT-4 fallback with job + profile context
        """
        # 1. Try answer bank first
        cached = self._check_answer_bank(question)
        if cached:
            logger.debug("Answer bank hit for: %r", question[:60])
            return cached

        # 2. GPT fallback
        resume_data = self._user.get("resume_data") or {}
        system = (
            "You are filling out a job application on behalf of the candidate. "
            "Provide honest, professional, concise answers. "
            "If asked about years of experience, use the candidate's actual data. "
            "For yes/no questions, answer with just 'Yes' or 'No'. "
            "For dropdown/radio questions, choose the most appropriate option from the list."
        )
        options_str = (
            f"\nAvailable options to choose from: {json.dumps(options)}"
            if options else ""
        )
        user_msg = f"""
Application question: {question}
Field type: {field_type}{options_str}

Candidate profile:
  Name             : {self._user.get("full_name", "")}
  Email            : {self._user.get("email", "")}
  Years experience : {resume_data.get("years_experience", "not specified")}
  Skills           : {", ".join(resume_data.get("skills", [])[:10])}
  Summary          : {resume_data.get("summary", "")[:400]}

Job description excerpt:
{job_description[:800]}

Provide ONLY the answer text. No explanation. No quotes.
If it's a multiple-choice/dropdown, return exactly one of the provided options.
"""
        answer = await self._gpt(system, user_msg, temperature=0.2)
        logger.debug("GPT answered %r → %r", question[:60], answer[:80])
        return answer

    # ── Form field analysis ───────────────────────────────────────────────────

    async def _analyze_form_fields(
        self, page_html_summary: str, ats_type: ATSType
    ) -> List[Dict[str, Any]]:
        """
        Ask GPT-4 to parse the page HTML summary and return a structured list
        of form fields with their labels, types, selectors, and options.
        """
        system = (
            "You are an expert at analysing HTML forms for job applications. "
            "Extract all interactive form fields from the provided HTML summary. "
            "Return structured JSON."
        )
        user_msg = f"""
ATS type: {ats_type.value}

Page HTML summary (partial):
{page_html_summary[:4000]}

Identify every fillable form field. For each field return:
{{
  "label": "human-readable label text",
  "type": "text|email|tel|textarea|select|radio|checkbox|file|date",
  "selector": "CSS selector or best guess (id preferred)",
  "required": true/false,
  "options": ["opt1", "opt2"],  // for select/radio only, else []
  "is_screening_question": true/false,  // true if it's a custom question not in standard profile fields
  "data_key": "matching key from profile data or null"
}}

Return JSON:
{{
  "fields": [ ... ]
}}

Standard profile keys available: first_name, last_name, full_name, email,
phone, linkedin_url, website, resume_path, cover_letter, city, state,
country, salary_expectation, years_experience, work_authorization,
requires_sponsorship, start_date, gender, race, veteran_status,
disability_status, referral_source.

For any field not clearly matching a standard key, set data_key to null and
is_screening_question to true.
"""
        result = await self._gpt_json(system, user_msg)
        fields: List[Dict[str, Any]] = result.get("fields", [])
        logger.debug("form analysis → %d fields found", len(fields))
        return fields

    # ── TinyFish goal builders ────────────────────────────────────────────────

    def _goal_navigate_apply(self) -> str:
        return """
On this job posting page:

1. Look for an "Apply", "Apply Now", "Easy Apply", or "Apply for this job" button.
   Common selectors to try:
     button:contains("Apply"), a:contains("Apply Now"),
     .apply-button, #apply-btn, [data-testid*="apply"],
     button[data-automation="job-detail-apply"]

2. Click the Apply button.

3. If a new tab or popup opens, switch to it.

4. Wait for the application form or next page to fully load.

5. Return JSON:
{
  "current_url": "https://...",
  "page_title": "...",
  "page_html_summary": "<truncated HTML of the form area, up to 4000 chars>",
  "apply_button_found": true/false,
  "is_new_tab": true/false,
  "popup_detected": true/false,
  "popup_text": "..."
}
"""

    def _goal_detect_and_get_form(self, ats_type: ATSType) -> str:
        ats_hint = {
            ATSType.GREENHOUSE:      "This is a Greenhouse ATS form (boards.greenhouse.io). Fields are inside #application_form.",
            ATSType.LEVER:           "This is a Lever ATS form (jobs.lever.co). Fields are in .application-form.",
            ATSType.WORKDAY:         "This is a Workday ATS. Fields use data-automation attributes.",
            ATSType.LINKEDIN:        "This is a LinkedIn Easy Apply modal.",
            ATSType.SMARTRECRUITERS: "This is a SmartRecruiters application form.",
            ATSType.DIRECT:          "This is a standard HTML form.",
        }.get(ats_type, "This is an ATS application form.")

        return f"""
{ats_hint}

Analyse the current application form page and return a detailed HTML summary
of all visible form fields.

Return JSON:
{{
  "current_url": "https://...",
  "page_title": "...",
  "page_html_summary": "<all <label>, <input>, <select>, <textarea> elements with their id, name, class, placeholder, type attributes and any visible option values>",
  "has_file_upload": true/false,
  "has_cover_letter_field": true/false,
  "submit_button_text": "Submit Application",
  "next_button_text": "Next / Continue / null if not present",
  "captcha_detected": false,
  "login_required": false,
  "error_messages": []
}}
"""

    def _goal_fill_fields(
        self,
        field_data: Dict[str, str],
        fields: List[Dict[str, Any]],
        ats_type: ATSType,
    ) -> str:
        """Build a TinyFish goal that fills all known fields."""
        fill_instructions = []
        for f in fields:
            key = f.get("data_key")
            if not key or f.get("is_screening_question"):
                continue
            value = field_data.get(key, "")
            if not value:
                continue
            ftype = f.get("type", "text")
            selector = f.get("selector", "")
            label = f.get("label", "")

            if ftype == "file":
                fill_instructions.append(
                    f'  • Upload file "{value}" into the field labelled "{label}" (selector: {selector})'
                )
            elif ftype in ("select", "radio"):
                fill_instructions.append(
                    f'  • Select option "{value}" in the "{label}" dropdown/radio (selector: {selector})'
                )
            elif ftype == "checkbox":
                fill_instructions.append(
                    f'  • {"Check" if value.lower() in ("yes","true","1") else "Uncheck"} the checkbox labelled "{label}" (selector: {selector})'
                )
            elif ftype == "textarea":
                fill_instructions.append(
                    f'  • Clear and type the following into the "{label}" textarea (selector: {selector}):\n    """{value[:500]}"""'
                )
            else:
                fill_instructions.append(
                    f'  • Clear and type "{value}" into the "{label}" input (selector: {selector})'
                )

        instructions_str = "\n".join(fill_instructions) if fill_instructions else "  (no standard fields to fill on this page)"

        return f"""
Fill the following fields on the current application form page:

{instructions_str}

Rules:
- Clear each field before typing to avoid appending to existing values.
- For select/dropdown elements, choose the option that best matches the value.
- For file uploads, use the file path provided exactly as given.
- If a field is already correctly filled, leave it.
- Do NOT submit the form yet.
- Close any popups or cookie banners that obstruct the form.
- After filling all fields, return JSON:
{{
  "fields_filled": ["label1", "label2"],
  "fields_skipped": ["label3"],
  "errors": [],
  "current_url": "https://..."
}}
"""

    def _goal_answer_screening(
        self, field: Dict[str, Any], answer: str
    ) -> str:
        label    = field.get("label", "the question field")
        ftype    = field.get("type", "text")
        selector = field.get("selector", "")
        options  = field.get("options", [])

        if ftype in ("select", "radio"):
            action = f'Select "{answer}" from the options: {json.dumps(options)}'
        elif ftype == "checkbox":
            action = f'{"Check" if answer.lower() in ("yes","true") else "Uncheck"} the checkbox'
        elif ftype == "textarea":
            action = f'Type the following text into the textarea:\n"""{answer}"""'
        else:
            action = f'Type "{answer}" into the field'

        return f"""
On the current application form page, answer this screening question:

Question / Field Label: "{label}"
Selector: {selector}
Action: {action}

After filling this field, return JSON:
{{
  "filled": true,
  "field_label": "{label}",
  "value_entered": "{answer[:100]}",
  "error": null
}}
"""

    def _goal_submit(self, submit_button_text: str) -> str:
        return f"""
On the current application form page:

1. Verify all required fields are filled (look for red asterisks or
   "required" labels – if any empty required fields exist, note them).

2. Click the submit button. Its text is approximately: "{submit_button_text}"
   Also try: button[type="submit"], input[type="submit"],
             button:contains("Submit"), button:contains("Send"),
             button:contains("Apply").

3. Wait for the confirmation page or success message to load (up to 15 seconds).

4. Return JSON:
{{
  "submitted": true/false,
  "confirmation_text": "Thank you for applying… (verbatim success message)",
  "current_url": "https://...",
  "error_messages": [],
  "captcha_detected": false,
  "missing_required_fields": []
}}
"""

    def _goal_next_page(self, next_button_text: str) -> str:
        return f"""
On the current multi-step application form page:

1. Click the "Next" / "Continue" button. Its text: "{next_button_text}"
   Also try: button:contains("Next"), button:contains("Continue"),
             button[data-testid*="next"], a:contains("Next Step").

2. Wait for the next form page to load.

3. Return JSON:
{{
  "clicked": true,
  "current_url": "https://...",
  "page_title": "...",
  "page_html_summary": "<label, input, select, textarea elements>",
  "has_next_page": true/false,
  "submit_button_text": "Submit / null",
  "next_button_text": "Next / null",
  "captcha_detected": false,
  "error_messages": []
}}
"""

    def _goal_dismiss_popup(self) -> str:
        return """
A popup or modal has appeared on the current page.
Close it by:
  1. Clicking the X / Close button inside the modal, OR
  2. Pressing Escape, OR
  3. Clicking the "Cancel" or "No thanks" button.

After dismissing, return JSON: {"dismissed": true, "popup_text": "..."}
"""

    # ── Main workflow ─────────────────────────────────────────────────────────

    async def apply_to_job(
        self,
        job_url: str,
        job_title: str = "",
        company: str = "",
        job_description: str = "",
        callback: Callback = None,
    ) -> ApplicationResult:
        """
        End-to-end autonomous application workflow.

        Parameters
        ──────────
        job_url         : URL of the job posting page.
        job_title       : Job title (used in cover letter generation).
        company         : Company name.
        job_description : Full job description text (for context).
        callback        : Async function(step, status, detail) called on each event.

        Returns
        ───────
        ApplicationResult with outcome, confirmation, screenshot URL, and steps.
        """
        steps: List[ApplicationStep] = []
        result = ApplicationResult(
            success=False,
            status="failed",
            ats_type=ATSType.UNKNOWN,
            steps=steps,
        )

        def record(name: str, status: str, detail: str = "", data: Any = None):
            steps.append(ApplicationStep(name=name, status=status, detail=detail, data=data))

        # ── Step 1: Navigate and click Apply ─────────────────────────────
        await self._emit(callback, "navigate", "start", job_url)
        record("navigate", "running", job_url)

        try:
            nav_result = await self._tf.run(
                url=job_url,
                goal=self._goal_navigate_apply(),
                browser_profile=BrowserProfile.STEALTH,
                proxy_config=self._proxy,
            )
            nav_data = nav_result.result or {}
            if isinstance(nav_data, str):
                try:
                    nav_data = json.loads(nav_data)
                except json.JSONDecodeError:
                    nav_data = {}

            current_url: str = nav_data.get("current_url", job_url)
            popup_detected: bool = nav_data.get("popup_detected", False)

            if not nav_data.get("apply_button_found", True):
                record("navigate", "warn", "Apply button not found on page")
                await self._emit(callback, "navigate", "warn", "Apply button not found")
            else:
                record("navigate", "done", current_url)
                await self._emit(callback, "navigate", "done", current_url)

        except Exception as exc:
            record("navigate", "error", str(exc))
            await self._emit(callback, "navigate", "error", str(exc))
            result.error_message = str(exc)
            return result

        # ── Step 2: Detect popup ──────────────────────────────────────────
        if popup_detected:
            await self._emit(callback, "dismiss_popup", "start", "")
            try:
                await self._tf.run(
                    url=current_url,
                    goal=self._goal_dismiss_popup(),
                    browser_profile=BrowserProfile.STEALTH,
                    proxy_config=self._proxy,
                )
                record("dismiss_popup", "done")
                await self._emit(callback, "dismiss_popup", "done", "Popup dismissed")
            except Exception as exc:
                record("dismiss_popup", "warn", str(exc))

        # ── Step 3: Detect ATS ────────────────────────────────────────────
        ats_type = _detect_ats_from_url(current_url)
        result.ats_type = ats_type
        await self._emit(callback, "detect_ats", "done", {
            "ats": ats_type.value, "url": current_url
        })
        record("detect_ats", "done", ats_type.value)

        # Check for login wall / CAPTCHA early
        if nav_data.get("login_required"):
            result.status = "login_required"
            result.error_message = "Login required – skipping"
            record("detect_ats", "warn", "Login required")
            await self._emit(callback, "detect_ats", "warn", "Login required")
            return result

        # ── Step 4: Generate cover letter ─────────────────────────────────
        cover_letter = ""
        if job_description and job_title:
            await self._emit(callback, "cover_letter", "start", "")
            try:
                cover_letter = await self._generate_cover_letter(
                    job_title, company, job_description
                )
                result.cover_letter_generated = True
                record("cover_letter", "done", f"{len(cover_letter)} chars")
                await self._emit(callback, "cover_letter", "done", cover_letter[:200] + "…")
            except Exception as exc:
                record("cover_letter", "warn", str(exc))
                await self._emit(callback, "cover_letter", "warn", str(exc))

        # ── Build field data dict ─────────────────────────────────────────
        field_data = _build_field_data(self._user, cover_letter)

        # ── Steps 5-8: Multi-page form loop ──────────────────────────────
        page_num = 0
        submit_button_text = "Submit Application"
        next_button_text: Optional[str] = None
        fields_filled_total = 0

        while page_num < MAX_FORM_PAGES:
            page_num += 1
            await self._emit(callback, "analyze_form", "start", f"Page {page_num}")

            # ── Get form HTML summary ─────────────────────────────────
            try:
                form_result = await self._tf.run(
                    url=current_url,
                    goal=self._goal_detect_and_get_form(ats_type),
                    browser_profile=BrowserProfile.STEALTH,
                    proxy_config=self._proxy,
                )
                form_data = form_result.result or {}
                if isinstance(form_data, str):
                    try:
                        form_data = json.loads(form_data)
                    except json.JSONDecodeError:
                        form_data = {}

                current_url = form_data.get("current_url", current_url)
                html_summary = form_data.get("page_html_summary", "")
                submit_button_text = form_data.get("submit_button_text") or "Submit Application"
                next_button_text   = form_data.get("next_button_text")

                # Early-exit conditions
                if form_data.get("captcha_detected"):
                    result.status = "captcha"
                    result.error_message = "CAPTCHA detected – manual review required"
                    record("analyze_form", "error", "CAPTCHA")
                    await self._emit(callback, "analyze_form", "error", "CAPTCHA detected")
                    return result

                if form_data.get("login_required"):
                    result.status = "login_required"
                    record("analyze_form", "warn", "Login required")
                    await self._emit(callback, "analyze_form", "warn", "Login required")
                    return result

            except Exception as exc:
                record("analyze_form", "error", str(exc))
                await self._emit(callback, "analyze_form", "error", str(exc))
                break

            # ── GPT: Analyse form fields ──────────────────────────────
            try:
                fields = await self._analyze_form_fields(html_summary, ats_type)
                record("analyze_form", "done", f"{len(fields)} fields on page {page_num}")
                await self._emit(callback, "analyze_form", "done", {
                    "page": page_num, "field_count": len(fields)
                })
            except Exception as exc:
                record("analyze_form", "error", str(exc))
                fields = []

            # ── Fill standard fields ──────────────────────────────────
            standard_fields = [
                f for f in fields
                if f.get("data_key") and not f.get("is_screening_question")
            ]
            screening_fields = [
                f for f in fields
                if f.get("is_screening_question") or not f.get("data_key")
            ]

            if standard_fields:
                await self._emit(callback, "fill_fields", "start",
                                 f"{len(standard_fields)} standard fields")
                try:
                    fill_result = await self._tf.run(
                        url=current_url,
                        goal=self._goal_fill_fields(field_data, standard_fields, ats_type),
                        browser_profile=BrowserProfile.STEALTH,
                        proxy_config=self._proxy,
                    )
                    fill_data = fill_result.result or {}
                    if isinstance(fill_data, str):
                        try: fill_data = json.loads(fill_data)
                        except: fill_data = {}

                    filled = fill_data.get("fields_filled", [])
                    fields_filled_total += len(filled)
                    record("fill_fields", "done", f"{len(filled)} fields filled on page {page_num}")
                    await self._emit(callback, "fill_fields", "done", {
                        "page": page_num, "filled": filled,
                        "skipped": fill_data.get("fields_skipped", [])
                    })
                except Exception as exc:
                    record("fill_fields", "warn", str(exc))
                    await self._emit(callback, "fill_fields", "warn", str(exc))

            # ── Answer screening questions ────────────────────────────
            for sq_field in screening_fields:
                label = sq_field.get("label", "")
                if not label:
                    continue
                await self._emit(callback, "screening_question", "start", label)
                try:
                    answer = await self._answer_screening_question(
                        question=label,
                        field_type=sq_field.get("type", "text"),
                        options=sq_field.get("options", []),
                        job_description=job_description,
                    )
                    await self._tf.run(
                        url=current_url,
                        goal=self._goal_answer_screening(sq_field, answer),
                        browser_profile=BrowserProfile.STEALTH,
                        proxy_config=self._proxy,
                    )
                    fields_filled_total += 1
                    record("screening_question", "done", f"{label!r} → {answer[:60]!r}")
                    await self._emit(callback, "screening_question", "done", {
                        "question": label, "answer": answer[:100]
                    })
                except Exception as exc:
                    record("screening_question", "warn", f"{label}: {exc}")
                    await self._emit(callback, "screening_question", "warn", {
                        "question": label, "error": str(exc)
                    })

            # ── Paginate or submit ────────────────────────────────────
            if next_button_text and next_button_text.lower() not in ("null", "none", ""):
                # More pages – click Next
                await self._emit(callback, "next_page", "start",
                                 f"Clicking '{next_button_text}'")
                try:
                    next_result = await self._tf.run(
                        url=current_url,
                        goal=self._goal_next_page(next_button_text),
                        browser_profile=BrowserProfile.STEALTH,
                        proxy_config=self._proxy,
                    )
                    next_data = next_result.result or {}
                    if isinstance(next_data, str):
                        try: next_data = json.loads(next_data)
                        except: next_data = {}

                    if next_data.get("captcha_detected"):
                        result.status = "captcha"
                        result.error_message = "CAPTCHA on pagination"
                        await self._emit(callback, "next_page", "error", "CAPTCHA")
                        return result

                    current_url = next_data.get("current_url", current_url)
                    next_button_text = next_data.get("next_button_text")
                    submit_button_text = next_data.get("submit_button_text") or submit_button_text

                    record("next_page", "done", f"Now on page {page_num + 1}")
                    await self._emit(callback, "next_page", "done", current_url)
                except Exception as exc:
                    record("next_page", "error", str(exc))
                    await self._emit(callback, "next_page", "error", str(exc))
                    break
            else:
                # No more pages – submit
                break

        # ── Step 9: Submit ────────────────────────────────────────────────
        result.form_fields_filled = fields_filled_total
        await self._emit(callback, "submit", "start",
                         f"Clicking '{submit_button_text}'")
        record("submit", "running", submit_button_text)

        for attempt in range(1, MAX_RETRY_ATTEMPTS + 1):
            try:
                sub_result = await self._tf.run(
                    url=current_url,
                    goal=self._goal_submit(submit_button_text),
                    browser_profile=BrowserProfile.STEALTH,
                    proxy_config=self._proxy,
                )
                sub_data = sub_result.result or {}
                if isinstance(sub_data, str):
                    try: sub_data = json.loads(sub_data)
                    except: sub_data = {}

                # Check for CAPTCHA after submit
                if sub_data.get("captcha_detected"):
                    result.status = "captcha"
                    result.error_message = "CAPTCHA on submit"
                    record("submit", "error", "CAPTCHA")
                    await self._emit(callback, "submit", "error", "CAPTCHA")
                    return result

                # Check for validation errors
                errors = sub_data.get("error_messages", [])
                missing = sub_data.get("missing_required_fields", [])
                if errors or missing:
                    err_str = ", ".join(errors + missing)
                    if attempt < MAX_RETRY_ATTEMPTS:
                        logger.warning(
                            "Submit validation errors (attempt %d): %s. Retrying…",
                            attempt, err_str,
                        )
                        await asyncio.sleep(RETRY_BACKOFF_BASE * attempt)
                        continue
                    else:
                        result.error_message = f"Validation errors: {err_str}"
                        record("submit", "error", result.error_message)
                        await self._emit(callback, "submit", "error", result.error_message)
                        return result

                # Success
                if sub_data.get("submitted", False):
                    result.success = True
                    result.status = "submitted"
                    result.confirmation_text = sub_data.get("confirmation_text", "")
                    result.screenshot_url = sub_result.streaming_url or ""
                    record("submit", "done", result.confirmation_text[:200])
                    await self._emit(callback, "submit", "done", {
                        "confirmation": result.confirmation_text,
                        "url": sub_data.get("current_url", ""),
                    })
                    break
                else:
                    if attempt < MAX_RETRY_ATTEMPTS:
                        logger.warning("Submit did not confirm success. Attempt %d…", attempt)
                        await asyncio.sleep(RETRY_BACKOFF_BASE)
                    else:
                        result.error_message = "Submit clicked but no confirmation received"
                        record("submit", "warn", result.error_message)

            except Exception as exc:
                if attempt < MAX_RETRY_ATTEMPTS:
                    logger.warning("Submit error attempt %d: %s. Retrying…", attempt, exc)
                    await asyncio.sleep(RETRY_BACKOFF_BASE * attempt)
                else:
                    result.error_message = str(exc)
                    record("submit", "error", str(exc))
                    await self._emit(callback, "submit", "error", str(exc))

        return result

    # ── Batch application ─────────────────────────────────────────────────────

    async def apply_to_jobs_batch(
        self,
        jobs: List[Dict[str, Any]],
        callback: Callback = None,
        delay_between_apps: float = 5.0,
    ) -> List[Dict[str, Any]]:
        """
        Apply to multiple jobs sequentially with a delay between each.

        Parameters
        ──────────
        jobs                : List of job dicts, each with keys:
                              url, title, company, description.
        callback            : Per-step async callback.
        delay_between_apps  : Seconds to wait between applications.

        Returns
        ───────
        List of result dicts (one per job) with keys:
          job_url, success, status, confirmation_text, error_message, ats_type.
        """
        results = []
        for i, job in enumerate(jobs, 1):
            job_url  = job.get("url", "")
            title    = job.get("title", "")
            company  = job.get("company", "")
            desc     = job.get("description", "")

            logger.info("Applying to job %d/%d: %s @ %s", i, len(jobs), title, company)
            await self._emit(callback, "batch_progress", "start", {
                "current": i, "total": len(jobs), "job": title, "company": company
            })

            try:
                app_result = await self.apply_to_job(
                    job_url=job_url,
                    job_title=title,
                    company=company,
                    job_description=desc,
                    callback=callback,
                )
                results.append({
                    "job_url":           job_url,
                    "job_title":         title,
                    "company":           company,
                    "success":           app_result.success,
                    "status":            app_result.status,
                    "confirmation_text": app_result.confirmation_text,
                    "error_message":     app_result.error_message,
                    "ats_type":          app_result.ats_type,
                    "fields_filled":     app_result.form_fields_filled,
                    "cover_letter":      app_result.cover_letter_generated,
                })
            except Exception as exc:
                logger.error("Unhandled error applying to %s: %s", job_url, exc)
                results.append({
                    "job_url": job_url, "job_title": title, "company": company,
                    "success": False, "status": "failed",
                    "error_message": str(exc), "ats_type": ATSType.UNKNOWN,
                })

            await self._emit(callback, "batch_progress", "done", {
                "current": i, "total": len(jobs),
                "success": results[-1]["success"]
            })

            if i < len(jobs):
                logger.info("Waiting %.1fs before next application…", delay_between_apps)
                await asyncio.sleep(delay_between_apps)

        success_count = sum(1 for r in results if r["success"])
        logger.info(
            "Batch complete: %d/%d submitted successfully.",
            success_count, len(jobs),
        )
        await self._emit(callback, "batch_complete", "done", {
            "total": len(jobs), "success": success_count,
            "failed": len(jobs) - success_count,
        })
        return results
