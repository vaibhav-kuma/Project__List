"use client";

import { useEffect, useState } from "react";
import { GitFork, Github, RefreshCw, Star } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/lib/data/profile";
import {
  githubSnapshot,
  languageDistribution,
  notableForks,
  secondaryRepositories,
} from "@/lib/data/repositories";
import { fetchGitHubProfile, fetchRecentRepos, type GitHubRepoLive } from "@/lib/github";

const maxLangCount = Math.max(...languageDistribution.map((l) => l.count));

export function ActivitySection() {
  const [liveRepos, setLiveRepos] = useState<GitHubRepoLive[] | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [source, setSource] = useState<"snapshot" | "live">("snapshot");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileLive, repos] = await Promise.all([
          fetchGitHubProfile(profile.github.username),
          fetchRecentRepos(profile.github.username, 6),
        ]);
        if (!cancelled) {
          setLiveCount(profileLive.publicRepos);
          setLiveRepos(repos);
          setSource("live");
        }
      } catch {
        // rate-limited or offline — curated snapshot stays in place
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = liveRepos
    ? liveRepos.map((r) => ({
        name: r.name,
        description: r.description ?? "No description",
        language: r.language ?? "—",
        stars: r.stargazers_count,
        url: r.html_url,
        updated: r.updated_at.slice(0, 10),
      }))
    : secondaryRepositories.slice(0, 6).map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language ?? "—",
        stars: r.stars,
        url: r.url,
        updated: r.updatedAt,
      }));

  return (
    <section id="activity" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="section-shell">
        <SectionHeader
          index="05"
          eyebrow="engineering activity"
          title="Development Activity"
          description="Projects and engineering ability come first — activity is the supporting evidence. Snapshot below; live data loads from the GitHub API when available."
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          {/* Stats + languages */}
          <div className="space-y-5">
            <Reveal>
              <div className="panel rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    github telemetry
                  </p>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                    <RefreshCw size={10} aria-hidden />
                    {source === "live" ? "live api" : `snapshot ${githubSnapshot.snapshotDate}`}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Public repos
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-bold text-white">
                      {liveCount ?? githubSnapshot.publicRepos}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Focus areas
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-bold text-white">3</dd>
                  </div>
                </dl>
                <a
                  href={profile.github.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost mt-5 w-full text-[13px]"
                >
                  <Github size={14} aria-hidden /> github.com/{profile.github.username}
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="panel rounded-lg p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  language distribution
                </p>
                <ul className="mt-4 space-y-3">
                  {languageDistribution.map((l) => (
                    <li key={l.language}>
                      <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
                        <span className="text-slate-300">{l.language}</span>
                        <span className="text-slate-500">{l.count} repos</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(l.count / maxLangCount) * 100}%`,
                            backgroundColor: l.color,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="panel rounded-lg p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  open-source study forks
                </p>
                <ul className="mt-3 space-y-2.5">
                  {notableForks.map((f) => (
                    <li key={f.name} className="flex items-start gap-2 text-[13px]">
                      <GitFork size={13} aria-hidden className="mt-0.5 shrink-0 text-slate-500" />
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 transition hover:text-pulse-soft"
                      >
                        {f.name}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  IntelOwl (threat intel at scale) and Falco (cloud-native runtime security) —
                  forked to study production security architectures.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Recent repositories */}
          <Reveal delay={0.1}>
            <div className="panel h-full rounded-lg p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-white">
                  Recently updated repositories
                </h3>
                <span className="font-mono text-[10px] text-slate-500">
                  {source === "live" ? "fetched just now" : "curated snapshot"}
                </span>
              </div>
              <ul className="divide-y divide-slate-400/10">
                {recent.map((repo) => (
                  <li key={repo.url}>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start justify-between gap-4 py-3.5 transition"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[13px] font-medium text-slate-200 transition group-hover:text-pulse-soft">
                          {repo.name}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-500">
                          {repo.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-slate-500">
                        <span className="hidden sm:inline">{repo.language}</span>
                        <span className="flex items-center gap-1">
                          <Star size={11} aria-hidden /> {repo.stars}
                        </span>
                        <span className="hidden md:inline">{repo.updated}</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-slate-400/10 pt-4 font-mono text-[11px] text-slate-500">
                // additional repos include a containerized ELK SIEM, an AI dark-web scout, a
                YARA-based scanner, an NIDS, and backend/AI experiments — see the full index on
                GitHub.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
