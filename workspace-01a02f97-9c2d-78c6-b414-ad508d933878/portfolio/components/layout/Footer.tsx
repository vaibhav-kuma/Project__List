import { Github, Linkedin, Mail, FileText } from "lucide-react";
import { profile, profileLinks } from "@/lib/data/profile";

const icons = {
  github: Github,
  linkedin: Linkedin,
  email: Mail,
  resume: FileText,
  external: Github,
} as const;

export function Footer() {
  return (
    <footer className="border-t border-slate-400/10 bg-ink-950">
      <div className="section-shell flex flex-col items-center justify-between gap-6 py-10 md:flex-row">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.22em] text-white">
            VAIBHAV KUMAR
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            backend · cybersecurity · ai — {profile.location}
          </p>
        </div>

        <ul className="flex items-center gap-2">
          {profileLinks.map((link) => {
            const Icon = icons[link.kind];
            return (
              <li key={link.label}>
                <a
                  href={link.url}
                  target={link.kind === "resume" ? "_blank" : undefined}
                  rel={link.kind === "resume" ? "noopener noreferrer" : undefined}
                  aria-label={link.label}
                  className="grid h-9 w-9 place-items-center rounded-md border border-slate-400/15 text-slate-400 transition hover:border-pulse/50 hover:text-pulse"
                >
                  <Icon size={15} aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>

        <p className="font-mono text-[11px] text-slate-500">
          © {new Date().getFullYear()} · engineered with Next.js, R3F & Framer Motion
        </p>
      </div>
    </footer>
  );
}
