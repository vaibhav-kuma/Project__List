"use client";

export default function TosPage() {
  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto", lineHeight: 1.55 }}>
      <h2 style={{ margin: "8px 0" }}>Terms of Service</h2>
      <div style={{ color: "#555" }}>Version v1 · Last updated: 2026-04-18</div>

      <h3 style={{ marginTop: 16 }}>1. Eligibility</h3>
      <p>You must meet the minimum age requirements for your jurisdiction. If you are under 18, you may need verified parental/guardian consent.</p>

      <h3>2. Prohibited content and behavior</h3>
      <ul>
        <li>Nudity, sexually explicit content, or sexual solicitation</li>
        <li>Harassment, hate speech, threats, or doxxing</li>
        <li>Violence or graphic content</li>
        <li>Scams, impersonation, or spam</li>
        <li>Any behavior that endangers minors</li>
      </ul>

      <h3>3. Safety and moderation</h3>
      <p>We may use automated systems and human review to enforce our policies. Sessions can be ended automatically for safety.</p>

      <h3>4. User content</h3>
      <p>You are responsible for content you create or share. You grant us a limited license to process content for operating, securing, and moderating the service.</p>

      <h3>5. Termination</h3>
      <p>We may suspend or terminate accounts for policy violations. You may appeal eligible decisions.</p>

      <h3>6. Disclaimers</h3>
      <p>This service is provided “as is” without warranties. We do not guarantee you will be matched with any user.</p>

      <h3>7. Contact</h3>
      <p>For support and legal requests, contact your support email (configure for production).</p>
    </main>
  );
}

