"use client";

import { useEffect, useState } from "react";
import { Github, Menu, X } from "lucide-react";
import { profile } from "@/lib/data/profile";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Architecture", href: "#architecture" },
  { label: "Activity", href: "#activity" },
  { label: "Contact", href: "#contact" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-slate-400/10 bg-ink-950/85 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <nav aria-label="Primary" className="section-shell flex h-16 items-center justify-between">
        <a
          href="#top"
          className="group flex items-center gap-2.5 font-display text-sm font-semibold tracking-[0.22em] text-white"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded border border-pulse/40 bg-pulse/10 font-mono text-[11px] text-pulse transition group-hover:bg-pulse/20"
          >
            VK
          </span>
          {profile.navIdentity}
          <span className="hidden text-slate-500 sm:inline">KUMAR</span>
        </a>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded px-3 py-2 font-mono text-[12px] uppercase tracking-wider text-slate-400 transition hover:bg-white/[0.04] hover:text-pulse-soft"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {profile.openToOpportunities && <StatusPill label={profile.opportunityLabel} tone="ok" />}
          <a
            href={profile.github.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-400/15 text-slate-300 transition hover:border-pulse/50 hover:text-pulse"
          >
            <Github size={16} aria-hidden />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-10 w-10 place-items-center rounded-md border border-slate-400/15 text-slate-200 lg:hidden"
        >
          {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-nav"
        className={cn(
          "border-b border-slate-400/10 bg-ink-950/95 backdrop-blur-md lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <div className="section-shell flex flex-col gap-1 py-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-slate-300 transition hover:bg-white/[0.04] hover:text-pulse-soft"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-3 flex items-center gap-3 px-3">
            {profile.openToOpportunities && <StatusPill label={profile.opportunityLabel} tone="ok" />}
            <a
              href={profile.github.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-300"
            >
              <Github size={14} aria-hidden /> GitHub
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
