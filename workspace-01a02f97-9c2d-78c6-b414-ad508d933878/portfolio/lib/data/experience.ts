import type { ExperienceItem } from "@/lib/types";

/**
 * Experience & achievements — sourced strictly from the resume and GitHub profile.
 * Percentage improvements are as reported in the resume.
 */
export const experienceItems: ExperienceItem[] = [
  {
    id: "lyfeindex",
    kind: "role",
    title: "Backend Developer",
    organization: "LyfeIndex Limited",
    period: "May 2025 — Dec 2025",
    summary:
      "Backend engineering across Python services, microservice components, and deployment pipelines.",
    points: [
      "Developed and optimized backend services in Python; improved API response times by 30–40% through efficient database queries and caching strategies (as reported).",
      "Built scalable microservice components handling high-volume transactions; reduced downtime incidents by 25% (as reported).",
      "Collaborated with frontend and DevOps teams on end-to-end feature delivery and deployment pipelines.",
    ],
    tags: ["Python", "Microservices", "APIs", "Caching", "DevOps collaboration"],
  },
  {
    id: "phemesoft",
    kind: "role",
    title: "Software Developer Engineer — Security QA",
    organization: "Phemesoft",
    period: "Jun 2024 — Dec 2024",
    summary:
      "Security QA engineering: API validation, defect work on threat-detection pipelines, and automation dashboards.",
    points: [
      "Performed API-level validation and functional testing for internal security workflows using Postman and Python.",
      "Debugged, identified, and reported defects to improve the accuracy of threat-detection pipelines.",
      "Developed automated dashboards for vulnerability insights with security, backend, and data teams.",
    ],
    tags: ["API Testing", "Postman", "Python", "Threat Detection", "Dashboards"],
  },
  {
    id: "upes",
    kind: "education",
    title: "B.Tech — Computer Science",
    organization: "UPES, Dehradun",
    period: "2021 — 2025",
    summary: "CGPA 7.79. Focus areas: software engineering, security, and applied AI.",
    points: [
      "Coursework and lab work across programming, systems, and computer science fundamentals.",
      "Built the portfolio of security and AI projects represented on this site alongside studies.",
    ],
    tags: ["Computer Science", "CGPA 7.79"],
  },
  {
    id: "securityplus",
    kind: "certification",
    title: "CompTIA Security+ (SY0-701)",
    organization: "CompTIA",
    period: "Certified",
    summary:
      "Industry certification covering security operations, threats, architecture, and governance.",
    points: [
      "Foundation behind the detection, SIEM, and MITRE ATT&CK work in this portfolio.",
    ],
    tags: ["Security Operations", "Threats & Vulnerabilities", "Security Architecture"],
  },
  {
    id: "eccouncil",
    kind: "certification",
    title: "EC-Council EHE & NDE",
    organization: "EC-Council",
    period: "Certified",
    summary:
      "Ethical Hacking Essentials (EHE) and Network Defense Essentials (NDE) credentials.",
    points: [
      "Applied in offensive-aware tooling: payload generation, scrapers, and vulnerability analysis repos.",
    ],
    tags: ["Ethical Hacking", "Network Defense"],
  },
  {
    id: "hackathons",
    kind: "milestone",
    title: "Hackathons & Community",
    organization: "Amazon HackOn · IIT Jammu Anveshanam '24",
    period: "2024",
    summary: "Developer at national-level hackathons; mentor and open-source contributor.",
    points: [
      "Developed at Amazon HackOn and IIT Jammu Anveshanam '24 hackathons.",
      "Mentored juniors in security tooling.",
      "Open-source security and automation contributor (incl. forks of IntelOwl and Falco).",
    ],
    tags: ["Hackathons", "Mentoring", "Open Source"],
  },
];
