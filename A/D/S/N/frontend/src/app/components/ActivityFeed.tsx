"use client";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, AlertCircle, Info, AlertTriangle,
  Globe, FileText, Search, Send, ChevronRight, Loader2,
} from "lucide-react";

export interface FeedEvent {
  type?: string;
  message: string;
  status: "info" | "success" | "warning" | "error" | "done";
  timestamp: string;
  data?: Record<string, unknown>;
}

const ICONS: Record<string, React.ElementType> = {
  success: CheckCircle2,
  done:    CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

const COLORS: Record<string, string> = {
  success: "text-emerald-400",
  done:    "text-emerald-400",
  error:   "text-red-400",
  warning: "text-amber-400",
  info:    "text-indigo-400",
};

const STEP_ICONS: Record<string, React.ElementType> = {
  navigate:  Globe,
  search:    Search,
  submit:    Send,
  cover_letter: FileText,
};

function FeedItem({ event, isLast }: { event: FeedEvent; isLast: boolean }) {
  const Icon = ICONS[event.status] ?? Info;
  const StepIcon = event.data?.step
    ? (STEP_ICONS[event.data.step as string] ?? ChevronRight)
    : ChevronRight;
  const color = COLORS[event.status] ?? "text-slate-400";

  return (
    <div className={`relative flex gap-3 pb-4 ${!isLast ? "feed-line" : ""}`}>
      {/* Dot */}
      <div className="relative mt-0.5 shrink-0">
        <div className={`h-3.5 w-3.5 rounded-full bg-current ${color} relative`}>
          {event.status === "info" && (
            <span className="pulse-dot absolute inset-0 rounded-full text-indigo-400" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${color}`}>{event.message}</p>
        <span className="text-xs text-slate-600">
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

interface ActivityFeedProps {
  userId: string;
  isRunning: boolean;
  onComplete?: (summary: Record<string, unknown>) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WS_BASE = API.replace(/^http/, "ws");

export default function ActivityFeed({ userId, isRunning, onComplete }: ActivityFeedProps) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;
    const ws = new WebSocket(`${WS_BASE}/ws/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as FeedEvent;
        if (msg.type === "pong" || msg.type === "heartbeat") return;
        setEvents((prev) => [...prev, msg]);
        if (msg.status === "done" && onComplete) {
          onComplete((msg.data?.run_summary as Record<string, unknown>) ?? {});
        }
      } catch {
        // ignore parse errors
      }
    };

    // Keep-alive ping
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 20000);

    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [userId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Live Activity</span>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-600"}`} />
          <span className="text-xs text-slate-500">{connected ? "Connected" : "Disconnected"}</span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Agent running…
          </div>
        )}
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600">
            <Info className="h-8 w-8 opacity-30" />
            <p className="text-sm">Waiting for agent activity…</p>
          </div>
        ) : (
          events.map((ev, i) => (
            <FeedItem key={i} event={ev} isLast={i === events.length - 1} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
