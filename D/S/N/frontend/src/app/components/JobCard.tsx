import { Building2, MapPin, DollarSign, ExternalLink, Star } from "lucide-react";
import StatusBadge from "./StatusBadge";

export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  snippet?: string;
  relevance_score?: number;
  source?: string;
  status?: string;
}

export default function JobCard({ job, onApply }: { job: Job; onApply?: (job: Job) => void }) {
  const score = job.relevance_score ?? 0;
  const scoreColor =
    score >= 80 ? "text-emerald-400" :
    score >= 60 ? "text-amber-400" :
    "text-slate-400";

  return (
    <div className="glass rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10 fade-in-up">
      <div className="flex items-start justify-between gap-3">
        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="truncate text-sm font-semibold text-white">{job.title}</h3>
            {job.status && <StatusBadge status={job.status} />}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {job.location}
            </span>
            {job.salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> {job.salary}
              </span>
            )}
          </div>
          {job.snippet && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-500">{job.snippet}</p>
          )}
        </div>

        {/* Score */}
        {score > 0 && (
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <Star className={`h-3.5 w-3.5 ${scoreColor}`} />
            <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{score}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 ring-1 ring-white/10 hover:text-white hover:ring-white/20 transition-all"
        >
          <ExternalLink className="h-3 w-3" /> View
        </a>
        {onApply && (
          <button
            onClick={() => onApply(job)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
}
