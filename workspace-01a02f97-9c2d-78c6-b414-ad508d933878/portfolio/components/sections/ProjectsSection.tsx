"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Github } from "lucide-react";
import { featuredProjects } from "@/lib/data/featured-projects";
import { UniverseCanvas } from "@/components/three/UniverseCanvas";
import type { UniverseProjectSlot } from "@/components/three/scenes/UniverseScene";
import { ProjectCard } from "@/components/project/ProjectCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { TechTag } from "@/components/ui/TechTag";
import { cn } from "@/lib/utils/cn";

const SLOT_GEOMETRY: Record<number, { position: [number, number, number]; baseScale: number }> = {
  1: { position: [0, 0, 0], baseScale: 1.28 },
  2: { position: [-3.25, 0.05, 0.2], baseScale: 0.95 },
  3: { position: [3.45, 0, 0.2], baseScale: 0.95 },
  4: { position: [-6.4, 0, -0.2], baseScale: 0.82 },
  5: { position: [6.5, -0.05, -0.2], baseScale: 0.82 },
};

const slots: UniverseProjectSlot[] = featuredProjects.map((p) => ({
  slug: p.slug,
  name: p.name,
  visualization: p.visualization,
  accent: p.accent,
  ...SLOT_GEOMETRY[p.rank],
}));

export function ProjectsSection() {
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();

  const handleSelect = useCallback(
    (slug: string) => router.push(`/projects/${slug}`),
    [router],
  );

  const hoveredProject = hovered
    ? featuredProjects.find((p) => p.slug === hovered) ?? null
    : null;

  return (
    <section id="projects" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="section-shell">
        <SectionHeader
          index="03"
          eyebrow="repository universe"
          title="Featured Projects"
          description="Five systems, ranked by technical depth and relevance. Hover a structure to inspect it; open it to read the full engineering case study."
        />
      </div>

      {/* 3D universe (desktop/tablet with WebGL) */}
      <div className="section-shell">
        <Reveal>
          <div className="relative hidden h-[520px] overflow-hidden rounded-xl border border-slate-400/10 bg-ink-900/60 md:block">
            <UniverseCanvas
              slots={slots}
              hovered={hovered}
              onHover={setHovered}
              onSelect={handleSelect}
            />

            {/* scan label */}
            <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
              project_universe · 5 structures detected
            </div>

            {/* hover info card */}
            <div
              className={cn(
                "pointer-events-none absolute bottom-4 left-4 w-[340px] max-w-[85%] rounded-lg border border-slate-400/15 bg-ink-900/95 p-4 backdrop-blur transition-all duration-300",
                hoveredProject ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
              aria-hidden={!hoveredProject}
            >
              {hoveredProject && (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: hoveredProject.accent }}>
                    {String(hoveredProject.rank).padStart(2, "0")} · {hoveredProject.category}
                  </p>
                  <h3 className="mt-1 font-display text-base font-semibold text-white">
                    {hoveredProject.name}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                    {hoveredProject.tagline}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {[...hoveredProject.languages, ...hoveredProject.topics.slice(0, 4)].map((t) => (
                      <TechTag key={t}>{t}</TechTag>
                    ))}
                  </div>
                  <p className="mt-3 font-mono text-[10px] text-slate-500">
                    click structure → open case study
                  </p>
                </>
              )}
            </div>

            {/* rank legend — keyboard-accessible mirror of the 3D scene */}
            <div className="absolute bottom-4 right-4 hidden flex-col gap-1 lg:flex" role="list">
              {featuredProjects.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  role="listitem"
                  onMouseEnter={() => setHovered(p.slug)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(p.slug)}
                  onBlur={() => setHovered(null)}
                  onClick={() => handleSelect(p.slug)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1 text-left font-mono text-[11px] transition",
                    hovered === p.slug
                      ? "border-pulse/40 bg-pulse/10 text-pulse-soft"
                      : "border-slate-400/10 bg-ink-900/80 text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span style={{ color: p.accent }}>{String(p.rank).padStart(2, "0")}</span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* 2D grid — always present: mobile, keyboard, no-WebGL, SEO */}
      <div className="section-shell mt-8 md:mt-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProjects.map((project, i) => (
            <Reveal key={project.slug} delay={i * 0.06} className="h-full">
              <ProjectCard project={project} />
            </Reveal>
          ))}

          {/* index card linking to GitHub */}
          <Reveal delay={0.3} className="h-full">
            <a
              href="https://github.com/vaibhav-kuma?tab=repositories"
              target="_blank"
              rel="noopener noreferrer"
              className="panel group flex h-full min-h-[240px] flex-col items-center justify-center rounded-lg p-6 text-center transition hover:border-pulse/40"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500">
                + 44 more repositories
              </span>
              <span className="mt-3 font-display text-lg font-semibold text-white transition group-hover:text-pulse-soft">
                Browse the full index
              </span>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-slate-400">
                <Github size={14} aria-hidden /> github.com/vaibhav-kuma
                <ArrowUpRight size={13} aria-hidden />
              </span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
