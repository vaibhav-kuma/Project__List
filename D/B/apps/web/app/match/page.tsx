"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { z } from "zod";

function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
}

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
}

const MeSchema = z.object({
  user: z.object({ id: z.string() }),
  profile: z.any().nullable().optional(),
  privacy: z.any().nullable().optional()
});

type MatchedPayload = {
  matchId: string;
  roomId: string;
  peerUserId: string;
  durationMs: number;
};

export default function MatchPage() {
  const socketUrl = useMemo(() => getSocketUrl(), []);
  const apiBase = useMemo(() => getApiBase(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "queued" | "matched" | "ended" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchedPayload | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [extendChoice, setExtendChoice] = useState<null | boolean>(null);
  const [peerDecision, setPeerDecision] = useState<null | boolean>(null);
  const [reporting, setReporting] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("harassment_hate");
  const [reportDetails, setReportDetails] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [mlMsg, setMlMsg] = useState<string | null>(null);
  const [showSafetyTips, setShowSafetyTips] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const politeRef = useRef(false);
  const statsTimerRef = useRef<number | null>(null);
  const mlTimerRef = useRef<number | null>(null);
  const nudityModelRef = useRef<any>(null);
  const mlTriggeredRef = useRef(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [conn, setConn] = useState<"new" | "checking" | "connected" | "disconnected" | "failed" | "closed">("new");
  const [quality, setQuality] = useState<"good" | "ok" | "poor" | "unknown">("unknown");
  const [filter, setFilter] = useState<"none" | "beauty" | "bw" | "sepia" | "blur" | "neon" | "pixel">("none");
  const [tier, setTier] = useState<"free" | "plus">("free");
  const [plusPrompt, setPlusPrompt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const resp = await fetch(`${apiBase}/me`, { credentials: "include" });
      const data = await resp.json().catch(() => ({}));
      const parsed = MeSchema.safeParse(data);
      if (!resp.ok || !parsed.success) {
        window.location.href = "/auth/login";
        return;
      }
      if (cancelled) return;
      setUserId(parsed.data.user.id);

      try {
        const seen = localStorage.getItem("ninor_seen_safety_tips_v1");
        if (!seen) setShowSafetyTips(true);
      } catch {
        setShowSafetyTips(true);
      }

      const entResp = await fetch(`${apiBase}/entitlements`, { credentials: "include" }).catch(() => null);
      if (entResp && entResp.ok) {
        const ent = await entResp.json().catch(() => ({}));
        const t = (ent?.entitlements?.tier ?? "free") as "free" | "plus";
        setTier(t);
      }

      const socket = io(socketUrl, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("hello", { userId: parsed.data.user.id });
        // region hint: browser timezone as a cheap proxy in MVP
        const region = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "global";
        socket.emit("queue:join", { region });
        setStatus("queued");
      });
      socket.on("queue:position", (p: { approxPosition: number | null; region: string }) => {
        // show in status line via error slot for now (keeps UI minimal)
        if (status === "queued") {
          setError(p.approxPosition ? `Queue position ~${p.approxPosition} (${p.region})` : `Queued (${p.region})`);
        }
      });

    socket.on("queue:error", (p: { message?: string }) => {
      setError(p?.message ?? "Queue error");
      setStatus("error");
    });

      socket.on("matched", async (payload: MatchedPayload) => {
      setMatch(payload);
      setStatus("matched");
      setExtendChoice(null);
      setPeerDecision(null);
      startCountdown(payload.durationMs);
        politeRef.current = parsed.data.user.id < payload.peerUserId;
        await startWebRTC(payload.matchId, payload.peerUserId, socket);
    });

      socket.on("webrtc:offer", async (p: { matchId: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = pcRef.current;
        if (!pc) return;

        const offerCollision = p.sdp.type === "offer" && (makingOfferRef.current || pc.signalingState !== "stable");
        ignoreOfferRef.current = !politeRef.current && offerCollision;
        if (ignoreOfferRef.current) return;

        await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { matchId: p.matchId, sdp: pc.localDescription });
      });

      socket.on("webrtc:answer", async (p: { matchId: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      });

      socket.on("webrtc:ice", async (p: { matchId: string; candidate: RTCIceCandidateInit }) => {
        try {
          const pc = pcRef.current;
          if (!pc) return;
          if (ignoreOfferRef.current) return;
          await pc.addIceCandidate(new RTCIceCandidate(p.candidate));
        } catch {
          // ignore
        }
      });

    socket.on("extend:update", (p: { matchId: string; peerDecision: boolean }) => {
      setPeerDecision(p.peerDecision);
    });

    socket.on("extend:accepted", (p: { matchId: string; durationMs: number }) => {
      setExtendChoice(null);
      setPeerDecision(null);
      startCountdown(p.durationMs);
    });

    socket.on("call:ended", async (p: { matchId: string; reason: string }) => {
      setStatus("ended");
      setMatch(null);
      stopCountdown();
      await teardownWebRTC();
      // Rejoin queue automatically after a short pause
      setTimeout(() => {
        socket.emit("queue:join");
        setStatus("queued");
      }, 500);
    });

    socket.on("disconnect", () => {
      setStatus("error");
      setError("Disconnected from server");
    });

      return () => {
        stopCountdown();
        void teardownWebRTC();
        socket.disconnect();
      };
    }

    const cleanupPromise = boot();

    return () => {
      cancelled = true;
      void cleanupPromise;
      stopCountdown();
      void teardownWebRTC();
      socketRef.current?.disconnect();
    };
  }, [socketUrl, apiBase]);

  function startCountdown(durationMs: number) {
    stopCountdown();
    const started = Date.now();
    setRemainingMs(durationMs);
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const remain = Math.max(0, durationMs - elapsed);
      setRemainingMs(remain);
      if (remain === 0) stopCountdown();
    }, 100);
  }

  function stopCountdown() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startWebRTC(matchId: string, peerUserId: string, socket: Socket) {
    await teardownWebRTC();

    let local: MediaStream;
    try {
      // Mobile-optimized, battery-efficient constraints
      local = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        }, 
        audio: true 
      });
    } catch (e: any) {
      setError("Camera or Microphone access was denied. Please check your browser permissions.");
      socket.emit("call:end", { matchId, reason: "error" });
      setStatus("error");
      return;
    }

    localStreamRef.current = local;
    setMicOn(true);
    setCamOn(true);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = local;
      await localVideoRef.current.play().catch(() => {});
    }

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remote;
      await remoteVideoRef.current.play().catch(() => {});
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
    });
    pcRef.current = pc;
    setConn("new");
    setQuality("unknown");

    local.getTracks().forEach((t) => {
      if (t.kind === 'video') {
        pc.addTransceiver(t, {
          direction: 'sendrecv',
          streams: [local],
          sendEncodings: [
            { rid: 'q', scaleResolutionDownBy: 4, maxBitrate: 100000 },
            { rid: 'h', scaleResolutionDownBy: 2, maxBitrate: 300000 },
            { rid: 'f', maxBitrate: 900000 }
          ]
        });
      } else {
        pc.addTrack(t, local);
      }
    });

    pc.ontrack = (ev) => {
      ev.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket.emit("webrtc:ice", { matchId, candidate: ev.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      setConn((pc.connectionState as any) ?? "new");
    };

    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current = true;
        await pc.setLocalDescription();
        socket.emit("webrtc:offer", { matchId, sdp: pc.localDescription });
      } catch {
        // ignore
      } finally {
        makingOfferRef.current = false;
      }
    };

    startStatsLoop();
    startMlLoop(matchId, peerUserId);
  }

  async function teardownWebRTC() {
    stopStatsLoop();
    stopMlLoop();
    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.onnegotiationneeded = null;
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }

  function toggleMic() {
    const s = localStreamRef.current;
    if (!s) return;
    const next = !micOn;
    s.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }

  function toggleCam() {
    const s = localStreamRef.current;
    if (!s) return;
    const next = !camOn;
    s.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  }

  function startStatsLoop() {
    stopStatsLoop();
    statsTimerRef.current = window.setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let rttMs: number | null = null;
        let packetsLost = 0;
        let packetsTotal = 0;
        stats.forEach((r: any) => {
          if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime) {
            rttMs = Math.round(r.currentRoundTripTime * 1000);
          }
          if ((r.type === "inbound-rtp" || r.type === "outbound-rtp") && typeof r.packetsLost === "number") {
            packetsLost += r.packetsLost;
          }
          if ((r.type === "inbound-rtp" || r.type === "outbound-rtp") && typeof r.packetsReceived === "number") {
            packetsTotal += r.packetsReceived;
          }
        });
        const lossPct = packetsTotal > 0 ? (packetsLost / packetsTotal) * 100 : 0;
        const q =
          rttMs === null ? "unknown" : rttMs < 120 && lossPct < 2 ? "good" : rttMs < 250 && lossPct < 5 ? "ok" : "poor";
        setQuality(q as any);
      } catch {
        // ignore
      }
    }, 2000);
  }

  function stopStatsLoop() {
    if (statsTimerRef.current) {
      window.clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
  }

  async function ensureNudityModel() {
    if (nudityModelRef.current) return nudityModelRef.current;
    setMlMsg("Safety check loading…");
    try {
      const ml = await import("./mlModeration");
      const model = await ml.loadNudityModel();
      nudityModelRef.current = model;
      return model;
    } catch {
      // If the model fails to load, we simply disable client-side nudity checks.
      nudityModelRef.current = null;
      return null;
    } finally {
      setMlMsg(null);
    }
  }

  function stopMlLoop() {
    if (mlTimerRef.current) {
      window.clearInterval(mlTimerRef.current);
      mlTimerRef.current = null;
    }
    mlTriggeredRef.current = false;
  }

  function startMlLoop(matchId: string, suspectUserId: string) {
    stopMlLoop();
    if (!matchId || !suspectUserId) return;

    mlTimerRef.current = window.setInterval(async () => {
      if (mlTriggeredRef.current) return;
      const video = remoteVideoRef.current;
      const socket = socketRef.current;
      if (!video || !socket) return;
      if (video.readyState < 2) return;

      const canvas = captureCanvasRef.current ?? document.createElement("canvas");
      captureCanvasRef.current = canvas;

      const w = Math.max(1, Math.min(360, video.videoWidth || 0));
      const h = Math.max(1, Math.min(360, video.videoHeight || 0));
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);

      const model = await ensureNudityModel();
      if (!model) return;

      const ml = await import("./mlModeration");
      const result = await ml.analyzeFrameForNudity(model, canvas);
      // Conservative threshold: only trigger when high confidence.
      if (result.score >= 0.9) {
        mlTriggeredRef.current = true;
        setMlMsg("Safety system detected explicit content. Ending session…");
        socket.emit("ml:violation", {
          matchId,
          suspectUserId,
          label: result.label,
          score: result.score,
          modelName: result.modelName,
          modelVersion: result.modelVersion,
          reasonCode: "nudity_explicit",
          metadata: { side: "remote" }
        });
      }
    }, 1500);
  }

  function decideExtend(decision: boolean) {
    if (!match) return;
    setExtendChoice(decision);
    socketRef.current?.emit("extend:decide", { matchId: match.matchId, decision });
  }

  async function report(reason: string, details?: string, evidence?: File | null) {
    if (!userId || !match) return;
    setReporting(true);
    setReportMsg(null);
    try {
      const resp = await fetch(`${apiBase}/reports/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reportedUserId: match.peerUserId,
          matchId: match.matchId,
          reasonCode: reason,
          details: details?.trim() ? details.trim() : undefined
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ? "Invalid report" : "Report failed");
      const reportId = data?.report?.id as string | undefined;
      if (evidence && reportId) {
        const fd = new FormData();
        fd.set("reportId", reportId);
        fd.set("kind", evidence.type.startsWith("video/") ? "recording" : "screenshot");
        fd.set("evidence", evidence);
        await fetch(`${apiBase}/reports/evidence`, { method: "POST", body: fd, credentials: "include" }).catch(() => {});
      }
      setReportMsg("Reported. Thanks—our safety team will review.");
    } catch (e) {
      setReportMsg(e instanceof Error ? e.message : "Report failed");
    } finally {
      setReporting(false);
    }
  }

  const seconds = Math.ceil(remainingMs / 1000);
  const showExtend = status === "matched" && remainingMs <= 5_000;
  const videoFilterCss =
    filter === "none"
      ? "none"
      : filter === "beauty"
        ? "brightness(1.08) contrast(1.08) saturate(1.15)"
        : filter === "bw"
          ? "grayscale(1)"
          : filter === "sepia"
            ? "sepia(1)"
            : filter === "neon"
              ? "contrast(1.2) saturate(1.8) hue-rotate(80deg)"
              : filter === "pixel"
                ? "contrast(1.05) saturate(1.1)"
                : "blur(3px)";

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50; // swipe left translates to > 50px diff
    if (isLeftSwipe && match) {
      socketRef.current?.emit("call:end", { matchId: match.matchId, reason: "skip" });
    }
  };

  return (
    <main 
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndEvent}
      style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: "8px 0" }}>Matching</h2>
          <div style={{ color: "#444" }}>
            Status: <b>{status}</b>
            {match ? (
              <>
                {" "}
                · Peer: <b>{match.peerUserId}</b>
              </>
            ) : null}
          </div>
        </div>
        <button
          onClick={() => (window.location.href = "/")}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
        >
          Edit profile
        </button>
      </div>

      {error ? <div style={{ marginTop: 12, color: "#b00020" }}>{error}</div> : null}

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #eee", background: "#fafafa" }}>
            You
          </div>
          <video
            ref={localVideoRef}
            muted
            playsInline
            style={{
              width: "100%",
              height: 360,
              background: "#000",
              filter: videoFilterCss,
              imageRendering: filter === "pixel" ? ("pixelated" as any) : "auto"
            }}
          />
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #eee", background: "#fafafa" }}>
            Stranger
          </div>
          <video ref={remoteVideoRef} playsInline style={{ width: "100%", height: 360, background: "#000" }} />
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
          Conn: <b>{conn}</b> · Quality: <b>{quality}</b>
        </div>

        <button
          onClick={toggleMic}
          disabled={!localStreamRef.current}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: micOn ? "#fff" : "#eee" }}
        >
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={toggleCam}
          disabled={!localStreamRef.current}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: camOn ? "#fff" : "#eee" }}
        >
          {camOn ? "Camera off" : "Camera on"}
        </button>

        <select
          value={filter}
          onChange={(e) => {
            const v = e.target.value as any;
            const plusOnly = v === "neon" || v === "pixel";
            if (plusOnly && tier !== "plus") {
              setPlusPrompt("This filter is a Plus feature.");
              setFilter("none");
              return;
            }
            setFilter(v);
          }}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
        >
          <option value="none">Filter: None</option>
          <option value="beauty">Beauty</option>
          <option value="bw">B&W</option>
          <option value="sepia">Sepia</option>
          <option value="blur">Blur (whole frame)</option>
          <option value="neon">Neon (Plus)</option>
          <option value="pixel">Pixel (Plus)</option>
        </select>
        <div style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
          Time left: <b>{status === "matched" ? `${seconds}s` : "-"}</b>
        </div>

        {showExtend ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>Extend?</span>
            <button
              onClick={() => decideExtend(true)}
              disabled={extendChoice !== null}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #0a7", background: "#0a7", color: "#fff" }}
            >
              Yes
            </button>
            <button
              onClick={() => decideExtend(false)}
              disabled={extendChoice !== null}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #b00020", background: "#b00020", color: "#fff" }}
            >
              No
            </button>
            <span style={{ color: "#555" }}>
              You: <b>{extendChoice === null ? "-" : extendChoice ? "Yes" : "No"}</b> · Peer:{" "}
              <b>{peerDecision === null ? "-" : peerDecision ? "Yes" : "No"}</b>
            </span>
          </div>
        ) : null}

        <button
          onClick={() => match && socketRef.current?.emit("call:end", { matchId: match.matchId, reason: "skip" })}
          disabled={!match}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
        >
          Skip
        </button>

        <button
          onClick={() => {
            if (match) socketRef.current?.emit("call:end", { matchId: match.matchId, reason: "user_exit" });
            window.location.href = "/";
          }}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #b00020", background: "#fff" }}
        >
          Emergency exit
        </button>

        <button
          onClick={() => (window.location.href = "/moments")}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
        >
          Moments
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#666" }}>Safety:</span>
          <a
            href="/legal/guidelines"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff", textDecoration: "none", color: "inherit" }}
          >
            Safety tips
          </a>
          <button
            onClick={() => setReportOpen(true)}
            disabled={!match || reporting}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #b00020", background: "#b00020", color: "#fff" }}
          >
            Report
          </button>
        </div>
      </div>

      {mlMsg ? <div style={{ marginTop: 10, color: "#b00020" }}>{mlMsg}</div> : null}
      {plusPrompt ? (
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ color: "#b00020" }}>{plusPrompt}</div>
          <a
            href="/plus"
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #0a7", background: "#0a7", color: "#fff", textDecoration: "none" }}
          >
            Upgrade to Plus
          </a>
          <button
            onClick={() => setPlusPrompt(null)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {reportMsg ? <div style={{ marginTop: 10, color: reportMsg.startsWith("Reported") ? "#0a7" : "#b00020" }}>{reportMsg}</div> : null}

      {showSafetyTips ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 40
          }}
          onClick={() => setShowSafetyTips(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(760px, 100%)", background: "#fff", borderRadius: 12, border: "1px solid #ddd", padding: 14 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Safety tips</h3>
              <button
                onClick={() => setShowSafetyTips(false)}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
              >
                Close
              </button>
            </div>
            <ul style={{ marginTop: 10, paddingLeft: 18, color: "#444", lineHeight: 1.5 }}>
              <li>Never share passwords, financial info, or verification codes.</li>
              <li>Be cautious with contact info requests (WhatsApp/Telegram/Instagram).</li>
              <li>If something feels off, use <b>Emergency exit</b>, then <b>Report</b> or <b>Block</b>.</li>
              <li>Keep location sharing off. We never show your exact location to strangers.</li>
            </ul>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <a
                href="/legal/guidelines"
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff", textDecoration: "none", color: "inherit" }}
              >
                Read guidelines
              </a>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem("ninor_seen_safety_tips_v1", "1");
                  } catch {
                    // ignore
                  }
                  setShowSafetyTips(false);
                }}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #0a7", background: "#0a7", color: "#fff" }}
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reportOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "grid",
            placeItems: "center",
            padding: 16
          }}
          onClick={() => setReportOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(720px, 100%)", background: "#fff", borderRadius: 12, border: "1px solid #ddd", padding: 14 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Report this chat</h3>
              <button
                onClick={() => setReportOpen(false)}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Reason</span>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
                >
                  <option value="inappropriate_content">Inappropriate content</option>
                  <option value="nudity_explicit">Nudity / explicit content</option>
                  <option value="violence_gore">Violence / gore</option>
                  <option value="harassment_hate">Harassment / hate</option>
                  <option value="underage">Underage</option>
                  <option value="spam_scam">Spam / scam</option>
                  <option value="impersonation">Impersonation</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Details (optional)</span>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="What happened? Any context helps moderators."
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", resize: "vertical" }}
                />
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={async () => {
                    if (!match || !userId) return;
                    await fetch(`${apiBase}/blocks/add`, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ userId, blockedUserId: match.peerUserId, reason: "in_chat_block" })
                    }).catch(() => {});
                    setReportMsg("User blocked.");
                    setReportOpen(false);
                    socketRef.current?.emit("call:end", { matchId: match.matchId, reason: "blocked" });
                  }}
                  disabled={!match || reporting}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333", background: "#fff" }}
                >
                  Block user
                </button>
                <button
                  onClick={async () => {
                    const video = remoteVideoRef.current;
                    if (!video) return;
                    const canvas = document.createElement("canvas");
                    const w = Math.max(1, video.videoWidth || 0);
                    const h = Math.max(1, video.videoHeight || 0);
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    ctx.drawImage(video, 0, 0, w, h);
                    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
                    if (!blob) return;
                    setEvidenceFile(new File([blob], `evidence_${Date.now()}.jpg`, { type: "image/jpeg" }));
                  }}
                  disabled={!match}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #333", background: "#fff" }}
                >
                  Capture screenshot
                </button>

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Attach file:</span>
                  <input type="file" accept="image/*,video/*" onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)} />
                </label>

                {evidenceFile ? <span style={{ color: "#444" }}>{evidenceFile.name}</span> : <span style={{ color: "#777" }}>No evidence attached</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setReportOpen(false)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff" }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await report(reportReason, reportDetails, evidenceFile);
                    setReportOpen(false);
                    setReportDetails("");
                    setEvidenceFile(null);
                  }}
                  disabled={!match || reporting}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #0a7", background: "#0a7", color: "#fff" }}
                >
                  Submit report
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

