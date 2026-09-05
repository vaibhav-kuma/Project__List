import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { MODE_LIST } from '../config/modes'
import { useMode } from '../context/ModeContext'
import type { AgentMode } from '../types'

export function ModeSwitcher() {
  const { activeMode, setMode, accentColor, modeLabel } = useMode()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative px-3 pb-4">
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        Mode Switcher
      </p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm transition-colors hover:border-[var(--accent)]"
      >
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
          />
          {modeLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-3 right-3 z-50 mb-1 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl">
          {MODE_LIST.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setMode(mode.id as AgentMode)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-elevated)] ${
                activeMode === mode.id ? 'bg-[var(--bg-elevated)]' : ''
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: mode.accent }}
              />
              <span>{mode.label}</span>
              <span className="ml-auto text-xs text-[var(--text-muted)]">
                {mode.personaLabel}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
