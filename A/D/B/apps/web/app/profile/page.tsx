"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

const MeSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    emailVerifiedAt: z.string().nullable().optional(),
    status: z.string()
  }),
  profile: z.any().nullable(),
  privacy: z.any().nullable()
});

export default function ProfilePage() {
  const base = useMemo(() => apiBase(), []);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("undisclosed");
  const [discoverable, setDiscoverable] = useState(true);
  const [prefGender, setPrefGender] = useState<"any" | "male" | "female" | "other" | "undisclosed">("any");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(99);

  const [qr, setQr] = useState<string | null>(null);
  const [totp, setTotp] = useState("");

  async function loadMe() {
    setLoading(true);
    setMsg(null);
    try {
      const resp = await fetch(`${base}/me`, { credentials: "include" });
      const data = await resp.json();
      const parsed = MeSchema.safeParse(data);
      if (!resp.ok || !parsed.success) {
        window.location.href = "/auth/login";
        return;
      }
      setMe(parsed.data);
      setDisplayName(parsed.data.profile?.displayName ?? "");
      setBio(parsed.data.profile?.bio ?? "");
      setGender(parsed.data.profile?.gender ?? "undisclosed");
      setDiscoverable(parsed.data.privacy?.discoverable ?? true);
      const prefs = (parsed.data.profile?.preferences ?? {}) as any;
      setPrefGender((prefs.genderPreference ?? "any") as any);
      setAgeMin(Number(prefs.ageMin ?? 18));
      setAgeMax(Number(prefs.ageMax ?? 99));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setMsg(null);
    const resp = await fetch(`${base}/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        displayName: displayName.trim() ? displayName.trim() : undefined,
        bio: bio.trim() ? bio.trim() : undefined,
        gender,
        preferences: {
          genderPreference: prefGender,
          ageMin,
          ageMax
        },
        privacy: { discoverable }
      })
    });
    if (resp.ok) setMsg("Saved.");
    else setMsg("Save failed.");
    await loadMe();
  }

  async function uploadAvatar(file: File) {
    setMsg(null);
    const fd = new FormData();
    fd.append("avatar", file);
    const resp = await fetch(`${base}/profile/avatar`, { method: "POST", body: fd, credentials: "include" });
    setMsg(resp.ok ? "Avatar updated." : "Avatar upload failed.");
    await loadMe();
  }

  async function start2fa() {
    setMsg(null);
    const resp = await fetch(`${base}/2fa/setup/start`, { method: "POST", credentials: "include" });
    const data = await resp.json();
    if (!resp.ok) return setMsg("2FA setup failed.");
    setQr(data.qrDataUrl ?? null);
    setMsg("Scan QR in Authenticator, then verify.");
  }

  async function verify2fa() {
    setMsg(null);
    const resp = await fetch(`${base}/2fa/setup/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token: totp })
    });
    const data = await resp.json();
    if (!resp.ok) return setMsg(data?.error ?? "2FA verify failed.");
    setMsg("2FA enabled.");
    setQr(null);
    setTotp("");
  }

  async function logout() {
    await fetch(`${base}/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = "/auth/login";
  }

  async function deleteAccount() {
    const ok = window.confirm("Delete account? This will disable your user.");
    if (!ok) return;
    await fetch(`${base}/account`, { method: "DELETE", credentials: "include" });
    await fetch(`${base}/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = "/";
  }

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: "8px 0" }}>Profile</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => (window.location.href = "/match")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}>
            Go to matching
          </button>
          <button onClick={logout} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ color: "#555", marginBottom: 14 }}>User: <b>{me?.user?.id}</b> · Status: <b>{me?.user?.status}</b></div>
      {msg ? <div style={{ marginBottom: 12, color: msg.includes("failed") ? "#b00020" : "#0a7" }}>{msg}</div> : null}

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Edit profile</h3>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={3} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
        <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
          <option value="undisclosed">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={discoverable} onChange={(e) => setDiscoverable(e.target.checked)} />
          Discoverable
        </label>

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Matching preferences</div>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Gender preference</span>
              <select value={prefGender} onChange={(e) => setPrefGender(e.target.value as any)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
                <option value="any">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="undisclosed">Undisclosed</option>
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Age min</span>
                <input type="number" min={18} max={99} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Age max</span>
                <input type="number" min={18} max={99} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
              </label>
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Note: current server policy matches **18+ only** (minors are gated for future parental-consent flow).
            </div>
          </div>
        </div>

        <button onClick={save} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}>
          Save
        </button>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Profile picture</span>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </label>
      </section>

      <section style={{ marginTop: 14, padding: 16, border: "1px solid #ddd", borderRadius: 12, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Two-factor authentication (TOTP)</h3>
        <button onClick={start2fa} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}>
          Start 2FA setup
        </button>
        {qr ? (
          <div style={{ display: "grid", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="2FA QR" style={{ width: 220, height: 220, border: "1px solid #eee" }} />
            <input value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="Enter 6-digit code" style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
            <button onClick={verify2fa} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}>
              Verify and enable
            </button>
          </div>
        ) : null}
      </section>

      <section style={{ marginTop: 14, padding: 16, border: "1px solid #ffd7d7", borderRadius: 12, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Danger zone</h3>
        <button onClick={deleteAccount} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #b00020", background: "#b00020", color: "#fff" }}>
          Delete account
        </button>
      </section>
    </main>
  );
}

