import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import type { FeaturedProject } from "@/lib/types";
import { TechTag } from "@/components/ui/TechTag";

/** 2D featured-project card — the accessible, mobile-first representation. */
export function ProjectCard({ project }: { project: FeaturedProject }) {
  return (
    <article
      className="panel group relative flex h-full flex-col overflow-hidden rounded-lg p-5 transition duration-300 hover:border-pulse/40"
      aria-label={`${project.name} — ranked number ${project.rank} featured project`}
    >
      {/* accent edge */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${project.accent}, transparent)` }}
      />

      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-slate-500">
          <span style={{ color: project.accent }}>{String(project.rank).padStart(2, "0")}</span> ·{" "}
          {project.category}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
          {project.status.split("·")[0].trim()}
        </span>
      </div>

      <h3 className="font-display text-lg font-semibold text-white">{project.name}</h3>
      <p className="mt-1 text-[13px] font-medium" style={{ color: project.accent }}>
        {project.tagline}
      </p>
      <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-dim">
        {project.summary[0].length > 220 ? `${project.summary[0].slice(0, 220)}…` : project.summary[0]}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.languages.map((l) => (
          <TechTag key={l}>{l}</TechTag>
        ))}
        {project.topics.slice(0, 4).map((t) => (
          <TechTag key={t}>{t}</TechTag>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-slate-400/10 pt-4">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-ink-950 transition"
          style={{ backgroundColor: project.accent }}
        >
          Case study <ArrowUpRight size={13} aria-hidden />
        </Link>
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-400/20 px-3 py-1.5 text-[13px] text-slate-300 transition hover:border-pulse/50 hover:text-pulse-soft"
        >
          <Github size={13} aria-hidden /> Repo
        </a>
      </div>
    </article>
  );
}
