import { FileText, Github, Linkedin, Mail } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/lib/data/profile";

const channels = [
  {
    icon: Mail,
    label: "Email",
    value: profile.email,
    href: `mailto:${profile.email}`,
    external: false,
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "in/vaibhav-kumar-a19a81232",
    href: "https://www.linkedin.com/in/vaibhav-kumar-a19a81232",
    external: true,
  },
  {
    icon: Github,
    label: "GitHub",
    value: "vaibhav-kuma",
    href: profile.github.url,
    external: true,
  },
  {
    icon: FileText,
    label: "Resume",
    value: "Vaibhav_Kumar_Resume.pdf",
    href: profile.resumePath,
    external: true,
  },
];

export function ContactSection() {
  return (
    <section id="contact" className="relative scroll-mt-20 overflow-hidden py-24 md:py-32">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pulse/[0.05] blur-3xl" />

      <div className="section-shell relative text-center">
        <SectionHeader
          index="07"
          eyebrow="open channel"
          title="LET'S BUILD SOMETHING"
          align="center"
          description="Security operations platforms, detection pipelines, backend systems, or AI-agent tooling — if you're working on hard technical problems, let's talk."
        />

        <Reveal>
          <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.external ? "_blank" : undefined}
                rel={c.external ? "noopener noreferrer" : undefined}
                className="panel group flex items-center gap-4 rounded-lg p-4 text-left transition hover:border-pulse/40"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-400/15 bg-white/[0.03] text-slate-300 transition group-hover:border-pulse/40 group-hover:text-pulse">
                  <c.icon size={16} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    {c.label}
                  </span>
                  <span className="block truncate text-sm font-medium text-slate-200 transition group-hover:text-pulse-soft">
                    {c.value}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-10 max-w-md font-mono text-[11px] leading-relaxed text-slate-500">
            // response latency: usually &lt; 24h · open to Backend, Security, AI, and DevSecOps
            roles — remote or relocation
          </p>
        </Reveal>
      </div>
    </section>
  );
}
