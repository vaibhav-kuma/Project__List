"use client";

import { useEffect, useState } from "react";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

export default function AdminModerationPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/admin/moderation/cases`, { credentials: "omit" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch cases");
      setCases(data.cases || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const resolveCase = async (id: string, action: string) => {
    if (!confirm(`Apply action: ${action} to this case?`)) return;
    try {
      const res = await fetch(`${getApiBase()}/admin/moderation/cases/${id}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: "Admin manual resolution" }),
        credentials: "omit"
      });
      if (!res.ok) throw new Error("Failed to resolve case");
      setCases(cases.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 30 }}>Moderation Queue</h1>

      {error ? <div style={{ color: "red", marginBottom: 20 }}>{error}</div> : null}

      <div style={{ display: "grid", gap: "20px" }}>
        {loading ? (
          <div>Loading queue...</div>
        ) : cases.length === 0 ? (
          <div style={{ padding: 20, background: "white", borderRadius: 8, color: "#6b7280" }}>Hooray! The moderation queue is empty.</div>
        ) : cases.map((c) => (
          <div key={c.id} style={{ background: "white", padding: 20, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
              <div>
                <strong>Case ID:</strong> <span style={{ fontSize: "14px", color: "#6b7280" }}>{c.id}</span>
              </div>
              <div>
                <span style={{ padding: "4px 8px", background: "#fef3c7", color: "#92400e", borderRadius: "99px", fontSize: "12px", fontWeight: "bold" }}>Pending Review</span>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <p style={{ margin: "0 0 5px", fontSize: "14px", color: "#6b7280" }}><strong>Report Reason:</strong></p>
                <p style={{ margin: "0 0 15px", fontSize: "16px" }}>{c.report?.reasonCode || "Unknown"}</p>
                
                <p style={{ margin: "0 0 5px", fontSize: "14px", color: "#6b7280" }}><strong>Details:</strong></p>
                <p style={{ margin: 0, fontSize: "14px", background: "#f9fafb", padding: "10px", borderRadius: "6px" }}>
                  {c.report?.details || "No additional details provided."}
                </p>
              </div>
              <div>
                <p style={{ margin: "0 0 5px", fontSize: "14px", color: "#6b7280" }}><strong>Reported User:</strong></p>
                <p style={{ margin: "0 0 15px", fontSize: "14px" }}>{c.reportedUser?.email || c.reportedUserId}</p>
                
                <p style={{ margin: "0 0 5px", fontSize: "14px", color: "#6b7280" }}><strong>Action:</strong></p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button onClick={() => resolveCase(c.id, "warn")} style={{ padding: "6px 12px", background: "#eab308", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>Warn</button>
                  <button onClick={() => resolveCase(c.id, "suspend")} style={{ padding: "6px 12px", background: "#f97316", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>Suspend</button>
                  <button onClick={() => resolveCase(c.id, "ban")} style={{ padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>Ban</button>
                  <button onClick={() => resolveCase(c.id, "none")} style={{ padding: "6px 12px", background: "#9ca3af", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>Dismiss (No Action)</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
