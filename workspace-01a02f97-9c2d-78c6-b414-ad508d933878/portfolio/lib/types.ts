/** Central strict type definitions for the portfolio data model. */

export type VisualizationKind =
  | "security-core"
  | "ai-transform"
  | "threat-radar"
  | "threat-globe"
  | "monitoring-grid";

export type ProjectCategory =
  | "Security Operations"
  | "AI Engineering"
  | "Threat Detection"
  | "Threat Intelligence"
  | "Observability";

export interface ArchitectureBlock {
  title: string;
  description: string;
  items: string[];
}

export interface FeatureItem {
  title: string;
  description: string;
}

export interface StackGroup {
  group: string;
  items: string[];
}

export interface EngineeringDecision {
  title: string;
  detail: string;
}

export interface ResultItem {
  label: string;
  value: string;
  note?: string;
}

export interface FeaturedProject {
  slug: string;
  repoName: string;
  name: string;
  tagline: string;
  rank: 1 | 2 | 3 | 4 | 5;
  category: ProjectCategory;
  status: string;
  visualization: VisualizationKind;
  accent: string;
  accentSoft: string;
  summary: string[];
  problem: string[];
  solution: string[];
  architecture: ArchitectureBlock[];
  architectureFlow: string[];
  features: FeatureItem[];
  stack: StackGroup[];
  securityCapabilities: string[];
  aiCapabilities: string[];
  engineeringDecisions: EngineeringDecision[];
  results: ResultItem[];
  future: string[];
  githubUrl: string;
  demoUrl?: string;
  languages: string[];
  topics: string[];
  updatedAt: string;
  stars: number;
  license?: string;
}

export interface RepositoryRecord {
  name: string;
  description: string;
  language: string | null;
  stars: number;
  url: string;
  fork: boolean;
  updatedAt: string;
  category: string;
}

export type SkillCategory =
  | "Languages"
  | "Backend"
  | "Cybersecurity"
  | "AI & ML"
  | "Data & Infra"
  | "QA & Tooling";

export interface SkillNode {
  id: string;
  label: string;
  category: SkillCategory;
  /** ids of related technologies */
  related: string[];
  /** slugs of featured projects / repo names using this technology */
  projects: string[];
  /** visual weight of the node */
  weight: 1 | 2 | 3;
}

export interface ExperienceItem {
  id: string;
  kind: "role" | "education" | "certification" | "milestone";
  title: string;
  organization: string;
  period: string;
  summary: string;
  points: string[];
  tags: string[];
}

export interface ProfileLink {
  label: string;
  url: string;
  kind: "github" | "linkedin" | "email" | "resume" | "external";
}
