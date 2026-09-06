import { Award, Briefcase, GraduationCap, Trophy } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { TechTag } from "@/components/ui/TechTag";
import { experienceItems } from "@/lib/data/experience";
import type { ExperienceItem } from "@/lib/types";

const kindMeta: Record<ExperienceItem["kind"], { icon: typeof Briefcase; label: string; color: string }> = {
  role: { icon: Briefcase, label: "role", color: "#22d3ee" },
  education: { icon: GraduationCap, label: "education", color: "#a78bfa" },
  certification: { icon: Award, label: "certification", color: "#34d399" },
  milestone: { icon: Trophy, label: "milestone", color: "#fbbf24" },
};

export function ExperienceSection() {
  return (
    <section id="experience" className="relative scroll-mt-20 border-y border-slate-400/10 bg-ink-900/40 py-24 md:py-32">
      <div className="section-shell">
        <SectionHeader
          index="06"
          eyebrow="experience & achievements"
          title="Timeline"
          description="Roles, education, certifications, and milestones — factual entries from the professional record only."
        />

        <ol className="relative ml-3 space-y-8 border-l border-slate-400/15 pl-8 md:ml-6">
          {experienceItems.map((item, i) => {
            const meta = kindMeta[item.kind];
            const Icon = meta.icon;
            return (
              <Reveal key={item.id} delay={i * 0.05}>
                <li className="relative">
                  {/* timeline node */}
                  <span
                    aria-hidden
                    className="absolute -left-[45px] top-1 grid h-8 w-8 place-items-center rounded-full border bg-ink-900"
                    style={{ borderColor: `${meta.color}55`, color: meta.color }}
                  >
                    <Icon size={14} />
                  </span>

                  <article className="panel rounded-lg p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-display text-base font-semibold text-white">
                        {item.title}
                      </h3>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-slate-500">
                        {item.period}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-slate-300">
                      {item.organization}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-dim">{item.summary}</p>
                    <ul className="mt-3 space-y-1.5">
                      {item.points.map((point, j) => (
                        <li key={j} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-400">
                          <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {item.tags.map((t) => (
                        <TechTag key={t}>{t}</TechTag>
                      ))}
                    </div>
                  </article>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
