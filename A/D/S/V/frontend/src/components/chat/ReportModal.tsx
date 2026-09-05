'use client';

import { useState } from 'react';
import { moderationApi } from '@/lib/moderationApi';

interface ReportModalProps {
  reportedUserId: string;
  sessionId?: string;
  momentId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Inappropriate Content', icon: '⚠️', severity: 3 },
  { value: 'harassment', label: 'Harassment', icon: '🚫', severity: 5 },
  { value: 'spam', label: 'Spam', icon: '📧', severity: 2 },
  { value: 'underage', label: 'Underage User', icon: '👶', severity: 10 },
  { value: 'hate_speech', label: 'Hate Speech', icon: '💢', severity: 8 },
  { value: 'violence', label: 'Violence', icon: '🔪', severity: 7 },
  { value: 'scam', label: 'Scam/Fraud', icon: '🎭', severity: 4 },
  { value: 'other', label: 'Other', icon: '❓', severity: 1 },
];

export default function ReportModal({ reportedUserId, sessionId, momentId, onClose, onSuccess }: ReportModalProps) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedReason = REPORT_REASONS.find((r) => r.value === reason);

  const addEvidenceUrl = () => {
    if (newEvidenceUrl && !evidenceUrls.includes(newEvidenceUrl)) {
      setEvidenceUrls([...evidenceUrls, newEvidenceUrl]);
      setNewEvidenceUrl('');
    }
  };

  const removeEvidenceUrl = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await moderationApi.submitReport({
        reportedUserId,
        sessionId,
        momentId,
        reason,
        description: description || undefined,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      });

      setSubmitted(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Report Submitted</h2>
            <p className="text-gray-600 mb-6">
              Thank you for helping keep our community safe. Our moderation team will review your report.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Report User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Select the reason for your report:</p>

            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    reason === r.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{r.icon}</span>
                  <p className="text-sm font-medium mt-1">{r.label}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!reason}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">Selected Reason</p>
              <p className="text-sm text-gray-900 flex items-center gap-2">
                <span>{selectedReason?.icon}</span>
                {selectedReason?.label}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                maxLength={1000}
                placeholder="Provide additional details about the violation..."
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/1000</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Evidence URLs (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newEvidenceUrl}
                  onChange={(e) => setNewEvidenceUrl(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/screenshot.png"
                />
                <button
                  onClick={addEvidenceUrl}
                  disabled={!newEvidenceUrl}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg"
                >
                  Add
                </button>
              </div>

              {evidenceUrls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {evidenceUrls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                      <span className="text-sm text-gray-600 truncate flex-1">{url}</span>
                      <button
                        onClick={() => removeEvidenceUrl(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="screenshot"
                checked={includeScreenshot}
                onChange={(e) => setIncludeScreenshot(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="screenshot" className="text-sm text-gray-700">
                Include session screenshot as evidence
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
