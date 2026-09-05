import React from 'react';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function MetricsDashboard({ metadata, candidates }) {
  if (!metadata) return null;

  const MANUAL_TIME_PER_CANDIDATE = 15;
  const RECRUITER_HOURLY_RATE = 50;

  const totalCandidates = metadata.total || 0;
  const durationSeconds = metadata.durationSec || 0;
  const durationMinutes = durationSeconds / 60;

  const manualTimeMinutes = totalCandidates * MANUAL_TIME_PER_CANDIDATE;
  const manualTimeHours = manualTimeMinutes / 60;
  const timeSavedHours = manualTimeHours;
  const costSaved = timeSavedHours * RECRUITER_HOURLY_RATE;
  const speedImprovement = manualTimeMinutes / durationMinutes;

  const enrichedCount = candidates.filter((c) => c.enrichedAt).length;
  const avgScore = candidates.length > 0
    ? (candidates.reduce((sum, c) => sum + (c.score || 0), 0) / candidates.length).toFixed(0)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="text-blue-600" size={28} />
        <h2 className="text-2xl font-bold text-gray-800">Metrics Dashboard</h2>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-600">
          <p className="text-sm text-gray-600 mb-1">Total Candidates</p>
          <p className="text-3xl font-bold text-blue-600">{totalCandidates}</p>
          <p className="text-xs text-gray-500 mt-1">Found in {durationMinutes.toFixed(1)} min</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-600">
          <p className="text-sm text-gray-600 mb-1">Time Saved</p>
          <p className="text-3xl font-bold text-green-600">{timeSavedHours.toFixed(1)}h</p>
          <p className="text-xs text-gray-500 mt-1">{manualTimeMinutes.toFixed(0)} min manual</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-600">
          <p className="text-sm text-gray-600 mb-1">Cost Saved</p>
          <p className="text-3xl font-bold text-purple-600">${costSaved.toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-1">at ${RECRUITER_HOURLY_RATE}/hr</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-600">
          <p className="text-sm text-gray-600 mb-1">Speed Improvement</p>
          <p className="text-3xl font-bold text-orange-600">{speedImprovement.toFixed(0)}x</p>
          <p className="text-xs text-gray-500 mt-1">faster than manual</p>
        </div>
      </div>

      {/* Candidate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-600" size={20} />
            <p className="text-sm font-bold text-gray-700">Enriched Profiles</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{enrichedCount}</p>
          <p className="text-xs text-gray-500 mt-1">{((enrichedCount / totalCandidates) * 100).toFixed(0)}% of total</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-blue-600" size={20} />
            <p className="text-sm font-bold text-gray-700">Average Score</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{avgScore}/100</p>
          <p className="text-xs text-gray-500 mt-1">Quality of matches</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-yellow-600" size={20} />
            <p className="text-sm font-bold text-gray-700">Sources</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{metadata.sources?.length || 1}</p>
          <p className="text-xs text-gray-500 mt-1">{metadata.sources?.join(', ') || 'LinkedIn'}</p>
        </div>
      </div>

      {/* Weekly Projection */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-600">
        <p className="text-sm font-bold text-gray-700 mb-2">Weekly Projection (5 searches)</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">Hours Saved</p>
            <p className="text-xl font-bold text-blue-600">{(timeSavedHours * 5).toFixed(0)}h</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Cost Reduction</p>
            <p className="text-xl font-bold text-green-600">${(costSaved * 5).toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Candidates Found</p>
            <p className="text-xl font-bold text-purple-600">{totalCandidates * 5}</p>
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      {candidates.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm font-bold text-gray-700 mb-3">Score Distribution</p>
          <div className="flex gap-1">
            {[
              { range: '80-100', color: 'bg-green-500', count: candidates.filter((c) => c.score >= 80).length },
              { range: '60-79', color: 'bg-blue-500', count: candidates.filter((c) => c.score >= 60 && c.score < 80).length },
              { range: '40-59', color: 'bg-yellow-500', count: candidates.filter((c) => c.score >= 40 && c.score < 60).length },
              { range: '0-39', color: 'bg-red-500', count: candidates.filter((c) => c.score < 40).length },
            ].map((bucket) => (
              <div key={bucket.range} className="flex-1">
                <div className={`${bucket.color} h-12 rounded flex items-end justify-center pb-1`}>
                  <span className="text-xs font-bold text-white">{bucket.count}</span>
                </div>
                <p className="text-xs text-center text-gray-600 mt-1">{bucket.range}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
