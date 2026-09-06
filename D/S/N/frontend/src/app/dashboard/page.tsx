"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronUp, Download, Play, AlertCircle, Loader2,
  TrendingUp, Zap, Award, Building2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  score: number;
  status: "submitted" | "failed" | "pending";
  date: string;
  job_description?: string;
  screening_answers?: Array<{ question: string; answer: string }>;
  screenshot_url?: string;
  error_message?: string;
}

interface Stats {
  total: number;
  success_rate: number;
  avg_score: number;
  top_companies: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "score" | "company">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch applications
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        if (!userId) {
          setError("No user ID found. Redirecting...");
          setTimeout(() => router.push("/onboard"), 2000);
          return;
        }

        const res = await fetch(`${API}/api/applications/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch applications");
        const data = await res.json();

        setApplications(data.applications || []);
        setStats(data.stats || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading applications");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Sort applications
  const sortedApplications = [...applications].sort((a, b) => {
    let compareVal = 0;
    if (sortBy === "date") {
      compareVal = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === "score") {
      compareVal = a.score - b.score;
    } else {
      compareVal = a.company.localeCompare(b.company);
    }
    return sortOrder === "asc" ? compareVal : -compareVal;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["#", "Company", "Role", "Location", "Score", "Status", "Date"];
    const rows = applications.map((app, idx) => [
      idx + 1,
      app.company,
      app.role,
      app.location,
      app.score,
      app.status,
      app.date,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applications-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      submitted: { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "✅" },
      failed: { bg: "bg-red-500/10", text: "text-red-400", icon: "❌" },
      pending: { bg: "bg-amber-500/10", text: "text-amber-400", icon: "⏳" },
    };
    const style = styles[status] || styles.pending;
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-lg ${style.bg} px-3 py-1.5 text-xs font-medium ${style.text} ring-1 ring-current ring-opacity-20`}>
        <span>{style.icon}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-slate-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Application History</h1>
            <p className="mt-1 text-sm text-slate-400">Track all your automated job applications</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/10 hover:bg-white/[0.05] hover:text-white transition-all"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              onClick={() => router.push("/agent")}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-colors"
            >
              <Play className="h-4 w-4" /> Run Another Batch
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Applications */}
            <div className="glass rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                  <Award className="h-5 w-5 text-indigo-400" />
                </div>
                <span className="text-xs font-medium text-slate-400">Total Applications</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </div>

            {/* Success Rate */}
            <div className="glass rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-slate-400">Success Rate</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">{stats.success_rate}%</div>
            </div>

            {/* Average Score */}
            <div className="glass rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                  <Zap className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-xs font-medium text-slate-400">Avg. Relevance</span>
              </div>
              <div className="text-3xl font-bold text-amber-400">{stats.avg_score.toFixed(1)}/100</div>
            </div>

            {/* Top Companies */}
            <div className="glass rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <Building2 className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-xs font-medium text-slate-400">Top Companies</span>
              </div>
              <div className="text-sm text-white">
                {stats.top_companies.slice(0, 2).map((company, i) => (
                  <div key={i}>{company}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          {/* Table Header with Sort Controls */}
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-sm font-semibold text-white">All Applications</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-white focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
              >
                <option value="date">Date</option>
                <option value="score">Score</option>
                <option value="company">Company</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-1.5 text-slate-400 hover:text-white hover:border-white/[0.12] transition-all"
              >
                {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-white/[0.08]">
            {sortedApplications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-slate-500">No applications yet. Start by running the agent!</p>
              </div>
            ) : (
              sortedApplications.map((app, idx) => (
                <div key={app.id} className="border-t border-white/[0.08] first:border-t-0">
                  {/* Main Row */}
                  <button
                    onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    className="w-full px-6 py-4 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div className="grid grid-cols-8 gap-4 items-center text-sm">
                      {/* # */}
                      <div className="text-slate-400 font-mono">{idx + 1}</div>

                      {/* Company */}
                      <div className="font-semibold text-white truncate">{app.company}</div>

                      {/* Role */}
                      <div className="text-slate-300 truncate">{app.role}</div>

                      {/* Location */}
                      <div className="text-slate-400 truncate">{app.location}</div>

                      {/* Score */}
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-16 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                            style={{ width: `${app.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-indigo-400 w-8">{app.score}</span>
                      </div>

                      {/* Status */}
                      <div>{getStatusBadge(app.status)}</div>

                      {/* Date */}
                      <div className="text-slate-400 text-xs">
                        {new Date(app.date).toLocaleDateString()}
                      </div>

                      {/* Expand */}
                      <div className="flex justify-end">
                        {expandedId === app.id ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedId === app.id && (
                    <div className="border-t border-white/[0.08] bg-white/[0.02] px-6 py-6 space-y-6">
                      {/* Job Description */}
                      {app.job_description && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 mb-2">JOB DESCRIPTION</h4>
                          <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 text-sm text-slate-300 leading-relaxed max-h-40 overflow-y-auto">
                            {app.job_description}
                          </div>
                        </div>
                      )}

                      {/* Screening Answers */}
                      {app.screening_answers && app.screening_answers.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 mb-3">SCREENING ANSWERS</h4>
                          <div className="space-y-3">
                            {app.screening_answers.map((qa, i) => (
                              <div
                                key={i}
                                className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-3 space-y-1"
                              >
                                <p className="text-xs font-medium text-slate-400">{qa.question}</p>
                                <p className="text-sm text-slate-300">{qa.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Screenshot */}
                      {app.screenshot_url && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 mb-2">CONFIRMATION</h4>
                          <a
                            href={app.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded-lg overflow-hidden border border-white/[0.08] hover:border-white/[0.12] transition-all"
                          >
                            <img
                              src={app.screenshot_url}
                              alt="Application screenshot"
                              className="max-w-sm h-auto"
                            />
                          </a>
                        </div>
                      )}

                      {/* Error Message */}
                      {app.error_message && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                          <p className="text-xs font-semibold text-red-400 mb-1">ERROR</p>
                          <p className="text-sm text-red-300">{app.error_message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        {applications.length > 0 && (
          <div className="text-center text-sm text-slate-400">
            Showing {applications.length} {applications.length === 1 ? "application" : "applications"}
          </div>
        )}
      </div>
    </div>
  );
}
