import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0f0f13] text-gray-300 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">&larr; Back</Link>
        <h1 className="text-3xl font-bold text-white mt-4 mb-6">Terms of Service</h1>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>Last updated: January 2024</p>
          <h2 className="text-xl font-semibold text-white mt-6">1. Acceptance of Terms</h2>
          <p>By accessing or using Ninor, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          <h2 className="text-xl font-semibold text-white mt-6">2. Eligibility</h2>
          <p>You must be at least 18 years old to use Ninor. By using the service, you represent that you meet this age requirement.</p>
          <h2 className="text-xl font-semibold text-white mt-6">3. User Conduct</h2>
          <p>You agree not to engage in harassment, hate speech, illegal activity, or any behavior that violates our community guidelines. We reserve the right to terminate accounts for violations.</p>
          <h2 className="text-xl font-semibold text-white mt-6">4. Privacy</h2>
          <p>Your privacy is important to us. Please review our <Link href="/privacy" className="text-indigo-400 underline">Privacy Policy</Link> to understand how we collect and use your data.</p>
          <h2 className="text-xl font-semibold text-white mt-6">5. Termination</h2>
          <p>We reserve the right to suspend or terminate your account at any time for violations of these terms or for any other reason at our discretion.</p>
          <h2 className="text-xl font-semibold text-white mt-6">6. Contact</h2>
          <p>For questions about these terms, please contact us at support@ninor.app.</p>
        </div>
      </div>
    </main>
  );
}
