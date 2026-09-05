"use client";

export default function GuidelinesPage() {
  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto", lineHeight: 1.55 }}>
      <h2 style={{ margin: "8px 0" }}>Community Guidelines</h2>
      <div style={{ color: "#555" }}>Version v1 · Last updated: 2026-04-18</div>

      <h3 style={{ marginTop: 16 }}>Be respectful</h3>
      <p>No harassment, hate speech, threats, or discriminatory behavior.</p>

      <h3>No sexual content</h3>
      <p>Keep interactions PG-13. No nudity, explicit content, or sexual solicitation.</p>

      <h3>Protect minors</h3>
      <p>Any attempt to engage minors sexually or request sensitive information results in immediate enforcement.</p>

      <h3>Scams and impersonation</h3>
      <p>No scams, payment requests, or impersonation of individuals/organizations.</p>

      <h3>Safety tools</h3>
      <ul>
        <li>Use <b>Emergency exit</b> if you feel unsafe.</li>
        <li>Use <b>Report</b> for policy violations.</li>
        <li>Use <b>Block</b> to prevent further contact.</li>
      </ul>
    </main>
  );
}

