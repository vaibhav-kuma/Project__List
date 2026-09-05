"use client";

export default function AgeRulesPage() {
  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto", lineHeight: 1.55 }}>
      <h2 style={{ margin: "8px 0" }}>Age-Appropriate Content Rules</h2>
      <div style={{ color: "#555" }}>Version v1 · Last updated: 2026-04-18</div>

      <h3 style={{ marginTop: 16 }}>General</h3>
      <ul>
        <li>No nudity, explicit content, or sexual solicitation.</li>
        <li>No attempts to move conversations to private channels for minors.</li>
        <li>No sharing of personal data (address, school, phone) with strangers.</li>
      </ul>

      <h3>Minors</h3>
      <p>Additional restrictions may apply to accounts identified as minors (data minimization, safety prompts, restricted discoverability).</p>

      <h3>Enforcement</h3>
      <p>Violations can result in warnings, suspensions, bans, and reporting to relevant authorities where required.</p>
    </main>
  );
}

