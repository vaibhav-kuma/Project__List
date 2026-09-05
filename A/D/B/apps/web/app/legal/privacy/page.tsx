"use client";

export default function PrivacyPage() {
  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto", lineHeight: 1.55 }}>
      <h2 style={{ margin: "8px 0" }}>Privacy Policy</h2>
      <div style={{ color: "#555" }}>Version v1 · Last updated: 2026-04-18</div>

      <h3 style={{ marginTop: 16 }}>1. What we collect</h3>
      <ul>
        <li>Account identifiers (email/phone if provided)</li>
        <li>Profile information (age bracket, preferences)</li>
        <li>Safety signals (reports, moderation actions, ML flags)</li>
        <li>Technical data (IP, user agent) for security and fraud prevention</li>
      </ul>

      <h3>2. Cookies</h3>
      <p>We use essential cookies for authentication and security. Optional cookies may be added in production (analytics/ads) with consent.</p>

      <h3>3. How we use data</h3>
      <ul>
        <li>Provide matching and core features</li>
        <li>Enforce policies and keep users safe</li>
        <li>Billing and subscription management</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h3>4. Your rights (GDPR)</h3>
      <ul>
        <li>Export your data: available via in-app export API</li>
        <li>Delete your account (“right to be forgotten”): anonymization + deletion request</li>
        <li>Access and correction: update your profile and settings</li>
      </ul>

      <h3>5. Children and minors</h3>
      <p>We apply additional protections for minors. Under-13 access requires verifiable parental consent if enabled in your deployment.</p>

      <h3>6. Contact</h3>
      <p>For data requests, use the GDPR export/deletion tools in-app or contact your DPO/support email (configure for production).</p>
    </main>
  );
}

