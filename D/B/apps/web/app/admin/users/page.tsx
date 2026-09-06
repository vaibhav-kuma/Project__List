"use client";

import { useEffect, useState } from "react";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/admin/users?search=${search}`, { credentials: "omit" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const setStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Change status of user to ${newStatus}?`)) return;
    try {
      const res = await fetch(`${getApiBase()}/admin/users/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "omit"
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>User Management</h1>
        <input 
          type="text" 
          placeholder="Search ID, email, phone..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", width: "300px" }}
        />
      </div>

      {error ? <div style={{ color: "red", marginBottom: 20 }}>{error}</div> : null}

      <div style={{ background: "white", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>ID</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Email</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Gender</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: "center" }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: "center" }}>No users found.</td></tr>
            ) : users.map(user => (
              <tr key={user.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}>{user.id}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px" }}>{user.email || "N/A"}</td>
                <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: "99px", 
                    fontSize: "12px", 
                    fontWeight: 500,
                    background: user.status === "active" ? "#d1fae5" : user.status === "banned" ? "#fee2e2" : "#fef3c7",
                    color: user.status === "active" ? "#065f46" : user.status === "banned" ? "#991b1b" : "#92400e"
                  }}>
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: "14px" }}>{user.profile?.gender || "N/A"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {user.status !== "banned" && (
                      <button onClick={() => setStatus(user.id, "banned")} style={{ padding: "4px 10px", fontSize: "12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Ban</button>
                    )}
                    {user.status !== "active" && (
                      <button onClick={() => setStatus(user.id, "active")} style={{ padding: "4px 10px", fontSize: "12px", background: "#10b981", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Unban</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
