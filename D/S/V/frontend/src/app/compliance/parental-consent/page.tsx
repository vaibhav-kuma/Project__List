'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { complianceApi } from '@/lib/complianceApi';

interface ConsentRequest {
  id: string;
  token: string;
  childName: string;
  childAge: number;
  childEmail: string;
  parentEmail: string;
  parentName: string;
  status: 'pending' | 'approved' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  restrictions: {
    timeStart: string;
    timeEnd: string;
    dailyMatchLimit: number;
    allowMessaging: boolean;
    allowVideoChat: boolean;
  };
}

function ConsentApprovalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [consent, setConsent] = useState<ConsentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [restrictions, setRestrictions] = useState({
    timeStart: '08:00',
    timeEnd: '20:00',
    dailyMatchLimit: 10,
    allowMessaging: true,
    allowVideoChat: false,
  });
  const [parentSignature, setParentSignature] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (token) {
      fetchConsent();
    }
  }, [token]);

  const fetchConsent = async () => {
    try {
      const { data } = await complianceApi.getConsentByToken(token);
      setConsent(data);
      if (data.restrictions) {
        setRestrictions(data.restrictions);
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to load consent request',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!agreed) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await complianceApi.approveParentalConsent({
        token,
        parentSignature,
      });
      setMessage({
        type: 'success',
        text: 'Consent approved successfully. Your child can now use the app with the specified restrictions.',
      });
      setConsent((prev) => (prev ? { ...prev, status: 'approved' } : null));
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to approve consent',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await complianceApi.revokeParentalConsent();
      setMessage({
        type: 'success',
        text: 'Consent request declined.',
      });
      setConsent((prev) => (prev ? { ...prev, status: 'revoked' } : null));
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to decline consent',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!consent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Token</h2>
          <p className="text-gray-600 mb-6">
            This consent link is no longer valid. Please request a new one.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (consent.status === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Consent Approved</h2>
          <p className="text-gray-600 mb-6">
            You have already approved this consent request. Your child can use the app with the restrictions you set.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (consent.status === 'revoked') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Consent Declined</h2>
          <p className="text-gray-600 mb-6">
            This consent request has been declined.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Parental Consent Request</h1>
          <p className="text-gray-600 mt-2">
            Your child is requesting permission to use our app
          </p>
        </div>

        {message.text && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Child Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-lg font-medium text-gray-900">{consent.childName}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Age</p>
              <p className="text-lg font-medium text-gray-900">{consent.childAge}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-medium text-gray-900">{consent.childEmail}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Request Date</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(consent.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Proposed Restrictions</h2>
          <p className="text-sm text-gray-600 mb-4">
            You can customize these restrictions before approving
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Start Time</label>
              <input
                type="time"
                value={restrictions.timeStart}
                onChange={(e) => setRestrictions({ ...restrictions, timeStart: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed End Time</label>
              <input
                type="time"
                value={restrictions.timeEnd}
                onChange={(e) => setRestrictions({ ...restrictions, timeEnd: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Match Limit</label>
            <input
              type="number"
              min="1"
              max="50"
              value={restrictions.dailyMatchLimit}
              onChange={(e) => setRestrictions({ ...restrictions, dailyMatchLimit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={restrictions.allowMessaging}
                onChange={(e) => setRestrictions({ ...restrictions, allowMessaging: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Allow Messaging</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={restrictions.allowVideoChat}
                onChange={(e) => setRestrictions({ ...restrictions, allowVideoChat: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Allow Video Chat</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Signature</h2>
          <input
            type="text"
            value={parentSignature}
            onChange={(e) => setParentSignature(e.target.value)}
            placeholder="Type your full name as signature"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          />

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded mt-1"
            />
            <span className="text-sm text-gray-700">
              I confirm that I am the parent or legal guardian of this child and I consent to their use of this application under the restrictions specified above.
            </span>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleDecline}
            disabled={submitting}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg font-medium"
          >
            Decline
          </button>
          <button
            onClick={handleApprove}
            disabled={!agreed || !parentSignature || submitting}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium"
          >
            {submitting ? 'Processing...' : 'Approve Consent'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParentalConsentApproval() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <ConsentApprovalContent />
    </Suspense>
  );
}
