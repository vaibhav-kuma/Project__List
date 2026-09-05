"use client";

import { useMemo, useState } from "react";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().regex(/^\d{6}$/).optional()
});

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

export default function LoginPage() {
  const base = useMemo(() => apiBase(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setLoading(true);
    setError(null);
    const parsed = LoginSchema.safeParse({
      email,
      password,
      totp: totp.trim() ? totp.trim() : undefined
    });
    if (!parsed.success) {
      setLoading(false);
      setError("Invalid input.");
      return;
    }
    try {
      const resp = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(parsed.data)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "Login failed");
      window.location.href = "/profile";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      <h2 style={{ margin: "8px 0 4px" }}>Login</h2>
      <div style={{ color: "#555", marginBottom: 16 }}>Email/password with optional TOTP 2FA.</div>

      <div style={{ display: "grid", gap: 10, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <a
          href={`${base}/auth/oauth/google/start`}
          style={{
            display: "inline-block",
            textAlign: "center",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "#fff",
            textDecoration: "none",
            color: "#111"
          }}
        >
          Continue with Google
        </a>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
        <input value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="2FA code (if enabled)" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
        <button onClick={onLogin} disabled={loading} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}>
          {loading ? "Logging in..." : "Login"}
        </button>
        {error ? <div style={{ color: "#b00020" }}>{error}</div> : null}
        <div style={{ fontSize: 12, color: "#666" }}>
          Don’t have an account? <a href="/auth/register">Register</a>
        </div>
      </div>
    </main>
  );
}

