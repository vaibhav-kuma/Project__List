import { cn } from "@/lib/utils/cn";

interface TerminalCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Terminal-styled metadata card used for the engineering-profile language. */
export function TerminalCard({ title = "system://profile", children, className }: TerminalCardProps) {
  return (
    <div className={cn("panel overflow-hidden rounded-lg", className)}>
      <div className="flex items-center gap-2 border-b border-slate-400/10 bg-white/[0.02] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-status-alert/70" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-status-warn/70" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-status-ok/70" aria-hidden />
        <span className="ml-2 font-mono text-[11px] text-slate-500">{title}</span>
      </div>
      <div className="p-4 font-mono text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
