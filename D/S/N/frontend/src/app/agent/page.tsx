"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Pause2, StopCircle, AlertCircle, Loader2 } from "lucide-react";

interface Message {
  id: string;
  timestamp: string;
  type: "search" | "success" | "error" | "applying" | "step" | "info";
  content: string;
}

interface Stats {
  applied: number;
  success: number;
  failed: number;
  pending: number;
}

interface CurrentJob {
  title: string;
  company: string;
  location: string;
  salary?: string;
  relevance: number;
}

const WS_URL = "ws://localhost:8000";

export default function AgentPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats>({ applied: 0, success: 0, failed: 0, pending: 0 });
  const [currentJob, setCurrentJob] = useState<CurrentJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket
  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      setError("No user ID found. Please onboard first.");
      setTimeout(() => router.push("/onboard"), 2000);
      return;
    }

    const wsUrl = `${WS_URL}/ws/${userId}`;
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setError("");
        addMessage("🟢 Connected to agent", "info");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error("Failed to parse message:", err);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        setError("WebSocket error. Check if backend is running.");
      };

      ws.onclose = () => {
        setIsConnected(false);
        addMessage("🔌 Disconnected from agent", "info");
      };

      wsRef.current = ws;

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (err) {
      setError("Failed to connect to WebSocket");
    }
  }, [router]);

  const addMessage = (content: string, type: Message["type"]) => {
    const newMessage: Message = {
      id: String(Date.now()),
      timestamp: new Date().toLocaleTimeString(),
      type,
      content,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleWebSocketMessage = (data: any) => {
    const { type, content, stats: statUpdate, current_job, progress: progUpdate, total_jobs } = data;

    // Add message to feed
    if (content) {
      addMessage(content, type || "info");
    }

    // Update stats
    if (statUpdate) {
      setStats(statUpdate);
    }

    // Update current job
    if (current_job) {
      setCurrentJob(current_job);
    }

    // Update progress
    if (progUpdate !== undefined) {
      setProgress(progUpdate);
    }

    if (total_jobs !== undefined) {
      setTotalJobs(total_jobs);
    }
  };

  const sendCommand = (command: "pause" | "stop") => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
      if (command === "pause") {
        setIsPaused(true);
      } else {
        setIsStopped(true);
      }
    }
  };

  const getMessageIcon = (type: Message["type"]) => {
    const icons: Record<Message["type"], string> = {
      search: "🔍",
      success: "✅",
      error: "❌",
      applying: "📝",
      step: "→",
      info: "ℹ️",
    };
    return icons[type];
  };

  const getMessageColor = (type: Message["type"]) => {
    const colors: Record<Message["type"], string> = {
      search: "text-blue-400",
      success: "text-emerald-400",
      error: "text-red-400",
      applying: "text-amber-400",
      step: "text-slate-400",
      info: "text-indigo-400",
    };
    return colors[type];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <h1 className="text-2xl font-bold">
              AutoApply — Agent {isConnected ? "Running" : "Disconnected"} {isConnected && "🟢"}
            </h1>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 ring-1 ring-red-500/20">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Panel - Activity Feed (60%) */}
          <div className="lg:col-span-2">
            <div className="glass rounded-xl overflow-hidden flex flex-col h-[600px]">
              {/* Header */}
              <div className="border-b border-white/[0.08] px-6 py-4 bg-white/[0.02]">
                <h2 className="text-sm font-semibold text-white">LIVE ACTIVITY FEED</h2>
              </div>

              {/* Scrollable Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Waiting for agent to start...</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 text-sm font-mono ${getMessageColor(msg.type)}`}
                    >
                      <span className="text-slate-500 flex-shrink-0 w-10">{msg.timestamp}</span>
                      <span className="flex-shrink-0">{getMessageIcon(msg.type)}</span>
                      <span className="flex-1 break-words">{msg.content}</span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Right Panel - Stats & Controls (40%) */}
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="glass rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300">STATS</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Applied */}
                <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-400">{stats.applied}</div>
                  <div className="mt-1 text-xs text-slate-400">Applied</div>
                </div>

                {/* Success */}
                <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{stats.success}</div>
                  <div className="mt-1 text-xs text-slate-400">Success</div>
                </div>

                {/* Failed */}
                <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
                  <div className="mt-1 text-xs text-slate-400">Failed</div>
                </div>

                {/* Pending */}
                <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
                  <div className="mt-1 text-xs text-slate-400">Pending</div>
                </div>
              </div>
            </div>

            {/* Current Job */}
            {currentJob ? (
              <div className="glass rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300">CURRENT JOB</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-white font-semibold">{currentJob.title}</div>
                    <div className="text-slate-400">@ {currentJob.company}</div>
                  </div>
                  <div className="text-slate-400">
                    📍 {currentJob.location}
                  </div>
                  {currentJob.salary && (
                    <div className="text-emerald-400">
                      💰 {currentJob.salary}
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg bg-white/[0.04] p-3 mt-3">
                    <span className="text-slate-400">Relevance</span>
                    <span className="font-semibold text-indigo-400">{currentJob.relevance}/100</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">CURRENT JOB</h3>
                <div className="text-xs text-slate-400">Waiting for job selection...</div>
              </div>
            )}

            {/* Progress */}
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">PROGRESS</h3>
                <span className="text-sm font-semibold text-indigo-400">
                  {progress}/{totalJobs}
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-300"
                    style={{ width: `${totalJobs > 0 ? (progress / totalJobs) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="glass rounded-xl p-4 space-y-3">
              <button
                onClick={() => sendCommand("pause")}
                disabled={!isConnected || isPaused || isStopped}
                className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  isPaused
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : isConnected && !isStopped
                    ? "bg-amber-600 text-white hover:bg-amber-500"
                    : "bg-white/[0.04] text-slate-500 cursor-not-allowed"
                }`}
              >
                <Pause2 className="h-4 w-4" />
                {isPaused ? "Paused" : "Pause"}
              </button>
              <button
                onClick={() => sendCommand("stop")}
                disabled={!isConnected || isStopped}
                className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  isStopped
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : isConnected
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "bg-white/[0.04] text-slate-500 cursor-not-allowed"
                }`}
              >
                <StopCircle className="h-4 w-4" />
                {isStopped ? "Stopped" : "Stop"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        {isStopped && (
          <div className="mt-6 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 ring-1 ring-emerald-500/20">
            ✅ Agent successfully stopped. Applications submitted: {stats.applied}
          </div>
        )}
      </div>
    </div>
  );
}
