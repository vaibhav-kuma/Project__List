import { prisma } from "./prisma.js";

export type ModerationSeverity = "low" | "medium" | "high" | "critical";

export const REPORT_REASONS = [
  "inappropriate_content",
  "nudity_explicit",
  "violence_gore",
  "harassment_hate",
  "underage",
  "spam_scam",
  "impersonation",
  "other"
] as const;

export type ReportReasonCode = (typeof REPORT_REASONS)[number];

export function normalizeReasonCode(input: string): ReportReasonCode {
  const v = (input ?? "").toLowerCase().trim();
  if ((REPORT_REASONS as readonly string[]).includes(v)) return v as ReportReasonCode;
  // Back-compat with existing client codes
  if (v === "nudity") return "nudity_explicit";
  if (v === "abuse") return "harassment_hate";
  return "other";
}

export function reasonSeverity(reason: ReportReasonCode): { severity: ModerationSeverity; points: number; triageScore: number } {
  switch (reason) {
    case "underage":
      return { severity: "critical", points: 5, triageScore: 0.98 };
    case "nudity_explicit":
      return { severity: "high", points: 3, triageScore: 0.9 };
    case "violence_gore":
      return { severity: "high", points: 3, triageScore: 0.88 };
    case "harassment_hate":
      return { severity: "medium", points: 2, triageScore: 0.72 };
    case "spam_scam":
      return { severity: "medium", points: 2, triageScore: 0.7 };
    case "impersonation":
      return { severity: "medium", points: 2, triageScore: 0.68 };
    case "inappropriate_content":
      return { severity: "low", points: 1, triageScore: 0.5 };
    case "other":
    default:
      return { severity: "low", points: 1, triageScore: 0.4 };
  }
}

export async function getActiveSanctions(userId: string) {
  const now = new Date();
  return await prisma.userSanction.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      action: { in: ["timeout", "suspend", "ban"] }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function createStrike(opts: {
  userId: string;
  points: number;
  reasonCode: string;
  source: "report" | "ml" | "manual";
  caseId?: string | null;
  reportId?: string | null;
  mlFlagId?: string | null;
  metadata?: any;
}) {
  return await prisma.userStrike.create({
    data: {
      userId: opts.userId,
      points: opts.points,
      reasonCode: opts.reasonCode,
      source: opts.source,
      caseId: opts.caseId ?? null,
      reportId: opts.reportId ?? null,
      mlFlagId: opts.mlFlagId ?? null,
      metadata: opts.metadata ?? null
    }
  });
}

export async function strikeCountLast90d(userId: string) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.userStrike.findMany({ where: { userId, createdAt: { gte: since } } });
  const points = rows.reduce((acc, r) => acc + (r.points ?? 0), 0);
  return { points, count: rows.length };
}

export type AutomatedActionDecision =
  | { type: "none" }
  | { type: "warn"; reason: string }
  | { type: "timeout"; reason: string; expiresAt: Date }
  | { type: "ban"; reason: string }
  | { type: "suspend"; reason: string; expiresAt: Date };

export async function decideAutomatedAction(userId: string, reason: ReportReasonCode, severity: ModerationSeverity) {
  const strikes = await strikeCountLast90d(userId);

  if (severity === "critical") {
    return { type: "ban", reason: `Critical violation: ${reason}` } satisfies AutomatedActionDecision;
  }

  // 3-strikes policy (points-based, 90-day window)
  if (strikes.points >= 8) {
    return { type: "ban", reason: "Repeated violations (points threshold)" } satisfies AutomatedActionDecision;
  }
  if (strikes.points >= 5) {
    return {
      type: "suspend",
      reason: "Repeated violations (temporary suspension)",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    } satisfies AutomatedActionDecision;
  }
  if (strikes.points >= 3) {
    return {
      type: "timeout",
      reason: "Repeated violations (timeout)",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    } satisfies AutomatedActionDecision;
  }
  if (severity === "high" || severity === "medium") {
    return { type: "warn", reason: `Policy violation: ${reason}` } satisfies AutomatedActionDecision;
  }

  return { type: "none" } satisfies AutomatedActionDecision;
}

export async function applySanction(opts: {
  targetUserId: string;
  action: "warn" | "timeout" | "suspend" | "ban" | "unban";
  reason: string;
  expiresAt?: Date | null;
  actorUserId?: string | null;
  caseId?: string | null;
  metadata?: any;
}) {
  const moderationAction = await prisma.moderationAction.create({
    data: {
      targetUserId: opts.targetUserId,
      action: opts.action as any,
      reason: opts.reason,
      expiresAt: opts.expiresAt ?? null,
      actorUserId: opts.actorUserId ?? null,
      caseId: opts.caseId ?? null,
      metadata: opts.metadata ?? null
    }
  });

  // enforce via sanction row (so auth/matchmaker can block)
  const sanction = await prisma.userSanction.create({
    data: {
      userId: opts.targetUserId,
      action: opts.action as any,
      reason: opts.reason,
      createdBy: opts.actorUserId ?? "system",
      expiresAt: opts.expiresAt ?? null,
      metadata: opts.metadata ?? null
    }
  });

  // mirror into user.status for long-lived states
  if (opts.action === "ban") {
    await prisma.user.update({ where: { id: opts.targetUserId }, data: { status: "banned", statusReason: opts.reason } }).catch(() => {});
  }
  if (opts.action === "suspend" || opts.action === "timeout") {
    await prisma.user.update({ where: { id: opts.targetUserId }, data: { status: "suspended", statusReason: opts.reason } }).catch(() => {});
  }
  if (opts.action === "unban") {
    await prisma.user.update({ where: { id: opts.targetUserId }, data: { status: "active", statusReason: null } }).catch(() => {});
  }

  return { moderationAction, sanction };
}

