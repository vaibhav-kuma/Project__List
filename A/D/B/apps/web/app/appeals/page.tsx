"use client";

import { useMemo, useState } from "react";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

export default function AppealsPage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [moderationActionId, setModerationActionId] = useState("");
  const [userSanctionId, setUserSanctionId] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch(`${apiBase}/appeals/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          moderationActionId: moderationActionId.trim() || undefined,
          userSanctionId: userSanctionId.trim() || undefined,
          summary,
          details: details.trim() || undefined
        })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Failed to submit appeal");
      setMsg("Appeal submitted. Our team will review it.");
      setModerationActionId("");
      setUserSanctionId("");
      setSummary("");
      setDetails("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to submit appeal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 820, margin: "0 auto" }}>
      <h2 style={{ margin: "8px 0" }}>Appeal a moderation decision</h2>
      <div style={{ color: "#555" }}>
        If you believe a warning/timeout/ban was applied in error, you can appeal it here.
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Moderation action ID (optional)</span>
          <input value={moderationActionId} onChange={(e) => setModerationActionId(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Sanction ID (optional)</span>
          <input value={userSanctionId} onChange={(e) => setUserSanctionId(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Short summary</span>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="At least 10 characters" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Details (optional)</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", resize: "vertical" }} />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            disabled={busy || summary.trim().length < 10 || (!moderationActionId.trim() && !userSanctionId.trim())}
            onClick={() => void submit()}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #0a7", background: "#0a7", color: "#fff" }}
          >
            Submit appeal
          </button>
        </div>

        {msg ? <div style={{ color: msg.startsWith("Appeal") ? "#0a7" : "#b00020" }}>{msg}</div> : null}
      </div>
    </main>
  );
}

