import { AlertTriangle, Globe, Hash } from 'lucide-react'

const IOCS = [
  { type: 'IP', value: '185.220.101.42', severity: 'Critical', source: 'Firewall Logs' },
  { type: 'IP', value: '45.33.32.156', severity: 'High', source: 'IDS Alert' },
  { type: 'Hash', value: 'a3f5c8d9e2b1...7f4a', severity: 'High', source: 'EDR Detection' },
  { type: 'Domain', value: 'malware-c2.darknet', severity: 'Critical', source: 'DNS Sinkhole' },
  { type: 'IP', value: '192.168.1.105', severity: 'Medium', source: 'Internal Scan' },
  { type: 'Hash', value: 'b7e2f1a9c4d8...3e2b', severity: 'Low', source: 'Sandbox' },
]

const FEED = [
  { title: 'APT29 Campaign Detected', time: '12 min ago', tag: 'Nation-State' },
  { title: 'New Ransomware Variant: LockBit 4.0', time: '1 hr ago', tag: 'Ransomware' },
  { title: 'Zero-Day in Popular VPN Client', time: '3 hrs ago', tag: 'Vulnerability' },
  { title: 'Phishing Surge Targeting Finance Sector', time: '5 hrs ago', tag: 'Phishing' },
]

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#22d3ee',
  Low: '#737373',
}

export function ThreatIntel() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h2 className="text-xl font-semibold">Threat Intelligence</h2>
          <p className="text-sm text-[var(--text-muted)]">
            IOC database and live threat feed monitoring
          </p>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <MetricCard icon={Globe} label="Active IOCs" value="247" />
          <MetricCard icon={AlertTriangle} label="Critical Alerts" value="12" />
          <MetricCard icon={Hash} label="Hashes Tracked" value="1,834" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h3 className="text-sm font-semibold">Indicator of Compromise Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {IOCS.map((ioc) => (
                      <tr
                        key={ioc.value}
                        className="border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-elevated)]"
                      >
                        <td className="px-4 py-3">{ioc.type}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--accent)' }}>
                          {ioc.value}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                            style={{
                              color: SEVERITY_COLORS[ioc.severity],
                              backgroundColor: `${SEVERITY_COLORS[ioc.severity]}20`,
                            }}
                          >
                            {ioc.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{ioc.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h3 className="text-sm font-semibold">Threat Feed</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {FEED.map((item) => (
                  <div
                    key={item.title}
                    className="px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-muted)]">{item.time}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-glow)' }}
                      >
                        {item.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--accent)]">
      <div className="mb-2 flex items-center gap-2 text-[var(--text-muted)]">
        <Icon size={16} style={{ color: 'var(--accent)' }} />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-mono text-2xl font-semibold" style={{ color: 'var(--accent)' }}>
        {value}
      </p>
    </div>
  )
}
