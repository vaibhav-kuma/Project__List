"use client";

import { motion } from "framer-motion";
import { ArrowDown, FileText, Github, Mail } from "lucide-react";
import { profile, heroFacts } from "@/lib/data/profile";
import { HeroCanvas } from "@/components/three/HeroCanvas";
import { StatusPill } from "@/components/ui/StatusPill";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.6, 0.35, 1] as const } },
};

export function HeroSection() {
  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden">
      {/* 3D digital core backdrop */}
      <div className="absolute inset-0" aria-hidden>
        <HeroCanvas />
        {/* readability scrim — keeps text contrast high */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/72 to-ink-950/25" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="section-shell relative z-10 pt-24 pb-16"
      >
        <motion.div variants={item} className="mb-6 flex flex-wrap items-center gap-3">
          <StatusPill label="System online — engineering lab" tone="info" />
          {profile.openToOpportunities && <StatusPill label={profile.opportunityLabel} tone="ok" />}
        </motion.div>

        <motion.p variants={item} className="eyebrow mb-4">
          backend developer · cybersecurity engineer · ai builder
        </motion.p>

        <motion.h1
          variants={item}
          className="font-display text-5xl font-bold leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
        >
          VAIBHAV
          <br />
          <span className="bg-gradient-to-r from-pulse via-sky-300 to-violet-neon bg-clip-text text-transparent">
            KUMAR
          </span>
        </motion.h1>

        <motion.p variants={item} className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
          {profile.statement}
        </motion.p>

        <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#projects" className="btn-primary">
            View Projects
          </a>
          <a
            href={profile.github.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            <Github size={15} aria-hidden /> GitHub
          </a>
          <a href={profile.resumePath} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            <FileText size={15} aria-hidden /> Resume
          </a>
          <a href="#contact" className="btn-ghost">
            <Mail size={15} aria-hidden /> Let&apos;s Connect
          </a>
        </motion.div>

        <motion.dl variants={item} className="mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-400/10 bg-slate-400/10 sm:grid-cols-4">
          {heroFacts.map((fact) => (
            <div key={fact.label} className="bg-ink-900/90 p-3.5">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {fact.label}
              </dt>
              <dd className="mt-1 font-display text-[13px] font-semibold text-slate-100">
                {fact.value}
              </dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      {/* scroll cue */}
      <motion.a
        href="#about"
        aria-label="Scroll to about section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-slate-500 transition hover:text-pulse md:flex"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">enter lab</span>
        <ArrowDown size={14} aria-hidden className="animate-bounce motion-reduce:animate-none" />
      </motion.a>
    </section>
  );
}
