import { cn } from "@/lib/utils/cn";

interface StatusPillProps {
  label: string;
  tone?: "ok" | "warn" | "alert" | "info";
  pulse?: boolean;
  className?: string;
}

const toneStyles: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  ok: "text-status-ok border-status-ok/30 bg-status-ok/10",
  warn: "text-status-warn border-status-warn/30 bg-status-warn/10",
  alert: "text-status-alert border-status-alert/30 bg-status-alert/10",
  info: "text-pulse border-pulse/30 bg-pulse/10",
};

export function StatusPill({ label, tone = "ok", pulse = true, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider",
        toneStyles[tone],
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}
