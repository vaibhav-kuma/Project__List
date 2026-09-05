import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function ROICalculator({ metadata }) {
  if (!metadata) return null;

  const MANUAL_TIME_PER_CANDIDATE = 15; // minutes
  const RECRUITER_HOURLY_RATE = 50; // dollars

  const totalCandidates = metadata.total || 0;
  const durationSeconds = metadata.durationSec || 0;
  const durationMinutes = durationSeconds / 60;

  const manualTimeMinutes = totalCandidates * MANUAL_TIME_PER_CANDIDATE;
  const manualTimeHours = manualTimeMinutes / 60;
  const timeSavedHours = manualTimeHours;
  const costSaved = timeSavedHours * RECRUITER_HOURLY_RATE;
  const speedImprovement = manualTimeMinutes / durationMinutes;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-md p-6 mb-6 border-2 border-green-200">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="text-green-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-800">ROI Summary</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Candidates Found</p>
          <p className="text-3xl font-bold text-blue-600">{totalCandidates}</p>
          <p className="text-xs text-gray-500 mt-1">in {durationMinutes.toFixed(1)} minutes</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Manual Time Saved</p>
          <p className="text-3xl font-bold text-green-600">{timeSavedHours.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">hours ({manualTimeMinutes.toFixed(0)} min)</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Cost Saved</p>
          <p className="text-3xl font-bold text-green-600">${costSaved.toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-1">at ${RECRUITER_HOURLY_RATE}/hr</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Speed Improvement</p>
          <p className="text-3xl font-bold text-purple-600">{speedImprovement.toFixed(0)}x</p>
          <p className="text-xs text-gray-500 mt-1">faster than manual</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-green-500">
        <p className="text-sm text-gray-700">
          <span className="font-bold">Per recruiter per week:</span> {(timeSavedHours * 5).toFixed(0)} hours saved, ${(costSaved * 5).toFixed(0)} cost reduction
        </p>
      </div>

      {metadata.sources && (
        <div className="mt-4 text-xs text-gray-600">
          <p><span className="font-bold">Sources:</span> {metadata.sources.join(', ')}</p>
          {metadata.viewerUrls && metadata.viewerUrls.length > 0 && (
            <p className="mt-1">
              <span className="font-bold">Live viewers:</span>{' '}
              {metadata.viewerUrls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  View {idx + 1}
                </a>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
