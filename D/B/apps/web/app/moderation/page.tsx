"use client";

import { useEffect, useMemo, useState } from "react";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

function moderatorHeaders() {
  const key = process.env.NEXT_PUBLIC_MODERATOR_KEY;
  return key ? { "x-moderator-key": key } : {};
}

type ReportRow = {
  id: string;
  createdAt: string;
  reporterId: string;
  reportedUserId: string;
  matchId?: string | null;
  momentId?: string | null;
  reasonCode: string;
  status: string;
  triageScore?: number | null;
  evidence?: Array<{ id: string; kind: string; fileUrl: string }>;
};

export default function ModerationQueuePage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [status, setStatus] = useState<string>("open");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      const qs = new URLSearchParams();
      if (status !== "all") qs.set("status", status);
      qs.set("limit", "100");
      const resp = await fetch(`${apiBase}/moderation/queue?${qs.toString()}`, {
        credentials: "include",
        headers: moderatorHeaders()
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data?.error ? "Failed to load queue" : "Failed to load queue");
        return;
      }
      if (cancelled) return;
      setRows((data?.reports ?? []) as ReportRow[]);
    }
    void load();
    const t = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [apiBase, status]);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: "8px 0" }}>Moderation queue</h2>
          <div style={{ color: "#555" }}>Prioritized by severity and freshness.</div>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
        >
          <option value="open">Open</option>
          <option value="triaged">Triaged</option>
          <option value="in_review">In review</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>
      </div>

      {error ? <div style={{ marginTop: 12, color: "#b00020" }}>{error}</div> : null}

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 1fr 110px 110px", gap: 0, padding: 10, background: "#fafafa", borderBottom: "1px solid #eee", fontWeight: 700 }}>
          <div>Created</div>
          <div>Reason</div>
          <div>Reported user</div>
          <div>Score</div>
          <div>Status</div>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 12, color: "#666" }}>No items.</div>
        ) : (
          rows.map((r) => (
            <a
              key={r.id}
              href={`/moderation/${r.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "220px 1fr 1fr 110px 110px",
                gap: 0,
                padding: 10,
                borderBottom: "1px solid #f0f0f0",
                textDecoration: "none",
                color: "inherit"
              }}
            >
              <div style={{ color: "#444" }}>{new Date(r.createdAt).toLocaleString()}</div>
              <div style={{ fontWeight: 600 }}>{r.reasonCode}</div>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }}>{r.reportedUserId}</div>
              <div>{typeof r.triageScore === "number" ? r.triageScore.toFixed(2) : "-"}</div>
              <div>{r.status}</div>
            </a>
          ))
        )}
      </div>
    </main>
  );
}

