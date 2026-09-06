import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0f0f13] text-gray-300 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">&larr; Back</Link>
        <h1 className="text-3xl font-bold text-white mt-4 mb-6">Privacy Policy</h1>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>Last updated: January 2024</p>
          <h2 className="text-xl font-semibold text-white mt-6">1. Information We Collect</h2>
          <p>We collect information you provide directly (name, email, profile data) and automatically (usage data, device info, IP address).</p>
          <h2 className="text-xl font-semibold text-white mt-6">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our service, match you with other users, process payments, and send important notifications.</p>
          <h2 className="text-xl font-semibold text-white mt-6">3. Data Sharing</h2>
          <p>We do not sell your personal data. We may share data with service providers who help us operate (Stripe, AWS, Sentry) under strict data processing agreements.</p>
          <h2 className="text-xl font-semibold text-white mt-6">4. Your Rights</h2>
          <p>You can request access to, correction of, or deletion of your data through your account settings or by contacting us. For GDPR requests, visit our <Link href="/compliance/gdpr" className="text-indigo-400 underline">GDPR page</Link>.</p>
          <h2 className="text-xl font-semibold text-white mt-6">5. Data Retention</h2>
          <p>We retain your data for as long as your account is active. Upon deletion, most data is removed within 30 days.</p>
          <h2 className="text-xl font-semibold text-white mt-6">6. Contact</h2>
          <p>For privacy inquiries, email privacy@ninor.app.</p>
        </div>
      </div>
    </main>
  );
}
