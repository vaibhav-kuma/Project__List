import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, PanelRightOpen } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { ContextPanel } from '../components/ContextPanel'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const [contextOverlayOpen, setContextOverlayOpen] = useState(false)

  return (
    <div className="flex h-full min-h-screen bg-[var(--bg-primary)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold tracking-widest">AEGIS</span>
          <button
            type="button"
            onClick={() => setContextOverlayOpen(true)}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            aria-label="Open context panel"
          >
            <PanelRightOpen size={20} />
          </button>
        </header>

        {/* Tablet context toggle (1024–1279px) */}
        <div className="hidden items-center justify-end border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 lg:flex xl:hidden">
          <button
            type="button"
            onClick={() => setContextOverlayOpen(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            <PanelRightOpen size={14} />
            Context Panel
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            <Outlet />
          </main>

          {/* Desktop context panel (>= 1280px) */}
          <div
            className={`hidden border-l border-[var(--border)] bg-[var(--bg-surface)] transition-all duration-300 xl:block ${
              contextOpen ? 'w-80' : 'w-0 overflow-hidden'
            }`}
          >
            {contextOpen && <ContextPanel onClose={() => setContextOpen(false)} />}
          </div>
        </div>
      </div>

      {/* Desktop toggle when collapsed */}
      {!contextOpen && (
        <button
          type="button"
          onClick={() => setContextOpen(true)}
          className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 rounded-l-lg border border-r-0 border-[var(--border)] bg-[var(--bg-surface)] p-2 text-[var(--text-muted)] hover:text-[var(--accent)] xl:block"
          aria-label="Open context panel"
        >
          <PanelRightOpen size={18} />
        </button>
      )}

      {/* Tablet overlay drawer (1024–1279px) */}
      {contextOverlayOpen && (
        <>
          <div
            className="fixed inset-0 z-40 hidden bg-black/60 lg:block xl:hidden"
            onClick={() => setContextOverlayOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 right-0 z-50 hidden w-80 border-l border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl lg:block xl:hidden">
            <ContextPanel onClose={() => setContextOverlayOpen(false)} />
          </div>
        </>
      )}

      {/* Mobile bottom sheet (< 1024px) */}
      {contextOverlayOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setContextOverlayOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-hidden rounded-t-2xl border-t border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl lg:hidden">
            <div className="mx-auto mb-2 mt-3 h-1 w-10 rounded-full bg-[var(--border)]" />
            <ContextPanel onClose={() => setContextOverlayOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}
