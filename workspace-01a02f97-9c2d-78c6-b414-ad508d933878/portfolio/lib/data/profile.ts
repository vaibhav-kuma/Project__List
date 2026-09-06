import type { ProfileLink } from "@/lib/types";

/**
 * Central profile configuration.
 * `openToOpportunities` is intentionally configurable — never assume status.
 */
export const profile = {
  name: "Vaibhav Kumar",
  navIdentity: "VAIBHAV",
  fullNameHeading: "VAIBHAV KUMAR",
  positioning: "Backend Developer • Cybersecurity Engineer • AI Builder",
  statement:
    "I build intelligent systems at the intersection of AI, cybersecurity, and backend engineering — threat-detection pipelines, security operations platforms, and AI-agent-driven tooling.",
  location: "Dehradun, India",
  timezone: "IST (UTC+5:30)",
  email: "vaibhakumar7988@gmail.com",
  openToOpportunities: true,
  opportunityLabel: "Open to opportunities",
  github: {
    username: "vaibhav-kuma",
    url: "https://github.com/vaibhav-kuma",
  },
  siteUrl: "https://vaibhavkumar.dev",
  resumePath: "/resume/Vaibhav_Kumar_Resume.pdf",
} as const;

export const profileLinks: ProfileLink[] = [
  { label: "GitHub", url: profile.github.url, kind: "github" },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/vaibhav-kumar-a19a81232",
    kind: "linkedin",
  },
  { label: "Email", url: `mailto:${profile.email}`, kind: "email" },
  { label: "Resume", url: profile.resumePath, kind: "resume" },
];

export const heroFacts = [
  { label: "Public repositories", value: "49" },
  { label: "Microservices in SOC platform", value: "15" },
  { label: "Security certification", value: "Security+ SY0-701" },
  { label: "Primary stack", value: "Python · TypeScript · FastAPI" },
] as const;
