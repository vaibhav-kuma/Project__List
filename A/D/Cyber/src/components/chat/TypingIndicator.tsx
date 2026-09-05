import { AegisLogo } from '../AegisLogo'

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="mt-1 flex-shrink-0">
        <AegisLogo size={28} />
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
        </div>
      </div>
    </div>
  )
}
