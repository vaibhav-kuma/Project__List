import { CheckCircle, XCircle, Clock, AlertTriangle, HelpCircle } from "lucide-react";

type Status = "submitted" | "confirmed" | "failed" | "pending" | "captcha" | "login_required" | string;

const CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  submitted:      { label: "Submitted",      color: "text-blue-400 bg-blue-400/10 ring-blue-400/20",    Icon: CheckCircle },
  confirmed:      { label: "Confirmed",      color: "text-emerald-400 bg-emerald-400/10 ring-emerald-400/20", Icon: CheckCircle },
  failed:         { label: "Failed",         color: "text-red-400 bg-red-400/10 ring-red-400/20",       Icon: XCircle },
  pending:        { label: "Pending",        color: "text-amber-400 bg-amber-400/10 ring-amber-400/20", Icon: Clock },
  captcha:        { label: "CAPTCHA",        color: "text-orange-400 bg-orange-400/10 ring-orange-400/20", Icon: AlertTriangle },
  login_required: { label: "Login Required", color: "text-purple-400 bg-purple-400/10 ring-purple-400/20", Icon: HelpCircle },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = CONFIG[status] ?? {
    label: status,
    color: "text-slate-400 bg-slate-400/10 ring-slate-400/20",
    Icon: HelpCircle,
  };
  const { label, color, Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
