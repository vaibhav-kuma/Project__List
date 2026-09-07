# Pentest Suite CLI — Architecture Design

**Goal:** A single, modular, phase-based command-line tool that orchestrates best-in-class
open-source security tools across the full penetration testing kill-chain, backed by a
stateful project workspace and a built-in reporting engine.

This design is derived from the [knowledge map](./knowledge_map.md) built from 14 reference
books (3,500+ pages of offensive-security methodology).

---

## 1. Design principles (from the corpus)

1. **Phase = command group.** Every book converges on a phased methodology. Map phases
   directly to top-level subcommands.
2. **Orchestrate, don't reimplement.** Tools (Nmap→Nessus→Metasploit→post-ex) are composable;
   the CLI wraps and chains them, normalizing output.
3. **Stateful workspace.** Track hosts, services, creds, loot, and pivots across a test
   (Playbook 2/3, Weidman). A project is the spine of every command.
4. **OSINT-first recon.** Passive before active (Playbook 3 "Before the Snap", WAHH Ch4).
5. **Web is first-class.** Largest theme in the corpus (1,193 mentions) → dedicated `web`
   group mirroring the WAHH chapter structure.
6. **Safe-by-default / scoped.** Every author stresses authorization, scope, rules of
   engagement. Enforce scope allowlists, dry-run mode, and explicit `--force` for active tests.
7. **Reporting built-in.** Findings with severity, evidence, PoC, remediation (Basics Ch8).
8. **Scriptable.** JSON output on every command for pipelining (Violent Python patterns).

---

## 2. Command structure

```
pentest <global-opts> <command> [subcommand] [args]

Global options:
  --project PATH      Project/workspace directory (default: ./pentest-project)
  --scope CIDR/DOMAIN Scope allowlist (repeatable); enforced everywhere
  --dry-run           Resolve and print commands without executing
  --json              Machine-readable output
  --config FILE       Config override
  --log LEVEL

Commands (one per methodology phase):
  init                Scaffold a new project workspace
  recon               Passive/active reconnaissance (OSINT-first)
    osint             theHarvester, recon-ng, Shodan, amass, sublist3r
    dns              dnsenum, dig, zone transfer attempts
    subdomains       passive + active subdomain enumeration
  scan                Port/service/OS discovery
    ports            nmap, masscan
    services         version/OS fingerprinting
  enum                Service & host enumeration
    smb              enum4linux, crackmapexec, smbclient
    snmp             snmpwalk, snmp-check
    web              banner/tech/endpoint discovery
  vuln                Vulnerability assessment
    scan             nessus/openvas/nuclei
    web              nikto, nuclei templates
    correlate        match findings → exploit DB (searchsploit)
  exploit             Exploitation
    msf              metasploit wrappers, resource scripts
    auto             suggest/run exploits from correlated findings
    password         hydra, john, hashcat (credential attacks)
  postex              Post-exploitation
    escalate         privilege escalation checks
    creds            mimikatz/responder/impacket credential ops
    lateral          lateral movement, pivot setup
    persist          persistence mechanisms
  web                 Web application testing (WAHH-aligned)
    map              crawl/spider, endpoint discovery (ffuf/gobuster)
    inject           sqlmap, manual injection helpers
    auth             auth/session/access-control tests
    xss              reflected/stored/DOM helpers
  wireless            aircrack-ng, wifite, bettercap
  social             gophish, SET, BeEF campaign helpers
  report              Generate findings report
    build            aggregate workspace → report
    findings         list/add findings
    export           markdown / HTML / JSON
```

---

## 3. Component architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLI (argparse/click)                   │
│                  Command router + global opts                 │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│                   Core Engine                                │
│  - Project manager (workspace state)                         │
│  - Scope validator (allowlist enforcement)                   │
│  - Runner (safe command exec, timeouts, dry-run)            │
│  - Tool registry (discover/verify installed tools)           │
│  - Output normalizer (parse tool output → structured JSON)   │
│  - Reporter (findings store → formatted reports)             │
└───────┬───────────┬───────────┬───────────┬──────────────────┘
        │           │           │           │
┌───────▼───┐ ┌─────▼─────┐ ┌───▼──────┐ ┌──▼──────────┐
│  Modules  │ │  Modules  │ │  Modules │ │  Modules   │
│  recon/   │ │ scan/enum │ │ vuln/    │ │ web/       │
│  scan/    │ │ /vuln     │ │ exploit/ │ │ wireless/  │
│  enum     │ │           │ │ postex   │ │ social     │
└───────────┘ └───────────┘ └─────────┘ └────────────┘
        │
┌───────▼──────────────────────────────────────────────────────┐
│              Tool integrations (external binaries)            │
│   nmap masscan nikto nuclei nessus openvas metasploit sqlmap  │
│   burp hydra john hashcat mimikatz responder impacket wpscan  │
│   theharvester recon-ng amass sublist3r shodan aircrack wifite│
│   bettercap gophish set beef crackmapexec enum4linux          │
└──────────────────────────────────────────────────────────────┘
```

**Core modules (language-agnostic; Python recommended for rapid tooling):**

- `core/project.py` — load/save project state (hosts, services, creds, findings, loot) as
  structured files (JSONL + tree of artifacts). One folder per target.
- `core/scope.py` — parse scope allowlist; `validate(target)` raises on out-of-scope.
- `core/runner.py` — execute external tools; capture stdout/stderr; support `--dry-run`
  (print generated command), timeouts, concurrency limits.
- `core/registry.py` — detect installed tools; surface missing deps with install hints.
- `core/normalize.py` — per-tool parsers converting raw output into the canonical
  `Finding` / `Host` / `Service` schema.
- `core/report.py` — aggregate findings; render markdown/HTML/JSON; severity scoring.

**Canonical data schema (workspace state):**

```yaml
project:
  name, scope: [CIDRs/domains], created, roe_file
targets:
  - host: 10.0.0.5
    services: [{port, proto, name, version, banner}]
    vulnerabilities: [finding_id...]
    credentials: [{user, hash, type, source}]
    loot: [path...]
findings:
  - id, title, severity, cvss, target, evidence, poc, remediation, refs
pivots:
  - from_host, method, to_host
```

---

## 4. Module → tool mapping (reconciled with knowledge map)

| Command | Tools (wrappers) | Canonical output |
|---------|------------------|------------------|
| recon osint | theHarvester, recon-ng, Shodan CLI, amass, sublist3r | emails, domains, hosts, URLs |
| recon dns | dnsenum, dig, fierce | subdomains, zone data |
| scan ports | nmap, masscan | open ports, services |
| enum smb/snmp | enum4linux, crackmapexec, smbclient, snmpwalk | shares, users, config |
| vuln scan | nuclei, nikto, nessus(openvas) API | raw vulns |
| vuln correlate | searchsploit | CVE→exploit mapping |
| exploit msf | metasploit (msfconsole -q -r) | sessions, loot |
| exploit password | hydra, john, hashcat | cracked creds |
| postex creds | mimikatz, responder, impacket | hashes, tickets |
| postex lateral | crackmapexec, psexec, ssh | pivots |
| web map | ffuf, gobuster, burp (headless) | endpoints, params |
| web inject | sqlmap, custom | injection points |
| web auth/xss | manual + helpers | findings |
| wireless | aircrack-ng, wifite, bettercap | handshakes, creds |
| social | gophish, SET, BeEF | campaigns |

---

## 5. Safety & compliance controls (non-negotiable)

- **Scope enforcement:** every target resolved against the allowlist; out-of-scope → abort.
- **Dry-run default for active modules:** `scan`, `exploit`, `postex` require explicit
  confirmation or `--force`; `recon` (passive) is the only default-safe active-vs-passive split.
- **Authorization gate:** `init` records a Rules-of-Engagement / authorization file path;
  commands refuse to run active tests without it.
- **Audit log:** every command, target, and tool invocation logged to the project.
- **No destructive payloads by default:** exploitation wrappers default to safe/check modes.

---

## 6. Implementation phases (→ plan)

1. **Skeleton** — CLI router, project workspace, scope validator, runner, dry-run.
2. **Recon + Scan** — OSINT and port-scan modules with output normalization.
3. **Enum + Vuln** — service enumeration, vuln scanning, correlation.
4. **Exploit + Postex** — Metasploit/password wrappers, post-ex credential ops.
5. **Web** — WAHH-aligned web testing modules.
6. **Wireless + Social** — optional domains.
7. **Reporting** — findings store, markdown/HTML/JSON export.
8. **Hardening** — safety gates, tests, docs.

---

## 7. Tech stack recommendation

- **Language:** Python 3.11+ (rich ecosystem, matches Violent Python patterns, fast to extend).
- **CLI framework:** `click` or `typer` (nested subcommands, JSON output, clean UX).
- **State:** filesystem-backed JSONL + artifact tree (no DB needed; portable, git-friendly).
- **Output:** `rich` for terminal, Jinja2 for HTML reports, `pydantic` for schemas.
- **Concurrency:** `asyncio` for parallel host scanning where safe.
- **Distribution:** pip package + Docker image (bundles common tools) for reproducibility.
