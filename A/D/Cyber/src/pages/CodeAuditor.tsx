import { CheckCircle, Upload, XCircle } from 'lucide-react'

const OWASP_CHECKS = [
  { id: 'A01', name: 'Broken Access Control', status: 'fail' as const },
  { id: 'A02', name: 'Cryptographic Failures', status: 'pass' as const },
  { id: 'A03', name: 'Injection', status: 'fail' as const },
  { id: 'A04', name: 'Insecure Design', status: 'pass' as const },
  { id: 'A05', name: 'Security Misconfiguration', status: 'fail' as const },
  { id: 'A06', name: 'Vulnerable Components', status: 'pass' as const },
  { id: 'A07', name: 'Authentication Failures', status: 'pass' as const },
  { id: 'A08', name: 'Software Integrity Failures', status: 'pass' as const },
  { id: 'A09', name: 'Logging Failures', status: 'fail' as const },
  { id: 'A10', name: 'SSRF', status: 'pass' as const },
]

export function CodeAuditor() {
  const passCount = OWASP_CHECKS.filter((c) => c.status === 'pass').length
  const failCount = OWASP_CHECKS.filter((c) => c.status === 'fail').length

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h2 className="text-xl font-semibold">Code Auditor</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Static analysis and OWASP Top 10 compliance scanner
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center transition-colors hover:border-[var(--accent)]">
            <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
            <h3 className="mb-1 text-sm font-semibold">Drop code to audit</h3>
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              Supports .py, .js, .ts, .php, .java, .go, .rs
            </p>
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs transition-colors hover:border-[var(--accent)]"
            >
              Browse Files
            </button>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">OWASP Top 10 Checklist</h3>
              <div className="flex gap-3 font-mono text-xs">
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle size={12} /> {passCount}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle size={12} /> {failCount}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              {OWASP_CHECKS.map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-[var(--bg-elevated)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {check.id}
                    </span>
                    <span className="text-xs">{check.name}</span>
                  </div>
                  {check.status === 'pass' ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-green-400">
                      <CheckCircle size={12} /> Pass
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-red-400">
                      <XCircle size={12} /> Fail
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h3 className="text-sm font-semibold">Sample Finding</h3>
          </div>
          <div className="p-4 font-mono text-xs">
            <p className="mb-2 text-red-400">[CRITICAL] SQL Injection — auth.py:47</p>
            <pre className="rounded bg-[var(--bg-elevated)] p-3 text-[var(--text-muted)]">
{`query = f"SELECT * FROM users WHERE id = '{user_id}'"
# Vulnerable: unsanitized user input in SQL query
# Fix: Use parameterized queries`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
