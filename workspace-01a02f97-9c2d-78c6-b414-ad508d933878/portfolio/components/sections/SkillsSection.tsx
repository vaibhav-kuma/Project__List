"use client";

import { useMemo, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { skillCategoryMeta, skillNodes } from "@/lib/data/skills";
import type { SkillCategory, SkillNode } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/** Cluster anchor points (percent coordinates of the constellation field). */
const clusterCenters: Record<SkillCategory, { x: number; y: number }> = {
  Languages: { x: 13, y: 30 },
  Backend: { x: 37, y: 17 },
  Cybersecurity: { x: 63, y: 24 },
  "AI & ML": { x: 86, y: 44 },
  "Data & Infra": { x: 51, y: 68 },
  "QA & Tooling": { x: 17, y: 76 },
};

/** Deterministic layout: nodes orbit their category cluster center. */
function layoutNodes(nodes: SkillNode[]) {
  const byCategory = new Map<SkillCategory, SkillNode[]>();
  for (const n of nodes) {
    const list = byCategory.get(n.category) ?? [];
    list.push(n);
    byCategory.set(n.category, list);
  }
  const positions = new Map<string, { x: number; y: number }>();
  byCategory.forEach((list, category) => {
    const center = clusterCenters[category];
    const radius = 8 + list.length * 0.9;
    list.forEach((node, i) => {
      const angle = (i / list.length) * Math.PI * 2 + 0.6;
      const r = i % 2 === 0 ? radius : radius * 0.55;
      positions.set(node.id, {
        x: center.x + Math.cos(angle) * r * 0.72,
        y: center.y + Math.sin(angle) * r * 0.62,
      });
    });
  });
  return positions;
}

export function SkillsSection() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const activeId = hovered ?? pinned;

  const positions = useMemo(() => layoutNodes(skillNodes), []);
  const activeNode = activeId ? skillNodes.find((n) => n.id === activeId) ?? null : null;
  const relatedSet = useMemo(
    () => new Set(activeNode ? [activeNode.id, ...activeNode.related] : []),
    [activeNode],
  );

  const edges = useMemo(() => {
    const seen = new Set<string>();
    const out: { from: SkillNode; to: SkillNode }[] = [];
    for (const node of skillNodes) {
      for (const rid of node.related) {
        const key = [node.id, rid].sort().join("|");
        if (seen.has(key)) continue;
        const other = skillNodes.find((n) => n.id === rid);
        if (!other) continue;
        seen.add(key);
        out.push({ from: node, to: other });
      }
    }
    return out;
  }, []);

  return (
    <section id="skills" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="section-shell">
        <SectionHeader
          index="02"
          eyebrow="technology constellation"
          title="Skills as a Connected System"
          description="Hover or focus any technology to see how it connects to the rest of the stack — and which portfolio projects actually use it."
        />

        <Reveal>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            {/* Constellation field */}
            <div className="panel relative overflow-x-auto rounded-lg">
              <div className="lab-grid relative h-[540px] min-w-[760px] md:h-[560px]">
                {/* edge layer */}
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  {edges.map(({ from, to }) => {
                    const a = positions.get(from.id);
                    const b = positions.get(to.id);
                    if (!a || !b) return null;
                    const isLit =
                      activeId !== null &&
                      (from.id === activeId || to.id === activeId) &&
                      relatedSet.has(from.id) &&
                      relatedSet.has(to.id);
                    return (
                      <line
                        key={`${from.id}-${to.id}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        vectorEffect="non-scaling-stroke"
                        stroke={isLit ? "#22d3ee" : "#334155"}
                        strokeOpacity={activeId === null ? 0.35 : isLit ? 0.85 : 0.12}
                        strokeWidth={isLit ? 1.4 : 0.8}
                        style={{ transition: "stroke-opacity 200ms, stroke 200ms" }}
                      />
                    );
                  })}
                </svg>

                {/* cluster labels */}
                {(Object.keys(clusterCenters) as SkillCategory[]).map((cat) => {
                  const c = clusterCenters[cat];
                  const meta = skillCategoryMeta[cat];
                  return (
                    <span
                      key={cat}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.22em]"
                      style={{ left: `${c.x}%`, top: `${c.y}%`, color: `${meta.color}66` }}
                      aria-hidden
                    >
                      {cat}
                    </span>
                  );
                })}

                {/* nodes */}
                {skillNodes.map((node) => {
                  const pos = positions.get(node.id);
                  if (!pos) return null;
                  const meta = skillCategoryMeta[node.category];
                  const isActive = activeId === node.id;
                  const isRelated = relatedSet.has(node.id);
                  const dimmed = activeId !== null && !isRelated;
                  const size = node.weight === 3 ? 13 : node.weight === 2 ? 10 : 8;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onMouseEnter={() => setHovered(node.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(node.id)}
                      onBlur={() => setHovered(null)}
                      onClick={() => setPinned((p) => (p === node.id ? null : node.id))}
                      aria-label={`${node.label} — ${node.category}. Used in: ${node.projects.join(", ")}`}
                      className={cn(
                        "group absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 transition-opacity duration-200",
                        dimmed && "opacity-25",
                      )}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      <span
                        className={cn(
                          "block rounded-full transition-transform duration-200 group-hover:scale-125",
                          isActive && "scale-125 node-glow",
                        )}
                        style={{
                          width: size,
                          height: size,
                          backgroundColor: meta.color,
                          boxShadow: isActive ? `0 0 14px ${meta.color}` : "none",
                        }}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] transition-opacity",
                          isActive || isRelated ? "text-slate-100" : "text-slate-500",
                        )}
                        aria-hidden
                      >
                        {node.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inspector panel */}
            <aside
              className="panel flex min-h-[280px] flex-col rounded-lg p-5"
              aria-live="polite"
            >
              {activeNode ? (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    node inspector
                  </p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-white">
                    {activeNode.label}
                  </h3>
                  <p
                    className="mt-1 font-mono text-[11px] uppercase tracking-wider"
                    style={{ color: skillCategoryMeta[activeNode.category].color }}
                  >
                    {activeNode.category}
                  </p>

                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    connects to
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {activeNode.related.map((rid) => {
                      const rel = skillNodes.find((n) => n.id === rid);
                      return rel ? (
                        <li key={rid} className="tech-chip">
                          {rel.label}
                        </li>
                      ) : null;
                    })}
                  </ul>

                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    used in
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {activeNode.projects.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-[13px] text-slate-300">
                        <span className="h-1 w-1 rounded-full bg-status-ok" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex flex-1 flex-col justify-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    node inspector
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-slate-200">
                    Select a technology
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-dim">
                    Every node is a technology in Vaibhav&apos;s ecosystem. Edges show working
                    relationships; the inspector maps each one to real projects — so skills are
                    evidence, not labels.
                  </p>
                  <p className="mt-4 font-mono text-[11px] text-slate-500">
                    tip: click a node to pin it · tab to navigate by keyboard
                  </p>
                </div>
              )}
            </aside>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
