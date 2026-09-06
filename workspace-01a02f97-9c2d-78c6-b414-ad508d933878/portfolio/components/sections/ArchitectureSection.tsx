"use client";

import {
  MonitorSmartphone,
  LayoutDashboard,
  ShieldCheck,
  Server,
  BrainCircuit,
  ListOrdered,
  Database,
  BellRing,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { TechTag } from "@/components/ui/TechTag";

const stages = [
  {
    icon: MonitorSmartphone,
    title: "Client",
    caption: "Analyst consoles, API consumers, agents",
    color: "#38bdf8",
  },
  {
    icon: LayoutDashboard,
    title: "Interface",
    caption: "React SPAs & dashboards",
    color: "#38bdf8",
  },
  {
    icon: ShieldCheck,
    title: "API / Gateway",
    caption: "JWT · RBAC · MFA · Traefik",
    color: "#22d3ee",
  },
  {
    icon: Server,
    title: "Services",
    caption: "Bounded microservices (FastAPI)",
    color: "#22d3ee",
  },
  {
    icon: BrainCircuit,
    title: "AI / Detection",
    caption: "LLM copilot · rules · ML anomaly",
    color: "#a78bfa",
  },
  {
    icon: ListOrdered,
    title: "Queue",
    caption: "Kafka streams & async fan-out",
    color: "#a78bfa",
  },
  {
    icon: Database,
    title: "Data & Search",
    caption: "PostgreSQL · Redis · Elasticsearch",
    color: "#f472b6",
  },
  {
    icon: BellRing,
    title: "Observability",
    caption: "Prometheus · Grafana · alerting",
    color: "#34d399",
  },
];

const principles = [
  {
    title: "Bounded services",
    detail:
      "Each capability — auth, scanning, detection, response — is an independently deployable service with a clear contract, so failure stays isolated and evolution stays fast.",
  },
  {
    title: "Events over calls",
    detail:
      "Telemetry and detections flow through Kafka instead of point-to-point calls, letting analytics, alerting, and AI subscribe to the same backbone without coupling.",
  },
  {
    title: "Right store per data shape",
    detail:
      "Relational state in PostgreSQL, hot state in Redis, search and logs in Elasticsearch, documents in MongoDB — one store is never forced to do everything.",
  },
  {
    title: "Monitor the monitor",
    detail:
      "Detection pipelines are production systems: agent heartbeats, consumer lag, model accuracy, and MTTD are first-class metrics with alerting attached.",
  },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="relative scroll-mt-20 border-y border-slate-400/10 bg-ink-900/40 py-24 md:py-32">
      <div className="section-shell">
        <SectionHeader
          index="04"
          eyebrow="how i build systems"
          title="A Representative System Architecture"
          description="The pattern behind the portfolio: requests move through hardened edges into bounded services, past AI and detection engines, across an event backbone, into purpose-fit data stores — with observability watching all of it."
        />

        {/* Animated pipeline */}
        <Reveal>
          <div className="panel rounded-xl p-6 md:p-8">
            <div className="relative">
              {/* backbone */}
              <div
                aria-hidden
                className="absolute left-[4%] right-[4%] top-[21px] hidden h-px bg-gradient-to-r from-sky-500/40 via-violet-neon/40 to-status-ok/40 md:block"
              >
                {/* travelling data pulses (removed for reduced motion via CSS) */}
                <span className="flow-pulse absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-pulse shadow-[0_0_8px_#22d3ee]" />
                <span className="flow-pulse absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-violet-neon shadow-[0_0_8px_#a78bfa]" style={{ animationDelay: "-3s" }} />
                <span className="flow-pulse absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-status-ok shadow-[0_0_8px_#34d399]" style={{ animationDelay: "-6s" }} />
              </div>

              <ol className="grid grid-cols-2 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
                {stages.map((stage, i) => (
                  <li key={stage.title} className="relative flex flex-col items-center text-center">
                    <span
                      className="relative z-10 grid h-11 w-11 place-items-center rounded-lg border bg-ink-900"
                      style={{ borderColor: `${stage.color}55`, color: stage.color }}
                    >
                      <stage.icon size={17} aria-hidden />
                    </span>
                    <span className="mt-2.5 font-mono text-[9px] text-slate-600" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[13px] font-semibold text-slate-100">
                      {stage.title}
                    </span>
                    <span className="mt-1 max-w-[130px] font-mono text-[9.5px] leading-snug text-slate-500">
                      {stage.caption}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>

        {/* Principles */}
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {principles.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.07}>
              <div className="panel h-full rounded-lg p-5">
                <h3 className="font-display text-[15px] font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-dim">{p.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Stack strip */}
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
              recurring stack →
            </span>
            {["FastAPI", "React", "Kafka", "PostgreSQL", "Redis", "Elasticsearch", "Docker", "Kubernetes", "Prometheus", "Grafana", "LLM APIs"].map(
              (t) => (
                <TechTag key={t}>{t}</TechTag>
              ),
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
