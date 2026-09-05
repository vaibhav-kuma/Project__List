import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8f9fa", fontFamily: "system-ui, sans-serif" }}>
      <aside style={{ width: "260px", background: "#1f2937", color: "white", padding: "20px" }}>
        <h2 style={{ margin: "0 0 30px", fontSize: "20px", fontWeight: "bold" }}>Ninor Admin</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link href="/admin" style={{ color: "#e5e7eb", textDecoration: "none", padding: "10px", borderRadius: "6px", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#374151"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
            Dashboard
          </Link>
          <Link href="/admin/users" style={{ color: "#e5e7eb", textDecoration: "none", padding: "10px", borderRadius: "6px", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#374151"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
            User Management
          </Link>
          <Link href="/admin/moderation" style={{ color: "#e5e7eb", textDecoration: "none", padding: "10px", borderRadius: "6px", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#374151"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
            Moderation Queue
          </Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
