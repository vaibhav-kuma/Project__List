import { PanelRightClose, Zap, Shield, Bug, Terminal } from 'lucide-react'
import { useMode } from '../context/ModeContext'
import { useChat } from '../context/ChatContext'
import { QUICK_TOOLS } from '../data/quickTools'

interface ContextPanelProps {
  onClose: () => void
}

const TOOL_ICONS = [Shield, Terminal, Bug, Zap]

export function ContextPanel({ onClose }: ContextPanelProps) {
  const { personaLabel, modeLabel, accentColor } = useMode()
  const { sessionStats, injectPrompt, isLoading } = useChat()

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Context
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label="Close context panel"
        >
          <PanelRightClose size={18} />
        </button>
      </div>

      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Active Mode
        </p>
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
              style={{ backgroundColor: accentColor }}
            />
            <span
              className="relative inline-flex h-3 w-3 rounded-full"
              style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
            />
          </span>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{personaLabel}</p>
            <p className="text-xs text-[var(--text-muted)]">{modeLabel} Operations</p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Quick Tools
        </p>
        <div className="space-y-2">
          {QUICK_TOOLS.map((tool, i) => {
            const Icon = TOOL_ICONS[i % TOOL_ICONS.length]
            return (
              <button
                key={tool.id}
                type="button"
                disabled={isLoading}
                onClick={() => injectPrompt(tool.prompt)}
                className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left text-xs transition-all hover:border-[var(--accent)] hover:shadow-[0_0_12px_var(--accent-glow)] disabled:opacity-50"
              >
                <Icon size={14} style={{ color: accentColor, flexShrink: 0 }} />
                <span>{tool.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Session Stats
        </p>
        <div className="space-y-2">
          <StatCard label="Vulns Found" value={sessionStats.vulnsFound} />
          <StatCard label="Defenses Suggested" value={sessionStats.defensesSuggested} />
          <StatCard label="Scripts Generated" value={sessionStats.scriptsGenerated} />
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent)' }}>
        {value}
      </span>
    </div>
  )
}
