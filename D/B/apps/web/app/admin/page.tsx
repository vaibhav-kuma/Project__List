"use client";

import { useEffect, useState } from "react";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [anRes, hlRes] = await Promise.all([
          fetch(`${getApiBase()}/admin/analytics`, { credentials: "omit" }), // Normally "include", omit for easy testing
          fetch(`${getApiBase()}/admin/health`, { credentials: "omit" })
        ]);
        
        const anData = await anRes.json();
        const hlData = await hlRes.json();
        
        if (!anRes.ok) throw new Error(anData.error || "Failed to fetch analytics");
        if (!hlRes.ok) throw new Error(hlData.error || "Failed to fetch health");
        
        setData(anData);
        setHealth(hlData);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchData();
  }, []);

  if (error) {
    return <div style={{ color: "red", padding: 20 }}>Error: {error}. Are you an admin?</div>;
  }

  if (!data || !health) {
    return <div style={{ padding: 20 }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: 30, fontSize: 24, fontWeight: 'bold' }}>Platform Overview</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 40 }}>
        <StatCard title="Daily Active Users" value={data.dau} />
        <StatCard title="Total Matches" value={data.totalMatches} />
        <StatCard title="Avg Match Duration" value={`${Math.round(data.avgMatchDurationSeconds)}s`} />
        <StatCard title="Premium Users" value={data.premiumCount} />
        <StatCard title="Conversion Rate" value={`${(data.premiumConversionRate * 100).toFixed(2)}%`} />
        <StatCard title="Total Users" value={data.totalUsers} />
      </div>

      <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 'bold' }}>System Health</h2>
      <div style={{ background: "white", padding: 20, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <p><strong>DB Status:</strong> <span style={{ color: health.db === "ok" ? "green" : "red" }}>{health.db.toUpperCase()}</span></p>
        <p><strong>Uptime:</strong> {Math.round(health.uptime / 60)} minutes</p>
        <p><strong>Memory Usage:</strong> {Math.round(health.memory.rss / 1024 / 1024)} MB</p>
        <p><strong>OS Load Avg:</strong> {health.osLoad.map((l: number) => l.toFixed(2)).join(", ")}</p>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string, value: string | number }) {
  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={{ color: "#6b7280", fontSize: "14px", fontWeight: 500 }}>{title}</span>
      <span style={{ fontSize: "28px", fontWeight: "bold", color: "#111827" }}>{value}</span>
    </div>
  );
}
