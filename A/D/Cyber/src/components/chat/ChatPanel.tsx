import { useEffect, useRef } from 'react'
import { useChat } from '../../context/ChatContext'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { ChatInput } from './ChatInput'

export function ChatPanel() {
  const { messages, isLoading } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 py-4">
        <h2 className="text-lg font-semibold">Command Center</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Terminal interface — secure channel to AEGIS AI
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <ChatInput />
    </div>
  )
}
