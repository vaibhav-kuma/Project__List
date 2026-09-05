import StatusBadge from "./StatusBadge";
import { ExternalLink } from "lucide-react";

export interface Application {
  id: string;
  job_title: string;
  job_company: string;
  job_location: string;
  job_url: string;
  status: string;
  confirmation_text?: string;
  error_message?: string;
  applied_at: string;
}

export default function AppTable({ apps }: { apps: Application[] }) {
  if (!apps.length) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <p className="text-sm text-slate-500">No applications yet.</p>
        <p className="mt-1 text-xs text-slate-600">Start the agent to begin applying automatically.</p>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left">
              {["Job Title", "Company", "Location", "Status", "Confirmation", "Applied At", "Link"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apps.map((app, i) => (
              <tr
                key={app.id}
                className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}
              >
                <td className="px-4 py-3 font-medium text-white max-w-[160px] truncate">{app.job_title}</td>
                <td className="px-4 py-3 text-slate-300 max-w-[120px] truncate">{app.job_company}</td>
                <td className="px-4 py-3 text-slate-400 max-w-[120px] truncate">{app.job_location}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  {app.confirmation_text ? (
                    <span className="text-xs text-slate-400 line-clamp-2">{app.confirmation_text}</span>
                  ) : app.error_message ? (
                    <span className="text-xs text-red-400/70 line-clamp-2">{app.error_message}</span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(app.applied_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  {app.job_url && (
                    <a
                      href={app.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
