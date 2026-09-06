"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Github,
  Layers,
  Lock,
  Scale,
  Sparkles,
  Star,
  Telescope,
  Wrench,
} from "lucide-react";
import type { FeaturedProject } from "@/lib/types";
import { featuredProjects } from "@/lib/data/featured-projects";
import { TechTag } from "@/components/ui/TechTag";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils/cn";

function Block({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-slate-400/10 py-10 first:border-t-0", className)}>
      <h2 className="eyebrow mb-5">{title}</h2>
      {children}
    </section>
  );
}

export function CaseStudy({ project }: { project: FeaturedProject }) {
  const rankIndex = featuredProjects.findIndex((p) => p.slug === project.slug);
  const prev = featuredProjects[rankIndex - 1];
  const next = featuredProjects[rankIndex + 1];

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-28 md:px-8">
      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 font-mono text-[11px] text-slate-500">
        <Link href="/#projects" className="inline-flex items-center gap-1.5 transition hover:text-pulse-soft">
          <ArrowLeft size={12} aria-hidden /> project_universe
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-300">{project.slug}</span>
      </nav>

      {/* hero */}
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider"
            style={{ borderColor: `${project.accent}55`, color: project.accent, background: project.accentSoft }}
          >
            rank {String(project.rank).padStart(2, "0")} · {project.category}
          </span>
          <span className="font-mono text-[11px] text-slate-500">{project.status}</span>
        </div>

        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
          {project.name}
        </h1>
        <p className="mt-3 max-w-2xl text-base font-medium md:text-lg" style={{ color: project.accent }}>
          {project.tagline}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <Github size={15} aria-hidden /> View repository
          </a>
          {project.demoUrl ? (
            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Live demo
            </a>
          ) : (
            <span className="font-mono text-[11px] text-slate-600">
              // no public demo — runs locally per README
            </span>
          )}
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-400/10 bg-slate-400/10 sm:grid-cols-4">
          {[
            { label: "Primary language", value: project.languages.join(" · ") },
            { label: "Last updated", value: project.updatedAt },
            { label: "Stars", value: String(project.stars) },
            { label: "License", value: project.license ?? "—" },
          ].map((f) => (
            <div key={f.label} className="bg-ink-900/90 p-3.5">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{f.label}</dt>
              <dd className="mt-1 font-display text-[13px] font-semibold text-slate-100">{f.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        {/* main column */}
        <div>
          <Block title="overview">
            <div className="space-y-4">
              {project.summary.map((para, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <p className="text-[15px] leading-relaxed text-slate-300">{para}</p>
                </Reveal>
              ))}
            </div>
          </Block>

          <Block title="problem">
            <ul className="space-y-3">
              {project.problem.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-slate-300">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-status-alert/80" />
                  {p}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="solution">
            <ul className="space-y-3">
              {project.solution.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-slate-300">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-status-ok/80" />
                  {s}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="architecture">
            {/* flow strip */}
            <ol className="mb-8 flex flex-wrap items-center gap-2" aria-label="System flow">
              {project.architectureFlow.map((step, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded-md border border-slate-400/15 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[11px] text-slate-300">
                    <span style={{ color: project.accent }}>{String(i + 1).padStart(2, "0")}</span> {step}
                  </span>
                  {i < project.architectureFlow.length - 1 && (
                    <ArrowRight size={12} aria-hidden className="text-slate-600" />
                  )}
                </li>
              ))}
            </ol>

            <div className="space-y-5">
              {project.architecture.map((block) => (
                <div key={block.title} className="panel rounded-lg p-5">
                  <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-white">
                    <Layers size={14} aria-hidden style={{ color: project.accent }} />
                    {block.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-dim">{block.description}</p>
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 font-mono text-[12px] text-slate-400">
                        <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: project.accent }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Block>

          <Block title="core features">
            <div className="grid gap-4 sm:grid-cols-2">
              {project.features.map((f) => (
                <div key={f.title} className="panel rounded-lg p-4">
                  <h3 className="font-display text-[14px] font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{f.description}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block title="engineering decisions">
            <ul className="space-y-4">
              {project.engineeringDecisions.map((d) => (
                <li key={d.title} className="flex items-start gap-3">
                  <Wrench size={15} aria-hidden className="mt-1 shrink-0" style={{ color: project.accent }} />
                  <div>
                    <h3 className="text-[14px] font-semibold text-slate-100">{d.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-dim">{d.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="future improvements">
            <ul className="space-y-2.5">
              {project.future.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[14px] leading-relaxed text-slate-300">
                  <Telescope size={14} aria-hidden className="mt-1 shrink-0 text-slate-500" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-5 font-mono text-[11px] text-slate-600">
              // credibility note: results and capabilities above are drawn from the repository
              and README; no adoption or production claims are invented.
            </p>
          </Block>
        </div>

        {/* sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="panel rounded-lg p-5">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
              technology stack
            </h2>
            <dl className="mt-3 space-y-3">
              {project.stack.map((group) => (
                <div key={group.group}>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
                    {group.group}
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <TechTag key={item}>{item}</TechTag>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {project.securityCapabilities.length > 0 && (
            <div className="panel rounded-lg p-5">
              <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-status-ok">
                <Lock size={11} aria-hidden /> security capabilities
              </h2>
              <ul className="mt-3 space-y-2">
                {project.securityCapabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-300">
                    <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-status-ok" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.aiCapabilities.length > 0 && (
            <div className="panel rounded-lg p-5">
              <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-violet-neon">
                <Sparkles size={11} aria-hidden /> ai capabilities
              </h2>
              <ul className="mt-3 space-y-2">
                {project.aiCapabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-300">
                    <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-violet-neon" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel rounded-lg p-5">
            <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
              <Scale size={11} aria-hidden /> verifiable results
            </h2>
            <ul className="mt-3 space-y-3">
              {project.results.map((r) => (
                <li key={r.label}>
                  <p className="font-display text-lg font-bold" style={{ color: project.accent }}>
                    {r.value}
                  </p>
                  <p className="text-[12px] font-medium text-slate-200">{r.label}</p>
                  {r.note && <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{r.note}</p>}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel rounded-lg p-5">
            <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
              <CalendarDays size={11} aria-hidden /> repository meta
            </h2>
            <ul className="mt-3 space-y-1.5 font-mono text-[12px] text-slate-400">
              <li>repo: {project.repoName}</li>
              <li>updated: {project.updatedAt}</li>
              <li className="flex items-center gap-1.5">
                <Star size={11} aria-hidden /> stars: {project.stars}
              </li>
              {project.license && <li>license: {project.license}</li>}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.topics.map((t) => (
                <TechTag key={t}>{t}</TechTag>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* prev / next navigation */}
      <nav aria-label="Project navigation" className="mt-14 grid gap-4 border-t border-slate-400/10 pt-8 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/projects/${prev.slug}`}
            className="panel group rounded-lg p-4 transition hover:border-pulse/40"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              ← previous structure
            </span>
            <span className="mt-1 block font-display text-[15px] font-semibold text-white transition group-hover:text-pulse-soft">
              {prev.name}
            </span>
          </Link>
        ) : (
          <span aria-hidden />
        )}
        {next && (
          <Link
            href={`/projects/${next.slug}`}
            className="panel group rounded-lg p-4 text-right transition hover:border-pulse/40"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              next structure →
            </span>
            <span className="mt-1 block font-display text-[15px] font-semibold text-white transition group-hover:text-pulse-soft">
              {next.name}
            </span>
          </Link>
        )}
      </nav>
    </div>
  );
}
