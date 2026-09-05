import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function CandidateCard({ candidate, rank }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {candidate.imageUrl && (
            <img
              src={candidate.imageUrl}
              alt={candidate.name}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{rank}. {candidate.name}</h3>
            </div>
            <p className="text-sm text-gray-600">{candidate.headline}</p>
            <p className="text-xs text-gray-500">{candidate.location}</p>
          </div>
        </div>
        <a
          href={candidate.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 flex-shrink-0"
          title="View LinkedIn profile"
        >
          <ExternalLink size={18} />
        </a>
      </div>

      <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-3 ${getScoreColor(candidate.score)}`}>
        {candidate.score}/100 — {getScoreLabel(candidate.score)}
      </div>

      {candidate.scoreBreakdown && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-600">Skills</p>
            <p className="font-bold">{candidate.scoreBreakdown.skillMatch}/40</p>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-600">Experience</p>
            <p className="font-bold">{candidate.scoreBreakdown.experience}/30</p>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-600">Location</p>
            <p className="font-bold">{candidate.scoreBreakdown.location}/20</p>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-600">GitHub</p>
            <p className="font-bold">{candidate.scoreBreakdown.github}/10</p>
          </div>
        </div>
      )}

      {candidate.skills && candidate.skills.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold text-gray-700 mb-1">Top Skills</p>
          <div className="flex flex-wrap gap-1">
            {candidate.skills.slice(0, 5).map((skill, idx) => (
              <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {skill}
              </span>
            ))}
            {candidate.skills.length > 5 && (
              <span className="text-xs text-gray-600 px-2 py-1">
                +{candidate.skills.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {candidate.enrichedAt && (
        <p className="text-xs text-gray-500">
          ✓ Profile enriched
        </p>
      )}
    </div>
  );
}
