import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import type { AttachmentMeta, Message, SessionStats } from '../types'
import { useMode } from './ModeContext'

interface ChatContextValue {
  messages: Message[]
  isLoading: boolean
  attachments: File[]
  sessionStats: SessionStats
  setAttachments: (files: File[]) => void
  addAttachments: (files: FileList | File[]) => void
  removeAttachment: (index: number) => void
  sendMessage: (content: string) => Promise<void>
  injectPrompt: (text: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | null>(null)

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `**AEGIS Online** — *Advanced Expert Guardian of Information Systems*

Command interface initialized. I am your elite cybersecurity agent—40 years of offensive, defensive, and operational expertise synthesized into one system.

**Capabilities:** Penetration testing · Offensive security / exploit development · Red/Blue team operations · SOC analysis · Bug bounty hunting · Threat hunting · MITRE ATT&CK mapping

Drop logs, code, architectures, or targets. I will analyze with full technical depth—no hand-waving.

*Select your operational mode from the sidebar to prioritize a specific persona.*`,
  timestamp: new Date(),
}

async function readFilePreview(file: File): Promise<string | undefined> {
  const textTypes = /\.(log|txt|py|js|ts|json|md|xml|yaml|yml|sh|ps1|rb|php|java|cs|go|rs)$/i
  const isText = textTypes.test(file.name) || file.type.startsWith('text/')
  if (!isText) return undefined
  const slice = file.slice(0, 2048)
  return slice.text()
}

async function buildAttachmentContext(files: File[]): Promise<string> {
  if (files.length === 0) return ''
  const parts: string[] = ['\n\n--- Attached Files ---']
  for (const file of files) {
    const preview = await readFilePreview(file)
    if (preview) {
      parts.push(`\n**${file.name}** (${file.type || 'unknown'}):\n\`\`\`\n${preview}\n\`\`\``)
    } else {
      parts.push(`\n**${file.name}** (${file.type || 'unknown'}) — binary/image file attached`)
    }
  }
  return parts.join('')
}

function incrementStats(prev: SessionStats, mode: string): SessionStats {
  const next = { ...prev }
  next.scriptsGenerated += 1
  if (
    mode === 'red-team' ||
    mode === 'pentest' ||
    mode === 'bug-bounty' ||
    mode === 'offensive-security'
  ) {
    next.vulnsFound += Math.floor(Math.random() * 2) + 1
  }
  if (mode === 'blue-team' || mode === 'soc') {
    next.defensesSuggested += Math.floor(Math.random() * 2) + 1
  }
  return next
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { systemPrompt, activeMode } = useMode()
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    vulnsFound: 14,
    defensesSuggested: 8,
    scriptsGenerated: 5,
  })

  const addAttachments = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    setAttachments((prev) => [...prev, ...arr])
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isLoading) return

      const attachmentContext = await buildAttachmentContext(attachments)
      const fullContent = trimmed + attachmentContext

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setAttachments([])
      setIsLoading(true)
      setSessionStats((prev) => incrementStats(prev, activeMode))

      try {
        const history = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.id === userMessage.id ? fullContent : m.content,
        }))

        const attachmentMeta: AttachmentMeta[] = await Promise.all(
          attachments.map(async (f) => ({
            name: f.name,
            type: f.type,
            content: await readFilePreview(f),
          })),
        )

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            systemPrompt,
            attachments: attachmentMeta,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to get response')
        }

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `**Error:** ${err instanceof Error ? err.message : 'An unexpected error occurred. Ensure the API server is running and your AI provider API key is set in .env.'}`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [attachments, isLoading, messages, systemPrompt, activeMode],
  )

  const injectPrompt = useCallback(
    async (text: string) => {
      await sendMessage(text)
    },
    [sendMessage],
  )

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        attachments,
        sessionStats,
        setAttachments,
        addAttachments,
        removeAttachment,
        sendMessage,
        injectPrompt,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
