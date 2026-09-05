"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

const ProfileSchema = z.object({
  userId: z.string().uuid(),
  age: z.number().int().min(18).max(99),
  gender: z.enum(["male", "female", "other", "undisclosed"])
});

type Profile = z.infer<typeof ProfileSchema>;

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

function loadLocalProfile(): Profile | null {
  try {
    const raw = localStorage.getItem("ninor_profile_v1");
    if (!raw) return null;
    const parsed = ProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function saveLocalProfile(p: Profile) {
  localStorage.setItem("ninor_profile_v1", JSON.stringify(p));
}

export default function HomePage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [age, setAge] = useState<number>(18);
  const [gender, setGender] = useState<Profile["gender"]>("undisclosed");
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = loadLocalProfile();
    if (p) {
      setUserId(p.userId);
      setAge(p.age);
      setGender(p.gender);
    }
  }, []);

  async function upsertProfile() {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(`${apiBase}/profile/upsert`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: userId ?? undefined, age, gender })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message ?? "Failed to save profile");
      const p: Profile = { userId: data.userId, age, gender };
      saveLocalProfile(p);
      setUserId(p.userId);
      window.location.href = "/match";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ margin: "8px 0 16px" }}>Ninor Video Chat (MVP)</h1>
      <p style={{ margin: "0 0 20px", color: "#444" }}>
        Create a basic profile, then start random 15-second video matches.
      </p>

      <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Age (18+)</span>
          <input
            type="number"
            value={age}
            min={18}
            max={99}
            onChange={(e) => setAge(Number(e.target.value))}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Gender</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Profile["gender"])}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          >
            <option value="undisclosed">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>

        <button
          onClick={upsertProfile}
          disabled={saving}
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: saving ? "#999" : "#111",
            color: "white",
            cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? "Saving..." : "Continue to matching"}
        </button>

        {error ? <div style={{ color: "#b00020" }}>{error}</div> : null}
        {userId ? <div style={{ color: "#666", fontSize: 12 }}>User: {userId}</div> : null}
      </div>
    </main>
  );
}

