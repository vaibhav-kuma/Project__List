import type { Message } from '../../types'
import { AegisLogo } from '../AegisLogo'
import { MarkdownRenderer } from './MarkdownRenderer'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2">
        <div
          className="max-w-3xl rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--accent)',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: '0 0 12px var(--accent-glow)',
          }}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          <time className="mt-1 block text-right text-[10px] text-[var(--text-muted)]">
            {message.timestamp.toLocaleTimeString()}
          </time>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="mt-1 flex-shrink-0">
        <AegisLogo size={28} />
      </div>
      <div className="max-w-3xl flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
        <p className="mb-1 text-xs font-semibold tracking-wider text-[var(--accent)]">
          AEGIS
        </p>
        <MarkdownRenderer content={message.content} />
        <time className="mt-2 block text-[10px] text-[var(--text-muted)]">
          {message.timestamp.toLocaleTimeString()}
        </time>
      </div>
    </div>
  )
}
