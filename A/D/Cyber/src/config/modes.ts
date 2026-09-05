import type { AgentMode } from '../types'
import { buildSystemPrompt } from './aegis-prompt'

export interface ModeConfig {
  id: AgentMode
  label: string
  personaLabel: string
  accent: string
  accentGlow: string
  systemPrompt: string
}

export const MODES: Record<AgentMode, ModeConfig> = {
  'red-team': {
    id: 'red-team',
    label: 'Red Team',
    personaLabel: 'Expert Red Team Tester',
    accent: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.35)',
    systemPrompt: buildSystemPrompt('red-team'),
  },
  'blue-team': {
    id: 'blue-team',
    label: 'Blue Team',
    personaLabel: 'Expert Blue Team Tester',
    accent: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.35)',
    systemPrompt: buildSystemPrompt('blue-team'),
  },
  soc: {
    id: 'soc',
    label: 'SOC',
    personaLabel: 'Expert SOC Analyst',
    accent: '#22d3ee',
    accentGlow: 'rgba(34, 211, 238, 0.35)',
    systemPrompt: buildSystemPrompt('soc'),
  },
  'bug-bounty': {
    id: 'bug-bounty',
    label: 'Bug Bounty',
    personaLabel: '40-Year Bug Bounty Hunter',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.35)',
    systemPrompt: buildSystemPrompt('bug-bounty'),
  },
  pentest: {
    id: 'pentest',
    label: 'Pentest',
    personaLabel: 'Senior Penetration Tester',
    accent: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.35)',
    systemPrompt: buildSystemPrompt('pentest'),
  },
  'offensive-security': {
    id: 'offensive-security',
    label: 'Offensive Security',
    personaLabel: 'Senior Offensive Security Tester',
    accent: '#f97316',
    accentGlow: 'rgba(249, 115, 22, 0.35)',
    systemPrompt: buildSystemPrompt('offensive-security'),
  },
}

export const MODE_LIST = Object.values(MODES)
export const DEFAULT_MODE: AgentMode = 'soc'
