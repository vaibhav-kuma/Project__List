'use client';
import { useState, useEffect } from 'react';
import { Skeleton, Button } from '@yt/ui';
import { api } from '@/lib/api';
import { Flag } from 'lucide-react';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: any[] }>('/admin/reports').then((res) => {
      if (res.success) setReports(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Reports Queue</h1>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <Flag size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No pending reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-yt-surface rounded-xl p-4 flex items-start justify-between">
              <div>
                <p className="text-sm text-white font-medium">{report.reason}</p>
                <p className="text-xs text-gray-400 mt-1">{report.description}</p>
                <p className="text-xs text-gray-500 mt-1">Reported by: {report.reporter?.username}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm">Dismiss</Button>
                <Button variant="primary" size="sm">Review</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
