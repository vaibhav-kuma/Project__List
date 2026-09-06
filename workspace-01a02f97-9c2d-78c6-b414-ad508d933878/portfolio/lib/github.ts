/**
 * GitHub data layer.
 *
 * No credentials are used or required: the public REST API is fetched
 * client-side with a graceful fallback to the curated local snapshot
 * (lib/data/repositories.ts) when the API is unavailable or rate-limited.
 */

export interface GitHubProfileLive {
  publicRepos: number;
  followers: number;
  updatedAt: string;
}

export interface GitHubRepoLive {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  fork: boolean;
  updated_at: string;
  homepage?: string | null;
  topics?: string[];
}

const API_BASE = "https://api.github.com";

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Live profile stats; throws on failure so callers can fall back. */
export async function fetchGitHubProfile(username: string): Promise<GitHubProfileLive> {
  const data = await fetchJson<{
    public_repos: number;
    followers: number;
    updated_at: string;
  }>(`${API_BASE}/users/${username}`);
  return {
    publicRepos: data.public_repos,
    followers: data.followers,
    updatedAt: data.updated_at,
  };
}

/** Most recently updated repositories; throws on failure so callers can fall back. */
export async function fetchRecentRepos(username: string, count = 6): Promise<GitHubRepoLive[]> {
  const data = await fetchJson<GitHubRepoLive[]>(
    `${API_BASE}/users/${username}/repos?per_page=${count}&sort=updated`,
  );
  return data.slice(0, count);
}
