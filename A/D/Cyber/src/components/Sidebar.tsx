import { NavLink } from 'react-router-dom'
import {
  MessageSquare,
  Radar,
  FlaskConical,
  Code2,
  FileText,
  X,
} from 'lucide-react'
import { AegisLogo } from './AegisLogo'
import { ModeSwitcher } from './ModeSwitcher'

const NAV_ITEMS = [
  { to: '/', label: 'Command Center', icon: MessageSquare },
  { to: '/threat-intel', label: 'Threat Intel', icon: Radar },
  { to: '/payload-lab', label: 'Payload Lab', icon: FlaskConical },
  { to: '/code-auditor', label: 'Code Auditor', icon: Code2 },
  { to: '/reports', label: 'Reports', icon: FileText },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-5">
          <div className="flex items-center gap-3">
            <AegisLogo size={36} />
            <div>
              <h1 className="text-lg font-bold tracking-widest text-[var(--text-primary)]">
                AEGIS
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Cyber Defense AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'border-l-2 border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'border-l-2 border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <Icon size={18} style={{ color: 'var(--accent)' }} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-[var(--border)] pt-3">
          <ModeSwitcher />
        </div>
      </aside>
    </>
  )
}
