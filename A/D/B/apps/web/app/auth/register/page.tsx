"use client";

import { useMemo, useState } from "react";
import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["male", "female", "other", "undisclosed"]),
  bio: z.string().max(200).optional(),
  parentEmail: z.string().email().optional()
});

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

export default function RegisterPage() {
  const base = useMemo(() => apiBase(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "undisclosed">("undisclosed");
  const [bio, setBio] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [phase, setPhase] = useState<"form" | "verify">("form");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    setError(null);
    const parsed = RegisterSchema.safeParse({
      email,
      password,
      dob,
      gender,
      bio: bio.trim() ? bio.trim() : undefined,
      parentEmail: parentEmail.trim() ? parentEmail.trim() : undefined
    });
    if (!parsed.success) {
      setLoading(false);
      setError("Please fix the form fields.");
      return;
    }
    try {
      const resp = await fetch(`${base}/auth/register/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          termsVersion: "v1",
          privacyVersion: "v1"
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "Registration failed");
      setDevCode(data.devCode ?? null);
      setPhase("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${base}/auth/register/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "Verification failed");
      window.location.href = "/profile";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ margin: "8px 0 4px" }}>Create account</h2>
      <div style={{ color: "#555", marginBottom: 16 }}>
        Dev mode uses an on-screen verification code. Production would send email/SMS.
      </div>

      {phase === "form" ? (
        <div style={{ display: "grid", gap: 10, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 10 chars)" type="password" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          <input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="DOB (YYYY-MM-DD)" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          <select value={gender} onChange={(e) => setGender(e.target.value as any)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
            <option value="undisclosed">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio (optional)" rows={3} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          <input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="Parent email (required if under 18)" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />

          <button onClick={start} disabled={loading} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}>
            {loading ? "Creating..." : "Create account"}
          </button>
          {error ? <div style={{ color: "#b00020" }}>{error}</div> : null}
          <div style={{ fontSize: 12, color: "#666" }}>
            By continuing you accept Terms (v1) and Privacy Policy (v1).
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <div>Enter the 6-digit code sent to <b>{email}</b>.</div>
          {devCode ? <div style={{ color: "#0a7" }}>Dev verification code: <b>{devCode}</b></div> : null}
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
          <button onClick={verify} disabled={loading} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}>
            {loading ? "Verifying..." : "Verify and continue"}
          </button>
          {error ? <div style={{ color: "#b00020" }}>{error}</div> : null}
        </div>
      )}
    </main>
  );
}

