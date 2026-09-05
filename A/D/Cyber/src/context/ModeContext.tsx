import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_MODE, MODES } from '../config/modes'
import type { AgentMode } from '../types'

interface ModeContextValue {
  activeMode: AgentMode
  setMode: (mode: AgentMode) => void
  accentColor: string
  accentGlow: string
  personaLabel: string
  modeLabel: string
  systemPrompt: string
}

const ModeContext = createContext<ModeContextValue | null>(null)

export function ModeProvider({ children }: { children: ReactNode }) {
  const [activeMode, setActiveMode] = useState<AgentMode>(DEFAULT_MODE)
  const config = MODES[activeMode]

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', config.accent)
    document.documentElement.style.setProperty('--accent-glow', config.accentGlow)
  }, [config.accent, config.accentGlow])

  const value: ModeContextValue = {
    activeMode,
    setMode: setActiveMode,
    accentColor: config.accent,
    accentGlow: config.accentGlow,
    personaLabel: config.personaLabel,
    modeLabel: config.label,
    systemPrompt: config.systemPrompt,
  }

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
