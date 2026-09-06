import type { RepositoryRecord } from "@/lib/types";

/**
 * Secondary (non-featured) repositories — curated snapshot of the GitHub profile.
 * Snapshot date: 2026-08-23. Live counts are refreshed client-side from the
 * GitHub REST API where possible (see lib/github.ts).
 */
export const secondaryRepositories: RepositoryRecord[] = [
  {
    name: "SIEM",
    description:
      "Lightweight, containerized Security Information and Event Management system built with the ELK stack for real-time security monitoring and threat detection.",
    language: "Python",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/SIEM",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Security Operations",
  },
  {
    name: "Shadowatch",
    description:
      "AI-powered dark-web intelligence scout: scrapers, leak analyzer, LLM summarization and Telegram alerting in a modular pipeline.",
    language: "Python",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/Shadowatch",
    fork: false,
    updatedAt: "2025-11-21",
    category: "Threat Intelligence",
  },
  {
    name: "Anomaly-Detection-",
    description:
      "Custom GUI-based NIDS (Network Intrusion Detection System) with stream-follow capability for HTTP/2 and TLS/TCP.",
    language: "Python",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/Anomaly-Detection-",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Threat Detection",
  },
  {
    name: "Antivirus_scanner",
    description:
      "Antivirus scanner that detects malware using YARA rules for signature matching.",
    language: "Python",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/Antivirus_scanner",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Security Tooling",
  },
  {
    name: "-AI-driven-security-monitoring",
    description: "AI-driven security monitoring experiments and pipelines.",
    language: "Python",
    stars: 2,
    url: "https://github.com/vaibhav-kuma/-AI-driven-security-monitoring",
    fork: false,
    updatedAt: "2025-11-20",
    category: "AI + Security",
  },
  {
    name: "Security_log_Analyser",
    description: "Security log analysis tooling for parsing and correlating event logs.",
    language: "Python",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/Security_log_Analyser",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Security Operations",
  },
  {
    name: "VulnerabilityAnalyser",
    description: "Vulnerability analysis tooling for assessment workflows.",
    language: "Python",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/VulnerabilityAnalyser",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Security Tooling",
  },
  {
    name: "Payload-Generator",
    description:
      "Fast, customizable payload generation for penetration testing and security research across multiple attack vectors.",
    language: "Python",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/Payload-Generator",
    fork: false,
    updatedAt: "2026-01-21",
    category: "Security Tooling",
  },
  {
    name: "Password_Security_Checker",
    description:
      "Password strength analysis: length gates, character variety, common-password detection, and pattern recognition.",
    language: "Python",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/Password_Security_Checker",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Security Tooling",
  },
  {
    name: "Website_Security_Scraper-",
    description:
      "Python web scraper for initial security reconnaissance — collects security-relevant signals for ethical-hacking assessments.",
    language: "Python",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/Website_Security_Scraper-",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Security Tooling",
  },
  {
    name: "Network-Monitoring-System",
    description: "Network monitoring system implementation in C#.",
    language: "C#",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/Network-Monitoring-System",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Networking",
  },
  {
    name: "Network_traffic_Analyser",
    description: "Low-level network traffic analyser written in C.",
    language: "C",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/Network_traffic_Analyser",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Networking",
  },
  {
    name: "Document-Ingestion-and-RAG-driven-Q-A",
    description: "Document ingestion pipeline with RAG-driven question answering.",
    language: "Python",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/Document-Ingestion-and-RAG-driven-Q-A",
    fork: false,
    updatedAt: "2025-03-26",
    category: "AI Engineering",
  },
  {
    name: "Cryptocurrencyprediction",
    description: "Machine-learning experiments for cryptocurrency price prediction.",
    language: "Jupyter Notebook",
    stars: 2,
    url: "https://github.com/vaibhav-kuma/Cryptocurrencyprediction",
    fork: false,
    updatedAt: "2025-11-20",
    category: "AI / ML",
  },
  {
    name: "Backend-Engineering",
    description: "In-depth backend engineering curriculum and practice repository.",
    language: "Java",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/Backend-Engineering",
    fork: false,
    updatedAt: "2026-06-26",
    category: "Backend Engineering",
  },
  {
    name: "Chat-APP",
    description: "Real-time chat application (deployed on Render).",
    language: "JavaScript",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/Chat-APP",
    fork: false,
    updatedAt: "2025-09-21",
    category: "Full-stack",
  },
  {
    name: "live-poll-system",
    description: "Live polling system with real-time updates.",
    language: "TypeScript",
    stars: 1,
    url: "https://github.com/vaibhav-kuma/live-poll-system",
    fork: false,
    updatedAt: "2025-11-20",
    category: "Full-stack",
  },
  {
    name: "AgentHub",
    description: "AI sales-agent automation platform (Next.js, Drizzle, Stripe).",
    language: "TypeScript",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/AgentHub",
    fork: false,
    updatedAt: "2026-02-11",
    category: "AI Engineering",
  },
  {
    name: "ai-interview-assistant",
    description: "AI interview assistant built with JavaScript.",
    language: "JavaScript",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/ai-interview-assistant",
    fork: false,
    updatedAt: "2025-09-26",
    category: "AI Engineering",
  },
  {
    name: "Decentralize_web3.",
    description: "Web3 / decentralized application experiments.",
    language: "TypeScript",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/Decentralize_web3.",
    fork: false,
    updatedAt: "2025-12-02",
    category: "Web3",
  },
];

/** Notable forks signalling the open-source ecosystem Vaibhav studies. */
export const notableForks: RepositoryRecord[] = [
  {
    name: "IntelOwl",
    description:
      "Fork of IntelOwl — manage threat intelligence at scale (studied for threat-intel pipeline design).",
    language: "Python",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/IntelOwl",
    fork: true,
    updatedAt: "2026-03-20",
    category: "Threat Intelligence",
  },
  {
    name: "falco",
    description:
      "Fork of Falco — cloud-native runtime security (studied for runtime threat detection).",
    language: "C++",
    stars: 0,
    url: "https://github.com/vaibhav-kuma/falco",
    fork: true,
    updatedAt: "2026-03-09",
    category: "Runtime Security",
  },
];

/** Language distribution across the profile (snapshot 2026-08-23). */
export const languageDistribution: { language: string; count: number; color: string }[] = [
  { language: "Python", count: 16, color: "#22d3ee" },
  { language: "TypeScript", count: 11, color: "#a78bfa" },
  { language: "JavaScript", count: 6, color: "#fbbf24" },
  { language: "Java", count: 2, color: "#fb7185" },
  { language: "HTML", count: 2, color: "#f97316" },
  { language: "C / C# / PHP / CSS / Notebooks", count: 7, color: "#64748b" },
];

export const githubSnapshot = {
  publicRepos: 49,
  followers: 2,
  snapshotDate: "2026-08-23",
};
