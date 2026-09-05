'use client';

import { useEffect, useState } from 'react';
import { useModerationStore } from '@/store/moderationStore';

export function ReportQueue() {
  const { queue, queueStats, fetchQueue, updateReport, loading } = useModerationStore();
  const [filter, setFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [actionForm, setActionForm] = useState({
    status: '',
    actionTaken: '',
    resolutionNotes: '',
  });

  useEffect(() => {
    fetchQueue({ status: filter });
  }, [filter, fetchQueue]);

  const handleAction = async () => {
    if (!selectedReport) return;
    await updateReport(selectedReport.id, actionForm);
    setSelectedReport(null);
    setActionForm({ status: '', actionTaken: '', resolutionNotes: '' });
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return 'bg-red-100 text-red-800';
    if (severity >= 5) return 'bg-orange-100 text-orange-800';
    if (severity >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-4">
      {queueStats && (
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">Pending:</span>
            <span className="text-lg font-semibold text-yellow-600">{queueStats.pending}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">Reviewing:</span>
            <span className="text-lg font-semibold text-blue-600">{queueStats.reviewing}</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">High Priority:</span>
            <span className="text-lg font-semibold text-red-600">{queueStats.highPriority}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['pending', 'reviewing', 'escalated', 'resolved', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {queue.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.reportedUser?.displayName}</p>
                    <p className="text-xs text-gray-500">Score: {report.reportedUser?.severityScore || 0}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 capitalize">{report.reason.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity)}`}>
                    {report.severity}/10
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{report.priority}/5</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Report</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reported User</label>
                <p className="text-sm text-gray-900">{selectedReport.reportedUser?.displayName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <p className="text-sm text-gray-900 capitalize">{selectedReport.reason.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{selectedReport.description || 'N/A'}</p>
              </div>
              {selectedReport.evidenceUrls?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Evidence</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedReport.evidenceUrls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        Evidence {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={actionForm.status}
                  onChange={(e) => setActionForm({ ...actionForm, status: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select status</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                <select
                  value={actionForm.actionTaken}
                  onChange={(e) => setActionForm({ ...actionForm, actionTaken: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select action</option>
                  <option value="warning">Warning</option>
                  <option value="temporary_ban">Temporary Ban</option>
                  <option value="permanent_ban">Permanent Ban</option>
                  <option value="shadow_ban">Shadow Ban</option>
                  <option value="feature_restriction">Feature Restriction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                <textarea
                  value={actionForm.resolutionNotes}
                  onChange={(e) => setActionForm({ ...actionForm, resolutionNotes: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Add notes about this decision..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={loading || !actionForm.status}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
