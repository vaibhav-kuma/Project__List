# Pentest Suite CLI — Reviewed Implementation Plan

## 1. Purpose and release boundary

Build a project-based CLI for **authorized security assessments**. It should coordinate
approved external tools, preserve reproducible evidence, enforce scope and authorization,
and produce reviewable findings.

The first release is an assessment-orchestration product, not an autonomous attack platform.
Its supported workflow is:

`initialize project → validate authorization and scope → discover/map → collect evidence → create/review findings → export report`

### v1 included

- Project initialization, authorization record, scope/exclusion rules, audit trail, and
  dry-run planning.
- Passive asset discovery and explicitly approved, rate-limited port/service discovery.
- Read-only service/web enumeration and template-based vulnerability detection.
- Normalized assets, services, evidence, tool runs, and findings.
- Human-reviewed findings and Markdown, HTML, and JSON exports.
- Tool discovery, version checks, adapter fixtures, and a local/mock integration harness.

### Deferred from v1

Do not implement automatic exploitation, payload execution, credential attacks, post-
exploitation, persistence, wireless capture/cracking, or social-engineering campaign
features. They materially change the safety, authorization, data-handling, and operational
review requirements. If later approved, they must be separate, capability-gated releases
with a security review and explicit engagement-specific controls.

## 2. Decisions to make before implementation

These decisions unblock stable interfaces; record their answers in an ADR directory.

| Decision | Recommended default | Why it matters |
|---|---|---|
| Runtime and CLI | Python 3.11+, Typer | Typed commands, nested groups, testable command layer. |
| State store | SQLite plus an artifact directory | Transactions and concurrent writes are safer than JSONL for multi-target runs. |
| Models | Pydantic models with schema versioning | Makes adapter and report contracts explicit. |
| Target identities | Canonical IP/domain/URL records with provenance | Prevents accidental merging of resolved, redirected, or duplicate assets. |
| External tools | Version-pinned adapters with parsed and raw output retained | Tool output changes frequently; raw evidence enables re-parsing. |
| Secrets | Do not persist plaintext credentials in v1 | Reduces sensitive-data exposure; store redacted references only. |
| Distribution | Python package first; pinned container later | Keeps the initial developer loop and support surface small. |

Confirm the intended operating systems, required tool licenses/API keys, maximum target
count, and whether a report template already exists before accepting the v1 backlog.

## 3. Architecture and trust boundaries

Keep the command layer thin. Each command creates a validated job, then the core services
perform planning, execution, persistence, and reporting.

```text
CLI / config / JSON input
        │
        ▼
authorization + scope policy ──► job planner ──► tool adapter ──► runner
        │                             │              │              │
        ▼                             ▼              ▼              ▼
audit log                         SQLite state    raw artifacts   bounded subprocess
        │                             │
        └──────────────► finding review / report exporter
```

### Required project layout

```text
project/
  project.yaml             # name, schema version, policy references
  scope.yaml               # allowlists, exclusions, approved URL schemes/ports
  authorization.yaml       # engagement reference, approver, validity window
  state.db                 # assets, services, tool runs, evidence, findings
  artifacts/<run-id>/      # immutable raw outputs and command metadata
  reports/                 # generated, versioned exports
  audit.jsonl              # append-only user and tool action log
```

### Non-negotiable controls

- Validate scope before queuing a job and again immediately before execution. Resolve
  domains at execution time; apply both allowlist and exclusions to every resulting IP.
- Require an active authorization record whose date window covers the run. A file merely
  existing is not sufficient.
- Separate passive and active adapters. Active jobs require a `--confirm-active` flag
  after the planner shows targets, commands, rate limits, and estimated impact.
- Invoke tools using argument arrays, never a shell string. Enforce per-tool timeouts,
  bounded concurrency, output-size limits, and cancellation.
- Append an audit event for planned, blocked, started, completed, failed, and cancelled
  jobs. Redact tokens, headers, and other secrets from logs and reports.
- Keep every raw artifact with its tool version, normalized record IDs, timestamp, and
  content hash. Reports must point back to evidence IDs.

## 4. Delivery plan

### Milestone 0 — Product and safety baseline

**Goal:** remove ambiguity before code is written.

- Define user roles, engagement assumptions, supported platforms, and data retention.
- Write ADRs for the decisions in section 2 and a threat model covering target input,
  DNS changes, tool compromise/output, API keys, artifacts, and report exports.
- Define the v1 command contract and JSON envelope: `status`, `data`, `warnings`,
  `errors`, `run_id`, and `schema_version`.
- Create representative authorized test fixtures: a local lab, canned tool outputs, and
  malformed/out-of-scope cases. Do not use public targets in automated tests.

**Exit criteria:** signed-off v1 scope, test environment, threat model, and CLI/data
contracts. No network-capable adapter work begins before this milestone exits.

### Milestone 1 — Foundation and policy engine

**Goal:** a safe, observable project skeleton.

- Scaffold package, console entry point, configuration loader, structured logging, linting,
  formatting, typing, test runner, and CI.
- Implement `init`, `doctor`, and `project status`.
- Implement versioned Pydantic models and SQLite migrations for Project, Asset, Service,
  ToolRun, Evidence, and Finding.
- Implement scope parsing for CIDRs, exact domains, approved URLs, exclusions, ports, and
  DNS resolution. Unit-test IPv4, IPv6, subdomains, redirects, DNS rebinding, and invalid
  input.
- Implement authorization validation, dry-run job plans, confirmation for active jobs,
  append-only audit events, and artifact storage.
- Implement runner and registry abstractions with a mock adapter only.

**Exit criteria:** a user can initialize a project, inspect a dry-run plan, have an
out-of-scope or expired-authorization plan rejected, and execute a mock job with complete
audit and evidence records.

### Milestone 2 — Asset discovery and service mapping

**Goal:** turn approved targets into traceable asset/service inventory.

- Add passive discovery adapters first, with source attribution and deduplication.
- Add one approved active port/service discovery adapter using conservative defaults,
  explicit target expansion, per-target rate limits, and the Milestone 1 confirmation flow.
- Store raw output before parsing; implement a versioned parser and fixture tests for each
  adapter.
- Merge discoveries only through deterministic identity rules; surface conflicts for review
  rather than silently overwriting values.
- Add `recon`, `scan`, `assets list`, and JSON output commands.

**Exit criteria:** against the local lab, the tool creates correct asset and service records,
retains raw evidence, respects exclusions, and has deterministic parser tests.

### Milestone 3 — Read-only enumeration and finding intake

**Goal:** enrich the inventory without automatically taking intrusive actions.

- Add read-only service and web enumeration adapters, one at a time, behind registry
  capability checks.
- Add template-based vulnerability detection only where the adapter supports safe checks;
  represent unverified output as an observation, not a confirmed finding.
- Implement finding lifecycle: draft → reviewed → accepted/rejected → exported.
- Require target, evidence reference, severity rationale, remediation, and reviewer for an
  accepted finding. Make CVSS optional but validate any supplied vector/version.
- Add correlation as an advisory that links services to public references; it must not offer
  automated execution paths.

**Exit criteria:** a reviewer can convert lab evidence into accepted/rejected findings and
can distinguish scanner observations from validated findings.

### Milestone 4 — Reporting and user experience

**Goal:** generate defensible, client-ready deliverables.

- Implement report assembly from accepted findings, scope, coverage, run dates, and evidence
  links.
- Produce Markdown, HTML, and JSON outputs from one report model; make templates versioned.
- Add executive summary, methodology, scope/limitations, severity summary, detailed
  findings, remediation, and evidence appendix.
- Provide clear terminal progress, machine-readable errors, and actionable `doctor`
  diagnostics for missing tools or unsupported versions.
- Perform accessibility and visual review on generated HTML and fixture reports.

**Exit criteria:** a fixture project produces equivalent, traceable reports in all three
formats, with redaction verified and no raw secret values present.

### Milestone 5 — Release hardening and pilot

**Goal:** validate that v1 operates reliably in a controlled assessment.

- Complete unit tests for policy, models, parsers, runner, redaction, and reporting.
- Run mock-binary integration tests and an end-to-end local-lab test in CI.
- Add dependency/license inventory, locked dependencies, static analysis, and release notes.
- Conduct a security review of subprocess use, path handling, config parsing, artifact
  permissions, redaction, and scope/authorization bypass attempts.
- Run a small approved pilot; capture usability defects, parser failures, and missing report
  fields before declaring v1.0.

**Exit criteria:** all critical/high pilot and security-review issues are resolved or accepted
by the product owner with documented mitigations; release runbook and support matrix exist.

## 5. Backlog sequencing rules

- Build the policy engine and mockable runner before any real tool adapter.
- Add one adapter per pull request, including fixtures, parser tests, version support, error
  handling, documentation, and a safety classification.
- Do not parallelize across targets until state writes are transactional and cancellation,
  rate limits, and artifacts are verified.
- Treat raw tool output as evidence and normalized output as a derived view; never discard the
  raw source when a parser changes.
- Keep report generation behind reviewed findings; scanner output alone must not appear as a
  confirmed client finding.

## 6. Quality gates and metrics

| Area | Release gate |
|---|---|
| Scope and authorization | 100% passing policy regression suite, including exclusion and DNS-change cases. |
| Tool adapters | Parser fixtures for each supported version; unsupported versions fail closed with guidance. |
| Execution | Dry-run never spawns a process; all real processes have timeout, cancellation, and recorded argv. |
| Evidence | Every accepted finding has evidence IDs and a reproducible source run. |
| Sensitive data | Redaction tests cover command logs, environment values, HTTP headers, artifacts, and all exports. |
| Reporting | Fixture report is reviewed for completeness, traceability, and rendering. |
| Reliability | End-to-end local-lab suite passes in CI; no real external target is required. |

Track: policy blocks versus approved runs, adapter success/parse-failure rate, report findings
without evidence (target: zero), and time from run completion to reviewed report.

## 7. Post-v1 roadmap

Prioritize adapters based on validated customer need and safe read-only operation: additional
asset sources, service enumerators, authenticated scanner integrations, report-template
customization, and role-based collaboration. Any future high-impact capability requires a
separate proposal documenting authorization controls, data handling, abuse cases, audit
requirements, and an independent security review.

## 8. Definition of Done for v1.0

v1.0 is complete when an authorized user can create a project, declare and validate scope,
plan and confirm approved discovery jobs, collect reproducible evidence into a durable
workspace, review findings, and export a traceable report—while unsafe, out-of-scope,
expired-authorization, unsupported, and dry-run operations reliably fail closed.
