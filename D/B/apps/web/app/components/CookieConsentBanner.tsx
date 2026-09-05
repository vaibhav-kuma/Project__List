"use client";

import { useEffect, useState } from "react";

const KEY = "ninor_cookie_consent_v1";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (!v) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ acceptedAt: new Date().toISOString() }));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 50,
        background: "#111",
        color: "#fff",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap"
      }}
    >
      <div style={{ maxWidth: 820, lineHeight: 1.35 }}>
        We use essential cookies to keep you signed in and improve safety. See our{" "}
        <a href="/legal/privacy" style={{ color: "#8cf" }}>
          Privacy Policy
        </a>
        .
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <a href="/legal/privacy" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333", background: "#222", color: "#fff", textDecoration: "none" }}>
          Learn more
        </a>
        <button onClick={accept} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #0a7", background: "#0a7", color: "#fff" }}>
          Accept
        </button>
      </div>
    </div>
  );
}

