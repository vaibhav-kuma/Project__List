import type { FeaturedProject } from "@/lib/types";

/**
 * Curated featured projects, ranked by relevance to Vaibhav's professional identity.
 * All content below is derived from the public repositories and the resume.
 * No invented users, customers, deployments, or metrics.
 */
export const featuredProjects: FeaturedProject[] = [
  {
    slug: "soc-platform",
    repoName: "SOC_plateform",
    name: "SOC Platform",
    tagline: "AI-driven unified security operations platform",
    rank: 1,
    category: "Security Operations",
    status: "Active development · MVP modules implemented",
    visualization: "security-core",
    accent: "#22d3ee",
    accentSoft: "rgba(34,211,238,0.16)",
    summary: [
      "SOC Platform is a unified security operations platform that combines vulnerability assessment, threat detection, threat hunting, incident response, threat intelligence, and cloud security behind a single Burp Suite-inspired interface.",
      "The backend is decomposed into 15 FastAPI microservices — from Auth and Asset Discovery to EDR, NDR, an AI Copilot, and Predictive Analytics — connected through Kafka and backed by PostgreSQL, Elasticsearch, and Redis, with a React SPA on top.",
      "The platform demonstrates how AI, cybersecurity, backend engineering, and distributed systems fit together inside a modern Security Operations Center.",
    ],
    problem: [
      "Security operations work is fragmented across disconnected tools: scanners, EDR agents, SIEM consoles, ticketing, and threat-intel feeds each live in their own interface, forcing analysts to context-switch constantly.",
      "Correlating telemetry across endpoints, network, cloud, and identity requires glue that most small teams have to build by hand, and AI-assisted investigation is rarely integrated into the same workflow.",
    ],
    solution: [
      "A single platform where each SOC capability is an independent, replaceable FastAPI microservice — auth, asset discovery, vulnerability scanning, EDR, NDR, threat intelligence, hunting, incident response, MITRE mapping, cloud, identity, and email security.",
      "Kafka carries event streams between services so telemetry, detections, and alerts flow through one backbone, while PostgreSQL, Elasticsearch, and Redis handle state, search, and caching respectively.",
      "An AI Copilot service orchestrates LLMs (Google Gemini, OpenAI, or a local model via Ollama) for investigation assistance, and an Autonomous SOC service models auto-investigation workflows.",
    ],
    architecture: [
      {
        title: "Service mesh of 15 microservices",
        description:
          "Each SOC capability is its own FastAPI service with a dedicated port (8001–8015), keeping blast radius small and letting every capability evolve independently.",
        items: [
          "Auth — JWT, RBAC, MFA (TOTP)",
          "Asset Discovery — Nmap-based host/network/cloud discovery",
          "Vulnerability Scanner — Nuclei + CVE detection",
          "EDR — Sysmon/Sigma-driven endpoint telemetry",
          "NDR — network flow analysis + beacon detection",
          "Threat Intelligence — IOC management and enrichment",
          "Hunting — AI-assisted threat hunting",
          "Incident Response — playbooks and response workflows",
          "MITRE Mapper — ATT&CK mapping and coverage heatmaps",
          "Cloud Security — AWS/Azure/GCP posture monitoring",
          "Identity, Email, AI Copilot, Autonomous SOC, Predictive Analytics",
        ],
      },
      {
        title: "Event & data backbone",
        description:
          "Kafka is the shared event bus between services; PostgreSQL stores structured state, Elasticsearch stores searchable telemetry, and Redis provides caching.",
        items: [
          "Apache Kafka event streams between services",
          "PostgreSQL for relational state",
          "Elasticsearch for log/telemetry search",
          "Redis for caching and hot state",
        ],
      },
      {
        title: "Frontend & infrastructure",
        description:
          "A React + TypeScript SPA with TailwindCSS, Recharts, and ShadCN presents the unified console; the platform is containerized with Docker and orchestrated on Kubernetes with Traefik.",
        items: [
          "React + TypeScript + TailwindCSS SPA",
          "Docker Compose for the infrastructure layer",
          "Kubernetes + Traefik for orchestration and routing",
        ],
      },
    ],
    architectureFlow: [
      "Telemetry sources (hosts, endpoints, network, cloud, identity)",
      "Ingestion microservices (Asset Discovery, EDR, NDR, Cloud)",
      "Kafka event backbone",
      "Detection & enrichment (Scanner, Threat Intel, MITRE Mapper)",
      "AI layer (Copilot, Autonomous SOC, Predictive Analytics)",
      "Incident Response playbooks & unified React console",
    ],
    features: [
      {
        title: "Unified SOC console",
        description:
          "One Burp Suite-inspired interface across vulnerability, detection, hunting, and response workflows.",
      },
      {
        title: "AI-assisted investigation",
        description:
          "AI Copilot service with Gemini, OpenAI, and local-LLM (Ollama) integration for analyst workflows.",
      },
      {
        title: "MITRE ATT&CK mapping",
        description:
          "Dedicated MITRE Mapper service producing TTP mapping and coverage heatmaps.",
      },
      {
        title: "Endpoint & network detection",
        description:
          "EDR service built on Sysmon/Sigma telemetry; NDR service with flow analysis and beacon detection.",
      },
      {
        title: "Vulnerability management",
        description:
          "Nuclei-based scanning with CVE detection and patch validation as a standalone service.",
      },
      {
        title: "Incident response automation",
        description:
          "Playbooks, response actions, and auto-investigation workflows via the Autonomous SOC service.",
      },
    ],
    stack: [
      { group: "Backend", items: ["Python 3.12", "FastAPI", "Uvicorn"] },
      {
        group: "Frontend",
        items: ["React", "TypeScript", "TailwindCSS", "Recharts", "ShadCN"],
      },
      { group: "Data", items: ["PostgreSQL", "Elasticsearch", "Redis"] },
      { group: "Messaging", items: ["Apache Kafka"] },
      { group: "AI", items: ["Google Gemini", "OpenAI", "Ollama (local LLM)"] },
      { group: "Infrastructure", items: ["Docker", "Kubernetes", "Traefik"] },
      { group: "Security", items: ["JWT", "RBAC", "MFA (TOTP)", "Sigma", "Nuclei", "Nmap"] },
    ],
    securityCapabilities: [
      "JWT authentication with RBAC and TOTP MFA",
      "Sigma-rule-driven endpoint detection (EDR)",
      "Network beacon detection (NDR)",
      "IOC management and feed aggregation",
      "MITRE ATT&CK TTP mapping and coverage visibility",
      "Multi-cloud posture monitoring (AWS / Azure / GCP)",
      "Phishing / BEC detection service for email security",
    ],
    aiCapabilities: [
      "LLM orchestration across Gemini, OpenAI, and local models",
      "AI-assisted threat hunting queries",
      "Autonomous investigation workflows",
      "ML forecasting and anomaly detection service",
    ],
    engineeringDecisions: [
      {
        title: "One capability, one service",
        detail:
          "Splitting the SOC into 15 bounded services keeps each domain independently testable and deployable, and mirrors how real SOC tooling is procured and replaced.",
      },
      {
        title: "Kafka as the nervous system",
        detail:
          "Routing telemetry and detections through Kafka decouples producers from consumers and lets analytics, alerting, and AI services subscribe to the same streams.",
      },
      {
        title: "Local-LLM option",
        detail:
          "Supporting Ollama alongside hosted providers keeps AI investigation usable in air-gapped or privacy-sensitive environments.",
      },
      {
        title: "Infrastructure as code from day one",
        detail:
          "Docker Compose for local infrastructure and Kubernetes/Traefik manifests keep the environment reproducible across machines.",
      },
    ],
    results: [
      {
        label: "Microservices implemented",
        value: "15",
        note: "Auth through Predictive Analytics, each with a dedicated service",
      },
      {
        label: "MVP modules delivered",
        value: "10",
        note: "From auth and asset discovery to cloud posture monitoring",
      },
      {
        label: "ATT&CK coverage view",
        value: "Heatmap",
        note: "Technique-level mapping produced by the MITRE Mapper service",
      },
    ],
    future: [
      "Expand NDR protocol coverage and add TLS inspection metadata analysis",
      "Deepen autonomous playbooks with approval gates and audit trails",
      "Add tenant isolation and multi-organization support",
      "Federated search across Elasticsearch indices for cross-case hunting",
    ],
    githubUrl: "https://github.com/vaibhav-kuma/SOC_plateform",
    languages: ["Python", "TypeScript"],
    topics: [
      "soc",
      "security-operations",
      "fastapi",
      "microservices",
      "kafka",
      "elasticsearch",
      "mitre-att&ck",
      "llm",
      "edr",
      "ndr",
    ],
    updatedAt: "2026-07-27",
    stars: 0,
  },
  {
    slug: "legacy-lift-ai",
    repoName: "legacy-lift-ai",
    name: "LegacyLift AI",
    tagline: "Enterprise SaaS for automated legacy application modernization",
    rank: 2,
    category: "AI Engineering",
    status: "Documented production architecture · core modules implemented",
    visualization: "ai-transform",
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.16)",
    summary: [
      "LegacyLift AI is an enterprise SaaS concept for automated legacy application modernization using AI agents: legacy code enters the system, agents analyze it, and refactored, modernized output is produced with engineering guardrails.",
      "The repository pairs a NestJS backend with production-grade documentation — system architecture, deployment on Docker and Kubernetes, horizontal scaling with HPA, performance and cost optimization, backup policy, and a disaster recovery plan.",
      "A dedicated encryption module implements AES-256-GCM field-level encryption with HKDF key derivation, per-tenant key management, key rotation, and PII detection and masking.",
    ],
    problem: [
      "Legacy applications accumulate technical debt: outdated frameworks, missing tests, undocumented dependencies, and security-sensitive patterns that are risky to touch.",
      "Manual modernization is slow and error-prone, and enterprises need a repeatable, secure pipeline — not ad-hoc refactoring — before AI-assisted transformation can be trusted.",
    ],
    solution: [
      "Model modernization as a pipeline: ingestion of legacy artifacts, AI-agent-driven analysis, refactoring plans, and modernized output — orchestrated by a NestJS API backend.",
      "Back the pipeline with production operations documentation: component descriptions, data flows, network topology, monitoring, CI/CD, HA design, rollback, and DR runbooks.",
      "Treat tenant data protection as a first-class module: field-level AES-256-GCM encryption, HKDF key derivation, per-tenant keys cached in Redis, KMS provider support, and PII masking.",
    ],
    architecture: [
      {
        title: "Modernization pipeline",
        description:
          "Legacy source enters the platform, is analyzed by AI agents, and exits as modernized code with review artifacts.",
        items: [
          "Artifact ingestion and parsing",
          "AI-agent analysis of structure and dependencies",
          "Refactoring and modernization passes",
          "Modernized output with transformation records",
        ],
      },
      {
        title: "NestJS application backend",
        description:
          "A modular NestJS API hosts the core services, including a self-contained encryption module with service, key-management, and PII layers.",
        items: [
          "encryption.module.ts — global module exporting encryption services",
          "encryption.service.ts — AES-256-GCM field-level encryption, HKDF derivation, streaming encryption, key rotation",
          "key-management.service.ts — per-tenant keys, Redis cache with 5-minute TTL, KMS provider support, revocation",
          "pii.service.ts — PII detection, masking, and anonymization",
        ],
      },
      {
        title: "Production operations design",
        description:
          "The repository documents deployment and operations as if the system were running in production: Docker, Kubernetes, CI/CD, autoscaling, backups, and DR.",
        items: [
          "Kubernetes deployment with HPA policies and graceful shutdown",
          "Probes, PDBs, and resource limits",
          "Backup schedule, retention, encryption, and recovery procedures",
          "Disaster recovery roster, severity matrix, and failover runbooks",
        ],
      },
    ],
    architectureFlow: [
      "Legacy application artifacts",
      "Ingestion & parsing",
      "AI agent analysis",
      "Refactoring / modernization engine",
      "Modernized code + reports",
      "Observability, backup & DR layer",
    ],
    features: [
      {
        title: "AI-agent modernization",
        description:
          "Agent-driven analysis and transformation of legacy application code into modern structures.",
      },
      {
        title: "Field-level encryption",
        description:
          "AES-256-GCM with HKDF key derivation and streaming encryption for large payloads.",
      },
      {
        title: "Per-tenant key management",
        description:
          "Tenant-scoped keys with Redis caching, KMS provider support, rotation, and revocation.",
      },
      {
        title: "PII protection",
        description:
          "Detection, masking, and anonymization of personally identifiable information.",
      },
      {
        title: "Horizontal scaling design",
        description:
          "HPA configuration, probes, PDBs, and graceful shutdown documented for Kubernetes.",
      },
      {
        title: "Cost & performance engineering",
        description:
          "Documented tuning strategy across database, API, frontend, workers, caching, and AI costs.",
      },
    ],
    stack: [
      { group: "Backend", items: ["TypeScript", "NestJS", "Node.js"] },
      { group: "Security", items: ["AES-256-GCM", "HKDF", "KMS", "PII masking"] },
      { group: "Data", items: ["Redis (key cache)", "PostgreSQL (per docs)"] },
      { group: "Infrastructure", items: ["Docker", "Kubernetes", "HPA", "CI/CD"] },
      { group: "Operations", items: ["Monitoring", "Backup policy", "DR runbooks"] },
    ],
    securityCapabilities: [
      "AES-256-GCM field-level encryption with key rotation",
      "HKDF-based key derivation",
      "Per-tenant key isolation with revocation",
      "PII detection, masking, and anonymization",
      "Secrets handling documented for CI/CD deployment",
    ],
    aiCapabilities: [
      "AI-agent-driven code analysis and refactoring",
      "Modernization planning with transformation records",
      "LLM-assisted documentation of legacy behavior",
    ],
    engineeringDecisions: [
      {
        title: "Encryption as a module, not a patch",
        detail:
          "Encryption, key management, and PII handling are isolated NestJS services so cryptography stays auditable and replaceable (e.g., swapping KMS providers).",
      },
      {
        title: "Document operations before scale",
        detail:
          "Backup, DR, and scaling runbooks are written as part of the platform definition, reflecting production engineering habits rather than demo-app shortcuts.",
      },
      {
        title: "Redis as a bounded key cache",
        detail:
          "Tenant keys are cached with an explicit 5-minute TTL to balance latency against key-compromise exposure.",
      },
    ],
    results: [
      {
        label: "Architecture documents",
        value: "Production set",
        note: "Architecture, deployment, scaling, cost, backup, and DR guides",
      },
      {
        label: "Encryption primitive",
        value: "AES-256-GCM",
        note: "Field-level encryption with HKDF derivation and rotation",
      },
      {
        label: "Tenant isolation",
        value: "Per-tenant keys",
        note: "Cached in Redis with TTL, revocable, KMS-backed",
      },
    ],
    future: [
      "Wire the modernization pipeline to additional language ecosystems",
      "Add automated test-generation for modernized modules",
      "Implement live telemetry to validate HA and HPA assumptions",
      "Expand KMS provider integrations beyond the documented interface",
    ],
    githubUrl: "https://github.com/vaibhav-kuma/legacy-lift-ai",
    languages: ["TypeScript"],
    topics: [
      "legacy-modernization",
      "ai-agents",
      "saas",
      "nestjs",
      "encryption",
      "kubernetes",
      "multi-tenant",
    ],
    updatedAt: "2026-07-20",
    stars: 0,
  },
  {
    slug: "vadt",
    repoName: "VADT",
    name: "VADT — Threat Detection Dashboard",
    tagline: "Real-time process monitoring, detection, and MITRE ATT&CK tagging",
    rank: 3,
    category: "Threat Detection",
    status: "Open source · Apache-2.0 · Dockerized",
    visualization: "threat-radar",
    accent: "#34d399",
    accentSoft: "rgba(52,211,153,0.16)",
    summary: [
      "VADT is a full-stack threat detection tool: a Python detector engine watches running processes in real time, classifies suspicious behavior against MITRE ATT&CK categories, and pushes alerts to a Flask API.",
      "Alerts are stored in MongoDB, visualized in a React dashboard (attack type and severity), exported to CSV, and forwarded to Splunk via the HTTP Event Collector or by SMTP email.",
      "The project is the applied core of the AI-powered vulnerability detection engine described in Vaibhav's resume — detection rules validated through simulated attack scenarios.",
    ],
    problem: [
      "Endpoint visibility is often limited to heavyweight EDR products; small teams and labs need a lightweight way to see suspicious processes as they happen.",
      "Raw process events are hard to triage without an attacker-knowledge framework — alerts need to be categorized in ATT&CK terms to be actionable.",
    ],
    solution: [
      "A Python detector process continuously inspects process activity and matches it against a category map (attack_categories.json) that tags behavior with MITRE ATT&CK TTPs.",
      "A Flask API receives detections, persists them in MongoDB, serves them to the React dashboard, and exports them to CSV for offline review.",
      "Alerting is multi-channel: Splunk HEC for SIEM ingestion and SMTP email for direct notification — both configured via environment variables.",
    ],
    architecture: [
      {
        title: "Detection engine (backend)",
        description:
          "detector.py monitors process activity and maps suspicious behavior onto ATT&CK categories using attack_categories.json.",
        items: [
          "Real-time process inspection",
          "ATT&CK / TTP categorization",
          "Structured alert records with severity",
        ],
      },
      {
        title: "API & storage (backend)",
        description:
          "app.py exposes the Flask API used by the dashboard; exporter.py produces CSV exports from the MongoDB alerts collection.",
        items: [
          "Flask REST endpoints for alerts",
          "MongoDB persistence (threat_dashboard.alerts)",
          "CSV export pipeline",
        ],
      },
      {
        title: "Visualization (frontend)",
        description:
          "A React dashboard renders attack-type and severity visualizations over live alert data served by the API.",
        items: [
          "Attack-type distribution charts",
          "Severity breakdown",
          "Live alert feed",
        ],
      },
      {
        title: "Alerting & deployment",
        description:
          "Alerts fan out to Splunk (HEC) and email (SMTP). The whole tool ships with a Dockerfile and secrets stay in .env.",
        items: [
          "Splunk HTTP Event Collector integration",
          "SMTP email alerts",
          "Docker build & run with --env-file",
        ],
      },
    ],
    architectureFlow: [
      "Process activity on the monitored host",
      "Python detector engine",
      "MITRE ATT&CK / TTP tagging",
      "Flask API",
      "MongoDB storage + React dashboard",
      "Splunk HEC · SMTP email · CSV export",
    ],
    features: [
      {
        title: "Real-time process detection",
        description: "Continuous detection of suspicious processes on the host.",
      },
      {
        title: "MITRE ATT&CK tagging",
        description: "Detections are categorized by ATT&CK technique and TTP.",
      },
      {
        title: "Severity-aware dashboard",
        description: "Visualizations by attack type and severity in a React UI.",
      },
      {
        title: "Dual-channel alerting",
        description: "Splunk HEC for SIEM workflows and SMTP for direct email alerts.",
      },
      {
        title: "Exportable evidence",
        description: "CSV exports plus JSON alert logs for offline analysis.",
      },
      {
        title: "Containerized deployment",
        description: "Single Docker image; secrets supplied via .env at runtime.",
      },
    ],
    stack: [
      { group: "Detection", items: ["Python 3.10+"] },
      { group: "API", items: ["Flask"] },
      { group: "Frontend", items: ["React", "Node.js 18+"] },
      { group: "Data", items: ["MongoDB (local or Atlas)"] },
      { group: "Alerting", items: ["Splunk HEC", "SMTP"] },
      { group: "Ops", items: ["Docker", ".env secrets"] },
      { group: "Framework", items: ["MITRE ATT&CK"] },
    ],
    securityCapabilities: [
      "Host process monitoring and suspicious-behavior detection",
      "MITRE ATT&CK technique classification",
      "Alerting into Splunk for correlation with other sources",
      "Secrets hygiene: .env-managed credentials, never committed",
    ],
    aiCapabilities: [
      "Rule-based detection augmented by category modelling",
      "Validated through simulated attack scenarios (per resume testing notes)",
    ],
    engineeringDecisions: [
      {
        title: "Detector as a standalone process",
        detail:
          "Running detector.py separately from the API keeps collection resilient — the feed continues even if the dashboard layer restarts.",
      },
      {
        title: "ATT&CK as the schema",
        detail:
          "Tagging at detection time (attack_categories.json) means downstream consumers — dashboard, Splunk, CSV — all share the same analyst language.",
      },
      {
        title: "Boring, portable storage",
        detail:
          "MongoDB keeps the alert schema flexible while remaining trivial to run locally or on Atlas for demos.",
      },
    ],
    results: [
      {
        label: "Detection validation",
        value: "Simulated attacks",
        note: "Rules tested against simulated attack scenarios",
      },
      {
        label: "Detection accuracy gain",
        value: "+35%",
        note: "Self-reported in resume after introducing MITRE ATT&CK tagging",
      },
      {
        label: "License",
        value: "Apache-2.0",
        note: "Open-sourced for reuse and contribution",
      },
    ],
    future: [
      "Extend the category map to broader ATT&CK technique coverage",
      "Add agent-based collection from multiple hosts",
      "Introduce anomaly scoring alongside rule matches",
      "Package the detector as a service with health monitoring",
    ],
    githubUrl: "https://github.com/vaibhav-kuma/VADT",
    languages: ["Python", "JavaScript"],
    topics: [
      "threat-detection",
      "mitre-att&ck",
      "edr",
      "flask",
      "react",
      "mongodb",
      "splunk",
      "process-monitoring",
    ],
    updatedAt: "2026-08-01",
    stars: 1,
    license: "Apache-2.0",
  },
  {
    slug: "dark-exposure",
    repoName: "DarkExposure",
    name: "DarkExposure",
    tagline: "Autonomous dark-web threat intelligence & exposure analysis",
    rank: 4,
    category: "Threat Intelligence",
    status: "Research build · multi-tier intelligence architecture",
    visualization: "threat-globe",
    accent: "#818cf8",
    accentSoft: "rgba(129,140,248,0.16)",
    summary: [
      "DarkExposure is a threat-intelligence platform for monitoring exposure across dark-web surfaces. It is architected as a multi-tier ecosystem: a Tor-hidden portal, a Tor-only intelligence REST API, a leak search index, and a Telegram bot for on-demand breach checks.",
      "Reconnaissance relies on automated Tor circuit rotation (NEWNYM signalling), OCR-based indexing of forum screenshots, and automated evidence bundling — encrypted ZIP packages with generated PDF incident reports.",
      "The platform follows a zero-trust, zero-logs posture: no public IP exposure, no plaintext passwords, no persistent access logs.",
    ],
    problem: [
      "Stolen data and breach chatter surface on dark-web forums, marketplaces, and Telegram long before most organizations learn about their exposure.",
      "Manual monitoring is slow, unsafe to perform without operational-security discipline, and hard to turn into structured, shareable intelligence.",
    ],
    solution: [
      "Automate reconnaissance with scheduled Tor circuit rotation so collection identity changes continuously, and index forum content — including screenshots — with computer-vision OCR.",
      "Expose findings through tiered interfaces: a hidden-service SaaS portal, a Tor-only API for SOC/analyst integrations, a searchable leak index, and a Telegram bot for quick checks.",
      "Package evidence automatically: encrypted ZIP bundles with generated PDF incident reports, ready to hand to an incident-response team.",
    ],
    architecture: [
      {
        title: "Multi-tier intelligence ecosystem",
        description:
          "Four surfaces share one intelligence core, each aimed at a different consumer.",
        items: [
          "Hidden-service (.onion) SaaS portal with magic-link authentication",
          "Tor-only REST intelligence API for SOC teams and integrations",
          "Leak search index with real-time risk scoring",
          "Telegram bot for instant breach checks",
        ],
      },
      {
        title: "Collection & enrichment",
        description:
          "Automated reconnaissance with rotating Tor circuits and OCR indexing of visual content.",
        items: [
          "NEWNYM circuit rotation on a short interval during reconnaissance",
          "OCR-based screenshot indexing of forum content",
          "Risk scoring applied to indexed records",
        ],
      },
      {
        title: "Evidence & response",
        description:
          "Findings are bundled into incident-ready artifacts automatically.",
        items: [
          "Encrypted ZIP evidence packages",
          "Generated PDF incident reports",
          "Takedown/containment playbooks as documented workflows",
        ],
      },
    ],
    architectureFlow: [
      "Dark-web forums, marketplaces, Telegram channels",
      "Tor-rotated reconnaissance collectors",
      "OCR + indexing + risk scoring",
      "Intelligence core",
      ".onion portal · Tor-only API · leak search · Telegram bot",
      "Encrypted evidence bundles + PDF reports",
    ],
    features: [
      {
        title: "Autonomous circuit rotation",
        description: "Tor NEWNYM signalling rotates collection identity during reconnaissance.",
      },
      {
        title: "OCR-driven indexing",
        description: "Computer-vision OCR converts forum screenshots into searchable records.",
      },
      {
        title: "Leak search with risk scoring",
        description: "Indexed records are scored for exposure risk and made searchable.",
      },
      {
        title: "Evidence bundling",
        description: "Encrypted ZIP packages with generated PDF incident reports.",
      },
      {
        title: "Tiered access model",
        description: "Portal, API, public search, and bot — each with its own auth boundary.",
      },
      {
        title: "Zero-trust posture",
        description: "No public IP exposure, no plaintext passwords, no persistent access logs.",
      },
    ],
    stack: [
      { group: "Core", items: ["PHP"] },
      { group: "Anonymity", items: ["Tor", ".onion hidden services", "NEWNYM rotation"] },
      { group: "Intelligence", items: ["OCR / computer vision", "Risk scoring"] },
      { group: "Interfaces", items: ["REST API", "Telegram bot", "Web portal"] },
      { group: "Evidence", items: ["Encrypted ZIP", "PDF report generation"] },
    ],
    securityCapabilities: [
      "Operational-security-first reconnaissance via Tor",
      "Zero-trust, zero-logs platform posture",
      "Magic-link authentication on the hidden portal",
      "Encrypted evidence handling",
    ],
    aiCapabilities: [
      "Computer-vision OCR for indexing visual content",
      "Automated risk scoring of indexed records",
    ],
    engineeringDecisions: [
      {
        title: "Tiered surfaces, one core",
        detail:
          "Separating portal, API, search, and bot lets each interface enforce its own authentication and abuse limits while sharing the same intelligence data.",
      },
      {
        title: "Rotation as a default",
        detail:
          "Continuous circuit rotation during reconnaissance reduces correlation risk for the operator — a deliberate opsec default, not an option.",
      },
      {
        title: "Evidence-first output",
        detail:
          "Findings are produced as transferable artifacts (encrypted ZIP + PDF), because intelligence that cannot be handed off safely has limited value.",
      },
    ],
    results: [
      {
        label: "Collection surfaces",
        value: "4 tiers",
        note: "Portal, Tor-only API, leak search, Telegram bot",
      },
      {
        label: "Opsec posture",
        value: "Zero-trust / zero-logs",
        note: "Design constraint applied across the platform",
      },
      {
        label: "Circuit rotation",
        value: "NEWNYM",
        note: "Automated Tor identity rotation during reconnaissance",
      },
    ],
    future: [
      "Broaden source coverage with additional marketplace and channel collectors",
      "Add deduplication and entity resolution across indexed leaks",
      "Integrate results with SOC tooling via standard threat-intel formats (STIX/TAXII)",
      "Formalize analyst access controls and audit trails",
    ],
    githubUrl: "https://github.com/vaibhav-kuma/DarkExposure",
    languages: ["PHP"],
    topics: [
      "threat-intelligence",
      "dark-web",
      "osint",
      "tor",
      "ocr",
      "exposure-analysis",
      "leak-monitoring",
    ],
    updatedAt: "2026-02-27",
    stars: 0,
  },
  {
    slug: "threat-detection-monitoring-dashboard",
    repoName: "Threat-Detection-Monitoring-Dashboard",
    name: "Threat Detection Monitoring Dashboard",
    tagline: "Grafana-based observability for threat detection & ML monitoring",
    rank: 5,
    category: "Observability",
    status: "Dockerized reference deployment",
    visualization: "monitoring-grid",
    accent: "#f472b6",
    accentSoft: "rgba(244,114,182,0.14)",
    summary: [
      "A comprehensive Grafana dashboard for threat detection monitoring: key security metrics, a MITRE ATT&CK technique heatmap, live alert feeds, ML model performance, and system health — all provisioned automatically.",
      "The stack couples Prometheus for metrics, MongoDB for alerts and events, InfluxDB for time-series telemetry, and Elasticsearch for log aggregation, brought together behind Docker Compose with auto-provisioned data sources and alert rules.",
      "The dashboard treats the detection system itself as a monitored workload: model accuracy, false-positive rate, inference latency, agent status, and Kafka consumer lag all sit next to the security metrics.",
    ],
    problem: [
      "Security teams often see alerts but not the health of the detection pipeline behind them — a silent agent or a lagging consumer can blind a SOC without any alert firing.",
      "ML-based detections add another layer that needs monitoring: accuracy drift, false-positive rate, and inference latency are operational signals, not afterthoughts.",
    ],
    solution: [
      "Provision a single Grafana dashboard covering four planes: security metrics (threats, critical alerts, detection accuracy, MTTD), ATT&CK visibility, ML performance, and infrastructure health.",
      "Use purpose-fit stores per data type: Prometheus for metrics, MongoDB for alert documents, InfluxDB for time series, Elasticsearch for logs — all wired via docker-compose.",
      "Ship alert rules with the dashboard: critical threats, high false-positive rate, agent downtime, and excessive MTTD route to email, Slack, or PagerDuty.",
    ],
    architecture: [
      {
        title: "Data source layer",
        description:
          "Each store serves a distinct telemetry class; Grafana queries all of them.",
        items: [
          "Prometheus — metrics collection and alerting",
          "MongoDB — alerts, events, MITRE technique documents",
          "InfluxDB — process, network, and system time series",
          "Elasticsearch — log aggregation and search",
        ],
      },
      {
        title: "Dashboard panels",
        description:
          "Panels are grouped into security overview, ATT&CK heatmap, real-time feed, ML performance, and system health.",
        items: [
          "Total threats, critical alerts, detection accuracy, MTTD",
          "MITRE ATT&CK technique frequency heatmap",
          "Live alerts, process activity, network connections map",
          "Model accuracy, false-positive rate, inference latency",
          "Agent status, Kafka lag, DB performance, API response times",
        ],
      },
      {
        title: "Alerting layer",
        description:
          "Grafana alert rules are provisioned with the deployment and route to notification channels.",
        items: [
          "Critical threats detected",
          "High false-positive rate (>15%)",
          "Security agent down",
          "High MTTD (>10 minutes)",
          "Channels: email, Slack, PagerDuty",
        ],
      },
    ],
    architectureFlow: [
      "Detection agents & security telemetry",
      "Prometheus · MongoDB · InfluxDB · Elasticsearch",
      "Grafana data source provisioning",
      "Dashboard panels (security · ATT&CK · ML · health)",
      "Alert rules → email / Slack / PagerDuty",
      "Kafka consumer lag & system health feedback",
    ],
    features: [
      {
        title: "Security KPI panels",
        description: "Threat totals, critical alerts, detection accuracy, and MTTD at a glance.",
      },
      {
        title: "MITRE ATT&CK heatmap",
        description: "Interactive technique-frequency visualization for TTP visibility.",
      },
      {
        title: "ML performance tracking",
        description: "Model accuracy, false-positive rate, and inference latency panels.",
      },
      {
        title: "Pipeline health",
        description: "Agent status, Kafka consumer lag, database and API health.",
      },
      {
        title: "Auto provisioning",
        description: "Data sources and alert rules provisioned on first docker-compose up.",
      },
      {
        title: "Environment filtering",
        description: "Variables for environment, severity, system, and time range.",
      },
    ],
    stack: [
      { group: "Visualization", items: ["Grafana"] },
      { group: "Metrics", items: ["Prometheus"] },
      { group: "Time series", items: ["InfluxDB"] },
      { group: "Alert store", items: ["MongoDB"] },
      { group: "Logs", items: ["Elasticsearch"] },
      { group: "Streaming", items: ["Kafka (consumer lag metrics)"] },
      { group: "Deployment", items: ["Docker Compose", "Grafana provisioning"] },
      { group: "Scripting", items: ["Python"] },
    ],
    securityCapabilities: [
      "Threat and alert visibility with severity filtering",
      "ATT&CK technique-level detection coverage view",
      "Alerting on detection-pipeline failure modes (agent down, MTTD breach)",
      "Security hardening guidance: credential rotation, TLS, port restriction",
    ],
    aiCapabilities: [
      "ML model performance monitoring (accuracy, FP rate, latency)",
      "Detection accuracy as a first-class operational metric",
    ],
    engineeringDecisions: [
      {
        title: "Right store per telemetry type",
        detail:
          "Metrics, time series, documents, and logs each go to the store designed for them — Grafana unifies them instead of forcing one store to do everything.",
      },
      {
        title: "Monitor the monitor",
        detail:
          "Kafka lag, agent heartbeat, and API latency panels treat the detection pipeline as a production system whose silence is itself an incident.",
      },
      {
        title: "Provisioned, not clicked",
        detail:
          "Dashboards, data sources, and alert rules are deployed as configuration, making the whole observability stack reproducible from docker-compose.",
      },
    ],
    results: [
      {
        label: "Data sources integrated",
        value: "4",
        note: "Prometheus, MongoDB, InfluxDB, Elasticsearch",
      },
      {
        label: "Alert rules shipped",
        value: "4 classes",
        note: "Critical threats, FP rate, agent status, MTTD",
      },
      {
        label: "Deployment",
        value: "1 command",
        note: "docker-compose up -d provisions the full stack",
      },
    ],
    future: [
      "Add SLO panels (detection availability, alert latency budgets)",
      "Correlate ATT&CK heatmap with live incident counts",
      "Introduce anomaly detection over the monitoring metrics themselves",
      "Export snapshots for automated weekly security reporting",
    ],
    githubUrl: "https://github.com/vaibhav-kuma/Threat-Detection-Monitoring-Dashboard",
    languages: ["Python"],
    topics: [
      "grafana",
      "prometheus",
      "observability",
      "threat-detection",
      "mitre-att&ck",
      "ml-monitoring",
      "elasticsearch",
      "kafka",
    ],
    updatedAt: "2025-11-21",
    stars: 0,
  },
];

export const featuredBySlug = new Map(featuredProjects.map((p) => [p.slug, p]));

export function getFeaturedProject(slug: string): FeaturedProject | undefined {
  return featuredBySlug.get(slug);
}
