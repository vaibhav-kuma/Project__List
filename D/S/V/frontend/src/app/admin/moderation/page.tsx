'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  severity: number;
  priority: number;
  createdAt: string;
  reporter: { displayName: string } | null;
  reportedUser: { displayName: string; isBanned: boolean } | null;
}

interface ModerationQueue {
  pendingReports: number;
  flaggedMoments: number;
  userAppeals: number;
  total: number;
}

export default function AdminModeration() {
  const [activeTab, setActiveTab] = useState<'reports' | 'flagged' | 'queue'>('queue');
  const [reports, setReports] = useState<Report[]>([]);
  const [queue, setQueue] = useState<ModerationQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolveAction, setResolveAction] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'queue') {
        const { data } = await adminApi.getModerationQueue();
        setQueue(data.queue);
        setReports(data.recentReports);
      } else if (activeTab === 'reports') {
        const { data } = await adminApi.getReports({ status: 'pending' });
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId: string) => {
    try {
      await adminApi.resolveReport(reportId, {
        action: resolveAction,
        notes: resolveNotes,
      });
      setMessage({ type: 'success', text: 'Report resolved successfully' });
      setSelectedReport(null);
      setResolveAction('');
      setResolveNotes('');
      fetchData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to resolve report' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Moderation</h1>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            {['queue', 'reports', 'flagged'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'queue' && `Queue (${queue?.total || 0})`}
                {tab === 'reports' && 'All Reports'}
                {tab === 'flagged' && 'Flagged Content'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'queue' && queue && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-red-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Pending Reports</p>
                <p className="text-4xl font-bold text-red-700">{queue.pendingReports}</p>
              </div>
              <span className="text-4xl">📋</span>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Flagged Moments</p>
                <p className="text-4xl font-bold text-yellow-700">{queue.flaggedMoments}</p>
              </div>
              <span className="text-4xl">🖼️</span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">User Appeals</p>
                <p className="text-4xl font-bold text-blue-700">{queue.userAppeals}</p>
              </div>
              <span className="text-4xl">⚖️</span>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {activeTab === 'queue' ? 'Recent Reports' : 'Reports'}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No reports to display</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.severity >= 8
                            ? 'bg-red-100 text-red-800'
                            : report.severity >= 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        Severity: {report.severity}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {report.reason}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{report.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Reporter: {report.reporter?.displayName || 'Anonymous'}</span>
                      <span>
                        Reported: {report.reportedUser?.displayName || 'Unknown'}
                        {report.reportedUser?.isBanned && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                            Banned
                          </span>
                        )}
                      </span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resolve Report</h2>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                <strong>Reason:</strong> {selectedReport.reason}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Description:</strong> {selectedReport.description || 'None'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Reported User:</strong> {selectedReport.reportedUser?.displayName}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={resolveAction}
                  onChange={(e) => setResolveAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select action...</option>
                  <option value="dismiss">Dismiss Report</option>
                  <option value="warn">Issue Warning</option>
                  <option value="suspend">Suspend User</option>
                  <option value="ban">Ban User</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add notes about this resolution..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setResolveAction('');
                  setResolveNotes('');
                }}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(selectedReport.id)}
                disabled={!resolveAction}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
