export type AgentMode =
  | 'red-team'
  | 'blue-team'
  | 'soc'
  | 'bug-bounty'
  | 'pentest'
  | 'offensive-security'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface SessionStats {
  vulnsFound: number
  defensesSuggested: number
  scriptsGenerated: number
}

export interface AttachmentMeta {
  name: string
  type: string
  content?: string
}
