import { Download, FileText, Calendar, User } from 'lucide-react'

const REPORTS = [
  {
    title: 'Penetration Test Summary',
    client: 'Acme Corp',
    date: '2026-06-01',
    findings: { critical: 2, high: 5, medium: 8, low: 12 },
    status: 'Final',
  },
  {
    title: 'Vulnerability Assessment',
    client: 'TechStart Inc',
    date: '2026-05-15',
    findings: { critical: 0, high: 3, medium: 11, low: 24 },
    status: 'Draft',
  },
  {
    title: 'Red Team Engagement Report',
    client: 'GlobalBank',
    date: '2026-04-22',
    findings: { critical: 1, high: 4, medium: 6, low: 9 },
    status: 'Final',
  },
  {
    title: 'SOC Incident Post-Mortem',
    client: 'Internal',
    date: '2026-03-10',
    findings: { critical: 1, high: 2, medium: 3, low: 5 },
    status: 'Final',
  },
]

export function Reports() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Reports</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Engagement reports and security assessment deliverables
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:border-[var(--accent)]"
          >
            + New Report
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {REPORTS.map((report) => (
            <div
              key={report.title}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-5 transition-all hover:border-[var(--accent)] hover:shadow-[0_0_16px_var(--accent-glow)]"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} style={{ color: 'var(--accent)' }} />
                  <h3 className="text-sm font-semibold">{report.title}</h3>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    report.status === 'Final'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {report.status}
                </span>
              </div>

              <div className="mb-4 space-y-1 text-xs text-[var(--text-muted)]">
                <p className="flex items-center gap-1.5">
                  <User size={12} /> {report.client}
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar size={12} /> {report.date}
                </p>
              </div>

              <div className="mb-4 flex gap-3 font-mono text-[10px]">
                <SeverityBadge label="C" count={report.findings.critical} color="#ef4444" />
                <SeverityBadge label="H" count={report.findings.high} color="#f59e0b" />
                <SeverityBadge label="M" count={report.findings.medium} color="#22d3ee" />
                <SeverityBadge label="L" count={report.findings.low} color="#737373" />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded border border-[var(--border)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--accent)]"
                >
                  <Download size={12} /> PDF
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded border border-[var(--border)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--accent)]"
                >
                  <Download size={12} /> DOCX
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SeverityBadge({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <span
      className="rounded px-2 py-1 font-semibold"
      style={{ color, backgroundColor: `${color}20` }}
    >
      {label}:{count}
    </span>
  )
}
