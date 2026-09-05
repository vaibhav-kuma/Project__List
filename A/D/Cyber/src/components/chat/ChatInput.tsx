import { useRef, useState, type KeyboardEvent } from 'react'
import { Paperclip, Terminal, X, FileText, Image } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

export function ChatInput() {
  const { sendMessage, isLoading, attachments, addAttachments, removeAttachment } = useChat()
  const [input, setInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return
    const text = input.trim() || 'Analyze the attached file(s).'
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-surface)] p-4">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <span
              key={`${file.name}-${i}`}
              className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-xs"
            >
              {file.type.startsWith('image/') ? (
                <Image size={12} style={{ color: 'var(--accent)' }} />
              ) : (
                <FileText size={12} style={{ color: 'var(--accent)' }} />
              )}
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-shrink-0 rounded-lg border border-[var(--border)] p-2.5 text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".log,.txt,.py,.js,.ts,.json,.png,.svg,.md,.xml,.yaml,.yml,.sh,.ps1"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addAttachments(e.target.files)
            e.target.value = ''
          }}
        />

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter target, logs, code, or query..."
          rows={1}
          disabled={isLoading}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || (!input.trim() && attachments.length === 0)}
          className="flex-shrink-0 rounded-lg p-2.5 transition-all hover:shadow-[0_0_16px_var(--accent-glow)] disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)', color: '#0a0a0a' }}
          aria-label="Send message"
        >
          <Terminal size={18} />
        </button>
      </div>
    </div>
  )
}
