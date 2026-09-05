import React from 'react';
import { Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function StatusCard({ job }) {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'failed':
        return <AlertCircle className="text-red-500" size={24} />;
      case 'running':
        return <Loader className="text-blue-500 animate-spin" size={24} />;
      default:
        return <Clock className="text-yellow-500" size={24} />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString();
  };

  const duration = job.startedAt && job.completedAt
    ? Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000)
    : null;

  return (
    <div className={`border-2 rounded-lg p-6 mb-6 ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-bold capitalize">{job.status}</h3>
            <p className="text-sm text-gray-600">{job.title}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{job.progress}%</p>
          <p className="text-xs text-gray-600">Progress</p>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${job.progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Created</p>
          <p className="font-mono text-xs">{formatTime(job.createdAt)}</p>
        </div>
        <div>
          <p className="text-gray-600">Started</p>
          <p className="font-mono text-xs">{formatTime(job.startedAt)}</p>
        </div>
        <div>
          <p className="text-gray-600">Completed</p>
          <p className="font-mono text-xs">{formatTime(job.completedAt)}</p>
        </div>
        <div>
          <p className="text-gray-600">Duration</p>
          <p className="font-mono text-xs">{duration ? `${duration}s` : '-'}</p>
        </div>
      </div>

      {job.error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
          <p className="font-bold">Error:</p>
          <p>{job.error}</p>
        </div>
      )}
    </div>
  );
}
