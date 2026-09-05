"use client";

import { useEffect, useMemo, useState } from "react";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

function moderatorHeaders() {
  const key = process.env.NEXT_PUBLIC_MODERATOR_KEY;
  return key ? { "x-moderator-key": key } : {};
}

export default function ReportDetailPage({ params }: { params: { reportId: string } }) {
  const apiBase = useMemo(() => getApiBase(), []);
  const reportId = params.reportId;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      const resp = await fetch(`${apiBase}/moderation/reports/detail?reportId=${encodeURIComponent(reportId)}`, {
        credentials: "include",
        headers: moderatorHeaders()
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError("Failed to load report");
        return;
      }
      if (cancelled) return;
      setData(json);
      setReason(json?.report?.reasonCode ?? "");
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [apiBase, reportId]);

  async function decide(decision: "clear" | "warn" | "timeout" | "suspend" | "ban") {
    setBusy(true);
    try {
      const resp = await fetch(`${apiBase}/moderation/decide`, {
        method: "POST",
        headers: { "content-type": "application/json", ...moderatorHeaders() },
        credentials: "include",
        body: JSON.stringify({
          reportId,
          decision,
          reason: decision === "clear" ? "Cleared" : reason || "Policy violation",
          expiresAt: expiresAt?.trim() ? new Date(expiresAt).toISOString() : undefined,
          note: note?.trim() ? note.trim() : undefined
        })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Failed");
      // reload
      const r2 = await fetch(`${apiBase}/moderation/reports/detail?reportId=${encodeURIComponent(reportId)}`, {
        credentials: "include",
        headers: moderatorHeaders()
      });
      const j2 = await r2.json().catch(() => ({}));
      setData(j2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const report = data?.report;
  const evidence = (report?.evidence ?? []) as Array<any>;

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: "8px 0" }}>Report</h2>
          <div style={{ color: "#555" }}>ID: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{reportId}</span></div>
        </div>
        <a href="/moderation" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff", textDecoration: "none", color: "inherit" }}>
          Back to queue
        </a>
      </div>

      {error ? <div style={{ marginTop: 12, color: "#b00020" }}>{error}</div> : null}
      {!report ? <div style={{ marginTop: 12, color: "#666" }}>Loading…</div> : null}

      {report ? (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div><b>Reason</b>: {report.reasonCode}</div>
              <div><b>Status</b>: {report.status} {typeof report.triageScore === "number" ? `(score ${report.triageScore.toFixed(2)})` : ""}</div>
              <div><b>Reported user</b>: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{report.reportedUserId}</span></div>
              <div><b>Reporter</b>: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{report.reporterId}</span></div>
              {report.matchId ? <div><b>Match</b>: {report.matchId}</div> : null}
              {report.details ? <div><b>Details</b>: {report.details}</div> : null}
            </div>

            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: "0 0 8px 0" }}>Evidence</h3>
              {evidence.length === 0 ? (
                <div style={{ color: "#666" }}>No evidence attached.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {evidence.map((ev) => (
                    <a key={ev.id} href={`${apiBase}${ev.fileUrl}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
                        <div style={{ fontWeight: 700 }}>{ev.kind}</div>
                        <div style={{ color: "#666", fontSize: 12 }}>{ev.fileUrl}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <h3 style={{ margin: "0 0 10px 0" }}>Actions</h3>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Action reason</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc" }} />
            </label>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span style={{ fontWeight: 700 }}>Expires at (optional, for timeout/suspend)</span>
              <input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} placeholder="2026-05-01T12:00" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc" }} />
            </label>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span style={{ fontWeight: 700 }}>Moderator note (optional)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", resize: "vertical" }} />
            </label>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <button disabled={busy} onClick={() => void decide("clear")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}>
                Clear
              </button>
              <button disabled={busy} onClick={() => void decide("warn")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333", background: "#333", color: "#fff" }}>
                Warn
              </button>
              <button disabled={busy} onClick={() => void decide("timeout")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #c77", background: "#fff" }}>
                Timeout
              </button>
              <button disabled={busy} onClick={() => void decide("suspend")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #b00020", background: "#fff" }}>
                Suspend
              </button>
              <button disabled={busy} onClick={() => void decide("ban")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #b00020", background: "#b00020", color: "#fff" }}>
                Ban
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

