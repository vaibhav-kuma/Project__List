'use client';

import { useState } from 'react';
import { complianceApi } from '@/lib/complianceApi';

interface ExportRequest {
  id: string;
  format: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
}

export default function GDPRSettings() {
  const [activeTab, setActiveTab] = useState<'export' | 'deletion'>('export');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [includeOptions, setIncludeOptions] = useState({
    messages: true,
    moments: true,
    friends: true,
    reports: false,
    payments: false,
  });
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportRequest | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [deletionReason, setDeletionReason] = useState('');
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [gracePeriodEnd, setGracePeriodEnd] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage({ type: '', text: '' });

    try {
      const { data } = await complianceApi.requestDataExport({
        format: exportFormat,
        includeMessages: includeOptions.messages,
        includeMoments: includeOptions.moments,
        includeFriends: includeOptions.friends,
        includeReports: includeOptions.reports,
        includePayments: includeOptions.payments,
      });
      setExportStatus(data);
      setMessage({ type: 'success', text: 'Export request submitted. You will receive an email when ready.' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Export request failed',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeletion = async () => {
    if (!deletionConfirmed) return;
    setDeleting(true);
    setMessage({ type: '', text: '' });

    try {
      const { data } = await complianceApi.requestAccountDeletion({
        reason: deletionReason,
        confirmation: true,
      });
      setDeletionRequested(true);
      setGracePeriodEnd(data.gracePeriodEnd);
      setMessage({
        type: 'success',
        text: `Account deletion requested. You have 30 days to cancel. Grace period ends: ${new Date(data.gracePeriodEnd).toLocaleDateString()}`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Deletion request failed',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await complianceApi.cancelAccountDeletion();
      setDeletionRequested(false);
      setGracePeriodEnd(null);
      setMessage({ type: 'success', text: 'Account deletion cancelled' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to cancel deletion',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy & Data</h1>
        <p className="text-gray-600 mb-8">Manage your data under GDPR regulations</p>

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

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('export')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'export'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Data Export
              </button>
              <button
                onClick={() => setActiveTab('deletion')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'deletion'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Account Deletion
              </button>
            </div>
          </div>

          {activeTab === 'export' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Download Your Data</h2>
              <p className="text-gray-600 mb-6">
                Request a copy of all your personal data. We will prepare it and notify you when it is ready.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">JSON</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">CSV</span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Include Data</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeOptions.messages}
                      onChange={(e) => setIncludeOptions({ ...includeOptions, messages: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Messages</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeOptions.moments}
                      onChange={(e) => setIncludeOptions({ ...includeOptions, moments: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Moments (Photos & Posts)</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeOptions.friends}
                      onChange={(e) => setIncludeOptions({ ...includeOptions, friends: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Friends List</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeOptions.reports}
                      onChange={(e) => setIncludeOptions({ ...includeOptions, reports: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Reports</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeOptions.payments}
                      onChange={(e) => setIncludeOptions({ ...includeOptions, payments: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Payment History</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                {exporting ? 'Processing...' : 'Request Data Export'}
              </button>

              {exportStatus && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Export Status</h3>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        exportStatus.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : exportStatus.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {exportStatus.status}
                    </span>
                    {exportStatus.downloadUrl && (
                      <a
                        href={exportStatus.downloadUrl}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deletion' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Your Account</h2>

              {deletionRequested ? (
                <div className="bg-yellow-50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-800">Deletion Pending</h3>
                      <p className="text-sm text-yellow-700">
                        Your account will be permanently deleted on{' '}
                        {gracePeriodEnd ? new Date(gracePeriodEnd).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-yellow-700 mb-4">
                    You have a 30-day grace period to cancel this request. After that, all your data will be permanently deleted.
                  </p>
                  <button
                    onClick={handleCancelDeletion}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium"
                  >
                    Cancel Deletion
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-red-800 mb-2">Warning: This action is irreversible</h3>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• All your personal data will be permanently deleted</li>
                      <li>• Your profile, messages, and moments will be removed</li>
                      <li>• You will lose access to your account</li>
                      <li>• This cannot be undone after the 30-day grace period</li>
                    </ul>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for leaving (optional)
                    </label>
                    <textarea
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Help us improve by sharing your reason..."
                    />
                  </div>

                  <label className="flex items-center gap-3 mb-6">
                    <input
                      type="checkbox"
                      checked={deletionConfirmed}
                      onChange={(e) => setDeletionConfirmed(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      I understand this will permanently delete my account and data
                    </span>
                  </label>

                  <button
                    onClick={handleDeletion}
                    disabled={!deletionConfirmed || deleting}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {deleting ? 'Processing...' : 'Delete My Account'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
