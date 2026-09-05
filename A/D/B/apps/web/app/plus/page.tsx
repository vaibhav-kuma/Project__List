"use client";

import { useEffect, useMemo, useState } from "react";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

type Plan = {
  id: string;
  tier: "free" | "plus";
  interval: string;
  currency: string;
  priceCents: number;
  active: boolean;
};

export default function PlusPage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tier, setTier] = useState<"free" | "plus">("free");
  const [sub, setSub] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("success")) setMsg("Upgrade successful. Welcome to Plus!");
    if (url.searchParams.get("canceled")) setMsg("Checkout canceled.");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const p = await fetch(`${apiBase}/billing/plans`, { credentials: "include" }).then((r) => r.json()).catch(() => ({}));
      if (!cancelled) setPlans((p?.plans ?? []) as Plan[]);

      const sResp = await fetch(`${apiBase}/billing/status`, { credentials: "include" });
      const s = await sResp.json().catch(() => ({}));
      if (!cancelled && sResp.ok) {
        setTier((s?.tier ?? "free") as any);
        setSub(s?.subscription ?? null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  async function checkout(interval: "month" | "year") {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch(`${apiBase}/billing/stripe/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interval, trialDays: 7 })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Checkout failed");
      if (json?.url) window.location.href = json.url;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch(`${apiBase}/billing/stripe/portal`, { method: "POST", credentials: "include" });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Portal failed");
      if (json?.url) window.location.href = json.url;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Portal failed");
    } finally {
      setBusy(false);
    }
  }

  const plusMonthly = plans.find((p) => p.tier === "plus" && p.interval === "month") ?? null;
  const plusYearly = plans.find((p) => p.tier === "plus" && p.interval === "year") ?? null;

  return (
    <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "8px 0" }}>Plus</h2>
          <div style={{ color: "#555" }}>
            Current tier: <b>{tier}</b>
            {sub?.status ? (
              <>
                {" "}
                · Status: <b>{sub.status}</b>
              </>
            ) : null}
          </div>
        </div>
        <a href="/" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff", textDecoration: "none", color: "inherit" }}>
          Home
        </a>
      </div>

      {msg ? <div style={{ marginTop: 12, color: msg.includes("successful") ? "#0a7" : "#b00020" }}>{msg}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Free</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#444" }}>
            <li>Basic matching</li>
            <li>Standard filters</li>
            <li>Limited rewinds</li>
          </ul>
        </div>

        <div style={{ border: "1px solid #0a7", borderRadius: 12, padding: 12 }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Plus</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#444" }}>
            <li>Advanced filters (location, interests)</li>
            <li>Unlimited rewinds</li>
            <li>Ad‑free</li>
            <li>Priority matching</li>
            <li>Exclusive filters/stickers</li>
            <li>See who added you</li>
          </ul>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button
              disabled={busy || tier === "plus" || !plusMonthly}
              onClick={() => void checkout("month")}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #0a7", background: "#0a7", color: "#fff" }}
            >
              Upgrade monthly {plusMonthly ? `($${(plusMonthly.priceCents / 100).toFixed(2)})` : ""}
            </button>
            <button
              disabled={busy || tier === "plus" || !plusYearly}
              onClick={() => void checkout("year")}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #0a7", background: "#fff", color: "#0a7" }}
            >
              Upgrade yearly {plusYearly ? `($${(plusYearly.priceCents / 100).toFixed(2)})` : ""}
            </button>

            <button
              disabled={busy || tier !== "plus"}
              onClick={() => void openPortal()}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333", background: "#333", color: "#fff" }}
            >
              Manage subscription
            </button>
          </div>
          <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>Includes 7‑day free trial (configurable).</div>
        </div>
      </div>
    </main>
  );
}

