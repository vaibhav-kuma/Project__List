"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const MeSchema = z.object({
  user: z.object({ id: z.string() })
});

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

type FeedMoment = {
  id: string;
  createdAt: string;
  expiresAt: string;
  caption?: string | null;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  mimeType: string;
  visibility?: "public" | "friends";
  viewCount?: number;
  reactionCount?: number;
  metadata?: any;
  user: { id: string; age: number | null; gender: string };
};

type MomentOverlayText = {
  type: "text";
  text: string;
  x: number; // 0..1
  y: number; // 0..1
  color: string;
  size: number; // px
};

type MomentOverlaySticker = {
  type: "sticker";
  sticker: string;
  x: number;
  y: number;
  size: number;
};

type MomentMetadata = {
  filter?: "none" | "beauty" | "bw" | "sepia";
  overlays?: Array<MomentOverlayText | MomentOverlaySticker>;
};

export default function MomentsPage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"public" | "friends">("public");
  const [tab, setTab] = useState<"friends" | "discover">("friends");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedMoment[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Editor state (MVP)
  const [editorFilter, setEditorFilter] = useState<MomentMetadata["filter"]>("none");
  const [overlayText, setOverlayText] = useState("Hello");
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [overlaySize, setOverlaySize] = useState(28);
  const [overlayX, setOverlayX] = useState(0.5);
  const [overlayY, setOverlayY] = useState(0.2);
  const [sticker, setSticker] = useState("🔥");

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const resp = await fetch(`${apiBase}/me`, { credentials: "include" });
      const data = await resp.json().catch(() => ({}));
      const parsed = MeSchema.safeParse(data);
      if (!resp.ok || !parsed.success) {
        window.location.href = "/auth/login";
        return;
      }
      if (cancelled) return;
      setUserId(parsed.data.user.id);
      await loadFeed();
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  async function loadFeed() {
    setLoadingFeed(true);
    setMessage(null);
    try {
      const url =
        tab === "discover"
          ? `${apiBase}/moments/feed/discover?limit=50`
          : `${apiBase}/moments/feed/friends?userId=${encodeURIComponent(userId ?? "")}&limit=50`;
      const resp = await fetch(url);
      const data = await resp.json().catch(() => ({}));
      const moments = (data?.moments ?? []) as FeedMoment[];
      setFeed(moments);
    } catch {
      setMessage("Failed to load feed");
    } finally {
      setLoadingFeed(false);
    }
  }

  async function createMoment() {
    if (!userId) return;
    if (!file) {
      setMessage("Choose an image/video file first.");
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("userId", userId);
      if (caption.trim()) fd.append("caption", caption.trim());
      fd.append("media", file);
      fd.append("visibility", visibility);
      const meta: MomentMetadata = {
        filter: editorFilter ?? "none",
        overlays: []
      };
      if (overlayText.trim()) {
        meta.overlays!.push({
          type: "text",
          text: overlayText.trim(),
          x: overlayX,
          y: overlayY,
          color: overlayColor,
          size: overlaySize
        });
      }
      if (sticker) {
        meta.overlays!.push({ type: "sticker", sticker, x: 0.75, y: 0.25, size: 44 });
      }
      fd.append("metadata", JSON.stringify(meta));

      const resp = await fetch(`${apiBase}/moments/create`, { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "Upload failed");
      setCaption("");
      setFile(null);
      setMessage("Moment posted (dev auto-approved).");
      await loadFeed();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function viewMoment(m: FeedMoment) {
    if (!userId) return;
    await fetch(`${apiBase}/moments/view`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ momentId: m.id, viewerUserId: userId })
    }).catch(() => {});
  }

  async function react(m: FeedMoment, reaction: string) {
    if (!userId) return;
    await fetch(`${apiBase}/moments/react`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ momentId: m.id, userId, reaction })
    }).catch(() => {});
    await loadFeed();
  }

  async function report(m: FeedMoment) {
    if (!userId) return;
    await fetch(`${apiBase}/reports/create`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reporterId: userId, reportedUserId: m.user.id, momentId: m.id, reasonCode: "moment_inappropriate" })
    }).catch(() => {});
    setMessage("Reported.");
  }

  function openViewerAt(idx: number) {
    setViewerIndex(idx);
    setViewerOpen(true);
    const m = feed[idx];
    if (m) void viewMoment(m);
  }

  function next() {
    const ni = Math.min(feed.length - 1, viewerIndex + 1);
    setViewerIndex(ni);
    const m = feed[ni];
    if (m) void viewMoment(m);
  }

  function prev() {
    const pi = Math.max(0, viewerIndex - 1);
    setViewerIndex(pi);
    const m = feed[pi];
    if (m) void viewMoment(m);
  }

  function cssFilterFromMeta(meta: MomentMetadata | null | undefined) {
    const f = meta?.filter ?? "none";
    if (f === "beauty") return "brightness(1.06) contrast(1.08) saturate(1.15)";
    if (f === "bw") return "grayscale(1)";
    if (f === "sepia") return "sepia(1)";
    return "none";
  }

  function parseMeta(raw: any): MomentMetadata | null {
    if (!raw) return null;
    try {
      if (typeof raw === "string") return JSON.parse(raw);
      if (typeof raw === "object") return raw as MomentMetadata;
      return null;
    } catch {
      return null;
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "8px 0" }}>Moments</h2>
          <div style={{ color: "#555" }}>Stories-style posts (24h expiry). In dev, they auto-approve.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => (window.location.href = "/match")}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
          >
            Back to matching
          </button>
          <button
            onClick={loadFeed}
            disabled={loadingFeed}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
          >
            Refresh
          </button>
        </div>
      </div>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h3 style={{ margin: "0 0 10px" }}>Post a moment</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
            <option value="public">Visibility: Public</option>
            <option value="friends">Visibility: Friends only</option>
          </select>

          <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Editor (MVP)</div>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Filter</span>
                <select value={editorFilter} onChange={(e) => setEditorFilter(e.target.value as any)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
                  <option value="none">None</option>
                  <option value="beauty">Beauty</option>
                  <option value="bw">B&W</option>
                  <option value="sepia">Sepia</option>
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Text overlay</span>
                  <input value={overlayText} onChange={(e) => setOverlayText(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Color</span>
                  <input type="color" value={overlayColor} onChange={(e) => setOverlayColor(e.target.value)} style={{ height: 42, width: 54 }} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Size</span>
                  <input type="number" min={12} max={64} value={overlaySize} onChange={(e) => setOverlaySize(Number(e.target.value))} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>X (0-1)</span>
                  <input type="number" min={0} max={1} step={0.05} value={overlayX} onChange={(e) => setOverlayX(Number(e.target.value))} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Y (0-1)</span>
                  <input type="number" min={0} max={1} step={0.05} value={overlayY} onChange={(e) => setOverlayY(Number(e.target.value))} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Sticker</span>
                <select value={sticker} onChange={(e) => setSticker(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
                  <option value="🔥">🔥</option>
                  <option value="😂">😂</option>
                  <option value="❤️">❤️</option>
                  <option value="😎">😎</option>
                  <option value="✨">✨</option>
                  <option value="">(none)</option>
                </select>
              </label>
            </div>
          </div>

          <button
            onClick={createMoment}
            disabled={uploading}
            style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
          >
            {uploading ? "Posting..." : "Post"}
          </button>
          {message ? <div style={{ color: message.includes("failed") ? "#b00020" : "#0a7" }}>{message}</div> : null}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ margin: "0 0 10px" }}>Feed</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setTab("friends"); void loadFeed(); }}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", background: tab === "friends" ? "#111" : "#fff", color: tab === "friends" ? "#fff" : "#111" }}
            >
              Friends
            </button>
            <button
              onClick={() => { setTab("discover"); void loadFeed(); }}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", background: tab === "discover" ? "#111" : "#fff", color: tab === "discover" ? "#fff" : "#111" }}
            >
              Discover
            </button>
          </div>
        </div>
        {loadingFeed ? <div>Loading…</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {feed.map((m, idx) => (
            <div key={m.id} style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: 10, background: "#fafafa", borderBottom: "1px solid #eee" }}>
                <div style={{ fontSize: 12, color: "#444" }}>
                  User: {m.user.id.slice(0, 8)}… · {m.user.gender} · {m.user.age ?? "?"}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Expires: {new Date(m.expiresAt).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Views: <b>{m.viewCount ?? 0}</b> · Reactions: <b>{m.reactionCount ?? 0}</b>
                </div>
              </div>
              <button
                onClick={() => openViewerAt(idx)}
                style={{ all: "unset", cursor: "pointer", display: "block", background: "#000" }}
              >
                {m.mimeType.startsWith("video/") ? (
                  <video src={`${apiBase}${m.mediaUrl}`} controls playsInline style={{ width: "100%", height: 260, objectFit: "cover" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${apiBase}${m.mediaUrl}`} alt="" style={{ width: "100%", height: 260, objectFit: "cover" }} />
                )}
              </button>
              {m.caption ? <div style={{ padding: 10 }}>{m.caption}</div> : null}
              <div style={{ padding: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => react(m, "like")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}>
                  Like
                </button>
                <button onClick={() => react(m, "fire")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}>
                  Fire
                </button>
                <button onClick={() => report(m)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #b00020", background: "#b00020", color: "#fff" }}>
                  Report
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {viewerOpen && feed[viewerIndex] ? (
        <div
          onKeyDown={(e) => {
            if (e.key === "Escape") setViewerOpen(false);
            if (e.key === "ArrowRight") next();
            if (e.key === "ArrowLeft") prev();
          }}
          tabIndex={0}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "grid",
            placeItems: "center",
            padding: 16
          }}
        >
          <div
            style={{ width: "min(520px, 96vw)", height: "min(860px, 92vh)", background: "#000", borderRadius: 16, overflow: "hidden", position: "relative" }}
            onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const start = touchStartX.current;
              const end = e.changedTouches[0]?.clientX ?? null;
              touchStartX.current = null;
              if (start === null || end === null) return;
              const dx = end - start;
              if (dx < -40) next();
              if (dx > 40) prev();
            }}
          >
            <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", zIndex: 2 }}>
              <button onClick={() => setViewerOpen(false)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(0,0,0,0.3)", color: "#fff" }}>
                Close
              </button>
              <div style={{ color: "#fff", fontSize: 12 }}>
                {viewerIndex + 1}/{feed.length}
              </div>
            </div>

            {(() => {
              const m = feed[viewerIndex]!;
              const meta = parseMeta(m.metadata);
              const filterCss = cssFilterFromMeta(meta);
              return (
                <>
                  {m.mimeType.startsWith("video/") ? (
                    <video
                      src={`${apiBase}${m.mediaUrl}`}
                      controls
                      autoPlay
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover", filter: filterCss }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${apiBase}${m.mediaUrl}`}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", filter: filterCss }}
                    />
                  )}

                  {(meta?.overlays ?? []).map((o, i) => {
                    const left = `${Math.round((o as any).x * 100)}%`;
                    const top = `${Math.round((o as any).y * 100)}%`;
                    if ((o as any).type === "text") {
                      const t = o as MomentOverlayText;
                      return (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            left,
                            top,
                            transform: "translate(-50%, -50%)",
                            color: t.color,
                            fontSize: t.size,
                            fontWeight: 700,
                            textShadow: "0 2px 12px rgba(0,0,0,0.65)",
                            padding: "6px 10px",
                            borderRadius: 12,
                            background: "rgba(0,0,0,0.15)",
                            maxWidth: "90%",
                            zIndex: 3
                          }}
                        >
                          {t.text}
                        </div>
                      );
                    }
                    const s = o as MomentOverlaySticker;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left,
                          top,
                          transform: "translate(-50%, -50%)",
                          fontSize: s.size,
                          textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                          zIndex: 3
                        }}
                      >
                        {s.sticker}
                      </div>
                    );
                  })}
                </>
              );
            })()}

            <button onClick={prev} style={{ position: "absolute", inset: "0 auto 0 0", width: "40%", background: "transparent", border: "none" }} aria-label="Prev" />
            <button onClick={next} style={{ position: "absolute", inset: "0 0 0 auto", width: "40%", background: "transparent", border: "none" }} aria-label="Next" />
          </div>
        </div>
      ) : null}
    </main>
  );
}

