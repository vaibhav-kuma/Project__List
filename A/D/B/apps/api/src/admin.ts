import { Router } from "express";
import { prisma } from "./prisma.js";
import { z } from "zod";
import os from "os";
import { authMiddleware } from "./auth.js";
import { getEnv } from "./env.js";

const env = getEnv();
export const adminRouter = Router();

adminRouter.use(authMiddleware(env));

// Simple RBAC: allow if email is in ADMIN_EMAILS or if it's the only way for now.
adminRouter.use(async (req, res, next) => {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: "not_authenticated" });
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status === "banned" || user.status === "deleted") {
    return res.status(403).json({ error: "forbidden" });
  }
  
  const adminEmails = env.ADMIN_EMAILS ? env.ADMIN_EMAILS.split(",") : ["admin@ninor.local"];
  if (user.email && adminEmails.includes(user.email)) {
    return next();
  }
  
  // For dev purposes, if no ADMIN_EMAILS set and testing, maybe allow?
  // We'll enforce the check.
  if (process.env.NODE_ENV === "development" && !env.ADMIN_EMAILS) {
    return next();
  }
  
  return res.status(403).json({ error: "admin_required" });
});

// Analytics (DAU, Matches, Avg Duration, Premium Conversion)
adminRouter.get("/analytics", async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dau = await prisma.user.count({
    where: { lastSeenAt: { gte: startOfDay } }
  });

  const totalMatches = await prisma.match.count();
  const matchAgg = await prisma.match.aggregate({
    _avg: { durationSeconds: true }
  });

  const premiumCount = await prisma.subscription.count({
    where: { status: "active" }
  });
  const totalUsers = await prisma.user.count();
  const conversionRate = totalUsers > 0 ? premiumCount / totalUsers : 0;

  res.json({
    dau,
    totalMatches,
    avgMatchDurationSeconds: matchAgg._avg.durationSeconds || 0,
    premiumConversionRate: conversionRate,
    premiumCount,
    totalUsers
  });
});

// Users Management
adminRouter.get("/users", async (req, res) => {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    search: z.string().optional()
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  
  const { limit, offset, search } = parsed.data;
  
  const whereClause: any = search ? {
    OR: [
      { id: { contains: search } },
      { email: { contains: search } },
      { phoneE164: { contains: search } }
    ]
  } : {};

  const users = await prisma.user.findMany({
    where: whereClause,
    take: limit,
    skip: offset,
    include: { profile: true },
    orderBy: { createdAt: "desc" }
  });

  const total = await prisma.user.count({ where: whereClause });

  res.json({ users, total });
});

adminRouter.post("/users/:id/status", async (req, res) => {
  const schema = z.object({
    status: z.enum(["active", "suspended", "banned"]),
    reason: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status, statusReason: parsed.data.reason }
  });

  res.json({ user });
});

// Moderation
adminRouter.get("/moderation/cases", async (req, res) => {
  const cases = await prisma.moderationCase.findMany({
    where: { status: "open" },
    include: { 
      reportedUser: true,
      report: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json({ cases });
});

adminRouter.post("/moderation/cases/:id/resolve", async (req, res) => {
  const schema = z.object({
    action: z.enum(["warn", "timeout", "suspend", "ban", "content_remove", "none"]),
    note: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const caze = await prisma.moderationCase.update({
    where: { id: req.params.id },
    data: { 
      status: "resolved", 
      resolvedAt: new Date(), 
      resolutionNote: parsed.data.note,
      assignedTo: (req as any).userId
    }
  });

  if (parsed.data.action !== "none" && caze.reportedUserId) {
    if (["suspend", "ban"].includes(parsed.data.action)) {
      await prisma.user.update({
        where: { id: caze.reportedUserId },
        data: { status: parsed.data.action === "ban" ? "banned" : "suspended" }
      });
    }
  }

  res.json({ case: caze });
});

// System Health
adminRouter.get("/health", async (req, res) => {
  let dbStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = "error";
  }

  res.json({
    status: "ok",
    uptime: process.uptime(),
    db: dbStatus,
    memory: process.memoryUsage(),
    osLoad: os.loadavg(),
    timestamp: new Date()
  });
});
