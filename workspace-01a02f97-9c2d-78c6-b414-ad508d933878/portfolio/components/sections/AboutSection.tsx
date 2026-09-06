import { Braces, Radar, Bot, Server } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TechTag } from "@/components/ui/TechTag";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/lib/data/profile";

const domains = [
  {
    icon: Server,
    title: "Backend Engineering",
    accent: "text-pulse",
    description:
      "API-first services and microservice systems — FastAPI and Node.js services, Kafka-backed event flows, PostgreSQL/Redis/Elasticsearch data layers.",
    tags: ["FastAPI", "Node.js", "Kafka", "PostgreSQL"],
  },
  {
    icon: Radar,
    title: "Cybersecurity Engineering",
    accent: "text-status-ok",
    description:
      "Threat-detection pipelines, SIEM/EDR concepts, MITRE ATT&CK mapping, vulnerability assessment, and security automation — from VADT to a 15-service SOC platform.",
    tags: ["MITRE ATT&CK", "SIEM", "EDR", "Threat Detection"],
  },
  {
    icon: Bot,
    title: "AI Building",
    accent: "text-violet-neon",
    description:
      "LLM-orchestrated systems and AI agents: an AI copilot inside the SOC, agent-driven legacy modernization, RAG pipelines, and dark-web intelligence agents.",
    tags: ["LLMs", "AI Agents", "RAG", "AI Security"],
  },
];

export function AboutSection() {
  return (
    <section id="about" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="section-shell">
        <SectionHeader
          index="01"
          eyebrow="operator profile"
          title="Engineering Profile"
          description="A security-focused software engineer who designs backend systems, builds detection pipelines, and ships AI-agent tooling — one ecosystem, three disciplines."
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Terminal identity card */}
          <Reveal>
            <TerminalCard title="system://identity --verbose">
              <div className="space-y-1.5 text-slate-300">
                <p>
                  <span className="text-status-ok">$</span> whoami
                </p>
                <p className="text-white">{profile.name.toLowerCase().replace(" ", "_")}</p>
                <p className="pt-2">
                  <span className="text-status-ok">$</span> cat role.txt
                </p>
                <p className="text-pulse-soft">backend · cybersecurity · ai</p>
                <p className="pt-2">
                  <span className="text-status-ok">$</span> echo $BASE
                </p>
                <p>
                  {profile.location} · {profile.timezone}
                </p>
                <p className="pt-2">
                  <span className="text-status-ok">$</span> list certifications
                </p>
                <ul className="space-y-1 text-slate-300">
                  <li>→ CompTIA Security+ (SY0-701)</li>
                  <li>→ EC-Council EHE · NDE</li>
                </ul>
                <p className="pt-2">
                  <span className="text-status-ok">$</span> status
                </p>
                <p className="text-status-ok">
                  {profile.openToOpportunities ? "open_to_opportunities=true" : "status=engaged"}
                  <span className="ml-1 inline-block h-3 w-1.5 animate-blink bg-status-ok align-middle" aria-hidden />
                </p>
              </div>
            </TerminalCard>

            <div className="panel mt-4 rounded-lg p-4">
              <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                <Braces size={12} aria-hidden /> core languages
              </p>
              <div className="flex flex-wrap gap-2">
                {["C++", "Python", "Java", "JavaScript", "TypeScript"].map((lang) => (
                  <TechTag key={lang}>{lang}</TechTag>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Domain cards */}
          <div className="space-y-4">
            {domains.map((d, i) => (
              <Reveal key={d.title} delay={i * 0.08}>
                <article className="panel group rounded-lg p-5 transition hover:border-pulse/30">
                  <div className="flex items-start gap-4">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-400/15 bg-white/[0.03] ${d.accent}`}
                    >
                      <d.icon size={17} aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold text-white">
                        {d.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-dim">{d.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {d.tags.map((t) => (
                          <TechTag key={t}>{t}</TechTag>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}

            <Reveal delay={0.24}>
              <p className="px-1 font-mono text-[11px] leading-relaxed text-slate-500">
                // engineering interests: distributed systems · security automation · detection
                engineering · AI-assisted operations · developer tooling
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
