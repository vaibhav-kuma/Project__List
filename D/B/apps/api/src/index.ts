import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";
import Redis from "ioredis";
import { z } from "zod";
import multer from "multer";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { getEnv } from "./env.js";
import { prisma } from "./prisma.js";
import { Matchmaker } from "./matchmaker.js";
import { notifyUserEmailLike } from "./notify.js";
import { getStripe, setSubscriptionFromStripe, stripeCancelUrl, stripeSuccessUrl, upsertStripeSubscriptionFromWebhook } from "./stripeBilling.js";
import { getUserEntitlements } from "./entitlements.js";
import { createIdvSession } from "./idv.js";
import {
  decideAutomatedAction,
  normalizeReasonCode,
  reasonSeverity,
  createStrike,
  applySanction,
  REPORT_REASONS
} from "./moderationLogic.js";
import {
  cleanupExpiredMoments,
  momentsCreate,
  momentsFeedDiscover,
  momentsFeedFriends,
  momentsReact,
  momentsView
} from "./moments.js";
import {
  authMiddleware,
  googleCallback,
  googleStart,
  login,
  logout,
  me,
  phoneStart,
  phoneVerify,
  refresh,
  registerStart,
  registerVerify,
  twoFactorSetupStart,
  twoFactorSetupVerify,
  updateProfile
} from "./auth.js";

const env = getEnv();
const stripe = getStripe(env);

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cookieParser());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

function requireModerator(req: Request, res: Response, next: NextFunction) {
  if (!env.MODERATOR_API_KEY) return next();
  const key = (req.headers["x-moderator-key"] as string | undefined) ?? "";
  if (key && key === env.MODERATOR_API_KEY) return next();
  return res.status(403).json({ error: "moderator_key_required" });
}

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120
  })
);

// Stripe webhook must use raw body (before json middleware).
app.post("/billing/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return res.status(501).json({ error: "stripe_not_configured" });

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") return res.status(400).send("Missing stripe-signature");

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body as any, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e instanceof Error ? e.message : "invalid_signature"}`);
  }

  await upsertStripeSubscriptionFromWebhook({ providerEventId: event.id, payload: event });

  const t = event.type as string;
  try {
    if (t === "checkout.session.completed") {
      const session = event.data.object as any;
      const userId = session?.metadata?.userId as string | undefined;
      const planId = session?.metadata?.planId as string | undefined;
      const subId = session?.subscription as string | undefined;
      const customerId = session?.customer as string | undefined;
      if (userId && planId && subId) {
        const sub: any = await stripe.subscriptions.retrieve(subId);
        await setSubscriptionFromStripe({
          userId,
          stripeCustomerId: customerId ?? sub.customer?.toString?.() ?? null,
          stripeSubId: sub.id,
          status: sub.status,
          currentPeriodStart: sub.current_period_start ?? null,
          currentPeriodEnd: sub.current_period_end ?? null,
          cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          canceledAt: sub.canceled_at ?? null,
          trialEnd: sub.trial_end ?? null,
          planId
        });
      }
    }

    if (t === "customer.subscription.updated" || t === "customer.subscription.deleted") {
      const sub = event.data.object as any;
      const userId = sub?.metadata?.userId as string | undefined;
      const planId = sub?.metadata?.planId as string | undefined;
      const customerId = sub?.customer as string | undefined;
      if (userId && planId && sub?.id) {
        await setSubscriptionFromStripe({
          userId,
          stripeCustomerId: customerId ?? null,
          stripeSubId: sub.id,
          status: sub.status,
          currentPeriodStart: sub.current_period_start ?? null,
          currentPeriodEnd: sub.current_period_end ?? null,
          cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          canceledAt: sub.canceled_at ?? null,
          trialEnd: sub.trial_end ?? null,
          planId
        });
      }
    }
  } catch {
    // Never fail webhook retries due to app errors; event payload remains stored.
  }

  res.json({ received: true });
});

import { adminRouter } from "./admin.js";

// Now JSON parsing for all other routes.
app.use(express.json({ limit: "1mb" }));

app.use("/admin", adminRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

// -------- Age verification + parental consent --------
app.get("/age/status", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const av = await prisma.ageVerification.findUnique({ where: { userId } });
  const pc = await prisma.parentalConsent.findUnique({ where: { userId } });
  res.json({ ageVerification: av, parentalConsent: pc });
});

app.post("/age/verification/start", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const schema = z.object({ method: z.enum(["third_party", "document_upload"]).default("third_party") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.method === "third_party") {
    const session = await createIdvSession(env, userId);
    const row = await prisma.ageVerification.upsert({
      where: { userId },
      create: {
        userId,
        status: "pending",
        method: "third_party",
        provider: session.provider,
        providerSessionId: session.sessionId
      },
      update: {
        status: "pending",
        method: "third_party",
        provider: session.provider,
        providerSessionId: session.sessionId
      }
    });
    return res.json({ ageVerification: row, providerUrl: session.url });
  }

  const row = await prisma.ageVerification.upsert({
    where: { userId },
    create: { userId, status: "pending", method: "document_upload" },
    update: { status: "pending", method: "document_upload" }
  });
  res.json({ ageVerification: row });
});

// Note: /age/verification/upload is registered after multer init (below).

app.post("/parental-consent/request", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const schema = z.object({ parentEmail: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const token = crypto.randomBytes(20).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dashboardSecret = crypto.randomBytes(16).toString("hex");

  const row = await prisma.parentalConsent.upsert({
    where: { userId },
    create: {
      userId,
      parentEmail: parsed.data.parentEmail,
      consentStatus: "pending",
      verificationTokenHash: tokenHash,
      tokenExpiresAt: expiresAt,
      parentDashboardSecret: dashboardSecret
    },
    update: {
      parentEmail: parsed.data.parentEmail,
      consentStatus: "pending",
      verificationTokenHash: tokenHash,
      tokenExpiresAt: expiresAt,
      parentDashboardSecret: dashboardSecret
    }
  });

  // Dev-mode: return link token (in production, send email to parent).
  const link = `http://localhost:3000/parental/consent?token=${token}`;
  res.json({ parentalConsent: row, devConsentLink: link });
});

app.post("/parental-consent/verify", async (req, res) => {
  const schema = z.object({ token: z.string().min(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const row = await prisma.parentalConsent.findFirst({
    where: { verificationTokenHash: tokenHash, tokenExpiresAt: { gt: new Date() } }
  });
  if (!row) return res.status(400).json({ error: "invalid_or_expired_token" });

  const updated = await prisma.parentalConsent.update({
    where: { userId: row.userId },
    data: {
      consentStatus: "approved",
      consentedAt: new Date(),
      verificationTokenHash: null,
      tokenExpiresAt: null
    }
  });
  res.json({ parentalConsent: updated });
});

// -------- Auth --------
app.post("/auth/register/start", (req, res) => registerStart(env, req, res));
app.post("/auth/register/verify", (req, res) => registerVerify(env, req, res));
app.post("/auth/login", (req, res) => login(env, req, res));
app.post("/auth/refresh", (req, res) => refresh(env, req, res));
app.post("/auth/logout", (req, res) => logout(env, req, res));
app.post("/auth/phone/start", (req, res) => phoneStart(env, req, res));
app.post("/auth/phone/verify", (req, res) => phoneVerify(env, req, res));

app.get("/auth/oauth/google/start", (req, res) => googleStart(env, req, res));
app.get("/auth/oauth/google/callback", (req, res) => googleCallback(env, req, res));

app.get("/me", authMiddleware(env), (req, res) => me(req, res));
app.put("/profile", authMiddleware(env), (req, res) => updateProfile(req, res));
app.post("/2fa/setup/start", authMiddleware(env), (req, res) => twoFactorSetupStart(req, res));
app.post("/2fa/setup/verify", authMiddleware(env), (req, res) => twoFactorSetupVerify(req, res));

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

app.post(
  "/age/verification/upload",
  authMiddleware(env),
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
    { name: "selfie", maxCount: 1 }
  ]),
  async (req, res) => {
    const userId = (req as any).userId as string;
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const front = files?.front?.[0];
    const back = files?.back?.[0];
    const selfie = files?.selfie?.[0];
    if (!front && !back && !selfie) return res.status(400).json({ error: "no_files" });

    const row = await prisma.ageVerification.upsert({
      where: { userId },
      create: {
        userId,
        status: "pending",
        method: "document_upload",
        docFrontUrl: front ? `/uploads/${front.filename}` : null,
        docBackUrl: back ? `/uploads/${back.filename}` : null,
        selfieUrl: selfie ? `/uploads/${selfie.filename}` : null
      },
      update: {
        status: "pending",
        method: "document_upload",
        docFrontUrl: front ? `/uploads/${front.filename}` : undefined,
        docBackUrl: back ? `/uploads/${back.filename}` : undefined,
        selfieUrl: selfie ? `/uploads/${selfie.filename}` : undefined
      }
    });

    // Dev-mode mock: if user profile age >= 18 -> verified, else rejected.
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const age = profile?.ageBucket ?? null;
    if (typeof age === "number" && age >= 18) {
      await prisma.ageVerification.update({ where: { userId }, data: { status: "verified", verifiedAt: new Date() } });
    } else if (typeof age === "number") {
      await prisma.ageVerification.update({ where: { userId }, data: { status: "rejected" } });
    }

    const latest = await prisma.ageVerification.findUnique({ where: { userId } });
    res.json({ ageVerification: latest ?? row });
  }
);

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_avatar_${safe}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const UpsertProfileSchema = z.object({
  userId: z.string().uuid().optional(),
  age: z.coerce.number().int().min(18).max(99),
  gender: z.enum(["male", "female", "other", "undisclosed"])
});

app.post("/profile/upsert", async (req, res) => {
  const parsed = UpsertProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { userId, age, gender } = parsed.data;
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  const ensuredUser =
    user ??
    (await prisma.user.create({
      data: {}
    }));

  const profile = await prisma.profile.upsert({
    where: { userId: ensuredUser.id },
    create: { userId: ensuredUser.id, ageBucket: age, gender, preferences: {} },
    update: { ageBucket: age, gender }
  });

  res.json({ userId: ensuredUser.id, profile });
});

app.get("/moments/feed", async (req, res) => {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20)
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const moments = await prisma.moment.findMany({
    where: { status: "approved", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
    include: { user: { include: { profile: true } } }
  });

  res.json({
    moments: moments.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      expiresAt: m.expiresAt,
      caption: m.caption,
      mediaUrl: m.mediaUrl,
      mimeType: m.mimeType,
      user: {
        id: m.userId,
        gender: m.user.profile?.gender ?? "undisclosed",
        age: m.user.profile?.ageBucket ?? null
      }
    }))
  });
});

app.post("/moments/create", upload.single("media"), async (req, res) => momentsCreate(uploadsDir, req, res));
app.get("/moments/feed/discover", (req, res) => momentsFeedDiscover(req, res));
app.get("/moments/feed/friends", (req, res) => momentsFeedFriends(req, res));
app.post("/moments/view", (req, res) => momentsView(req, res));
app.post("/moments/react", (req, res) => momentsReact(req, res));

app.post("/profile/avatar", authMiddleware(env), avatarUpload.single("avatar"), async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "not_authenticated" });
  if (!req.file) return res.status(400).json({ error: "avatar file is required" });

  const avatarUrl = `/uploads/${req.file.filename}`;
  const profile = await prisma.profile.upsert({
    where: { userId },
    create: { userId, avatarUrl },
    update: { avatarUrl }
  });
  res.json({ profile });
});

app.delete("/account", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "not_authenticated" });
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } });
  await prisma.user.update({ where: { id: userId }, data: { status: "deleted", deletedAt: new Date() } });
  res.json({ ok: true });
});

// -------- GDPR: export + deletion/anonymization --------
app.get("/gdpr/export", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      privacySettings: true,
      parentalConsent: true,
      ageVerification: true,
      sanctions: true,
      subscriptions: { include: { plan: true } },
      notifications: true
    }
  });
  if (!user) return res.status(404).json({ error: "not_found" });

  const reportsMade = await prisma.report.findMany({ where: { reporterId: userId }, orderBy: { createdAt: "desc" } });
  const reportsReceived = await prisma.report.findMany({ where: { reportedUserId: userId }, orderBy: { createdAt: "desc" } });
  const strikes = await prisma.userStrike.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const messagesSent = await prisma.message.findMany({ where: { senderUserId: userId }, orderBy: { createdAt: "desc" }, take: 5000 });
  const messagesReceived = await prisma.message.findMany({ where: { recipientUserId: userId }, orderBy: { createdAt: "desc" }, take: 5000 });
  const blocks = await prisma.userBlock.findMany({ where: { OR: [{ userId }, { blockedUserId: userId }] }, orderBy: { createdAt: "desc" } });
  const terms = await prisma.termsAcceptance.findMany({ where: { userId }, orderBy: { acceptedAt: "desc" } });

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    termsAcceptances: terms,
    reportsMade,
    reportsReceived,
    strikes,
    messagesSent,
    messagesReceived,
    blocks
  };

  res.setHeader("content-type", "application/json");
  res.setHeader("content-disposition", `attachment; filename=\"gdpr_export_${userId}.json\"`);
  res.send(JSON.stringify(payload, null, 2));
});

app.post("/gdpr/delete", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const schema = z.object({ confirm: z.literal("DELETE") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "confirm_required" });

  await prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } });

  // Anonymize PII
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: null,
      phoneE164: null,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      status: "deleted",
      statusReason: "gdpr_delete",
      deletedAt: new Date()
    }
  });

  await prisma.profile.updateMany({
    where: { userId },
    data: { username: null, displayName: null, bio: null, avatarUrl: null, dob: null, preferences: undefined }
  });

  await prisma.parentalConsent.delete({ where: { userId } }).catch(() => {});
  await prisma.ageVerification.delete({ where: { userId } }).catch(() => {});

  // Keep messages for integrity but scrub content
  await prisma.message.updateMany({ where: { senderUserId: userId }, data: { body: "[deleted]" } });

  res.json({ ok: true });
});

app.post("/legal/accept", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const schema = z.object({
    termsVersion: z.string().min(1).default("v1"),
    privacyVersion: z.string().min(1).default("v1")
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const row = await prisma.termsAcceptance.create({
    data: {
      userId,
      termsVersion: parsed.data.termsVersion,
      privacyVersion: parsed.data.privacyVersion,
      ip: (req.headers["x-forwarded-for"] as string | undefined) ?? req.socket.remoteAddress ?? null,
      userAgent: req.headers["user-agent"] ?? null
    }
  });
  res.json({ acceptance: row });
});

app.post("/reports/create", authMiddleware(env), async (req, res) => {
  const schema = z.object({
    reportedUserId: z.string().uuid(),
    matchId: z.string().uuid().optional(),
    momentId: z.string().uuid().optional(),
    reasonCode: z.string().min(3).max(80),
    details: z.string().max(500).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const authedReporterId = (req as any).userId as string | undefined;
  const reporterId = authedReporterId;
  if (!reporterId) return res.status(401).json({ error: "not_authenticated" });
  if (reporterId === parsed.data.reportedUserId) return res.status(400).json({ error: "cannot_report_self" });

  const reason = normalizeReasonCode(parsed.data.reasonCode);
  const sev = reasonSeverity(reason);

  const report = await prisma.report.create({
    data: {
      reporterId,
      reportedUserId: parsed.data.reportedUserId,
      matchId: parsed.data.matchId,
      momentId: parsed.data.momentId,
      reasonCode: reason,
      details: parsed.data.details,
      status: sev.severity === "high" || sev.severity === "critical" ? "triaged" : "open",
      triageScore: sev.triageScore,
      metadata: {
        createdVia: "user_report",
        severity: sev.severity
      }
    }
  });

  // Attach (or create) a case for moderator workflow
  const caze = await prisma.moderationCase.create({
    data: {
      reportId: report.id,
      reportedUserId: report.reportedUserId,
      matchId: report.matchId,
      momentId: report.momentId,
      status: "open"
    }
  });

  // 3-strikes system (points-based) + automated action
  const strike = await createStrike({
    userId: report.reportedUserId,
    points: sev.points,
    reasonCode: reason,
    source: "report",
    caseId: caze.id,
    reportId: report.id,
    metadata: { reporterId: report.reporterId, triageScore: report.triageScore }
  });

  const decision = await decideAutomatedAction(report.reportedUserId, reason, sev.severity);
  if (decision.type !== "none") {
    const { moderationAction, sanction } = await applySanction({
      targetUserId: report.reportedUserId,
      action: decision.type,
      reason: decision.reason,
      expiresAt: "expiresAt" in decision ? decision.expiresAt : null,
      actorUserId: "system",
      caseId: caze.id,
      metadata: { automated: true, reportId: report.id, strikeId: strike.id }
    });
    await notifyUserEmailLike(report.reportedUserId, "moderation.action_applied", {
      action: moderationAction.action,
      reason: moderationAction.reason,
      expiresAt: sanction.expiresAt
    });
  }

  res.json({ report, case: caze, strike, allowedReasons: REPORT_REASONS });
});

app.post("/reports/evidence", authMiddleware(env), upload.single("evidence"), async (req, res) => {
  const schema = z.object({
    reportId: z.string().uuid(),
    kind: z.enum(["screenshot", "recording", "image", "video", "other"]).optional(),
    sha256: z.string().min(16).max(128).optional(),
    metadata: z.any().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!req.file) return res.status(400).json({ error: "evidence_file_required" });

  const userId = (req as any).userId as string | undefined;
  const report = await prisma.report.findUnique({ where: { id: parsed.data.reportId } });
  if (!report) return res.status(404).json({ error: "report_not_found" });
  if (report.reporterId !== userId) return res.status(403).json({ error: "not_report_owner" });

  const evidence = await prisma.reportEvidence.create({
    data: {
      reportId: report.id,
      kind: (parsed.data.kind ?? "other") as any,
      mimeType: req.file.mimetype,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSha256: parsed.data.sha256,
      metadata: parsed.data.metadata ?? null
    }
  });

  res.json({ evidence });
});

// Back-compat: list of report reasons for the client UI
app.get("/reports/reasons", (_req, res) => {
  res.json({ reasons: REPORT_REASONS });
});

// -------- Blocks --------
app.post("/blocks/add", async (req, res) => {
  const schema = z.object({
    userId: z.string().uuid(),
    blockedUserId: z.string().uuid(),
    reason: z.string().max(200).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.userId === parsed.data.blockedUserId) return res.status(400).json({ error: "cannot block self" });

  const block = await prisma.userBlock.upsert({
    where: { userId_blockedUserId: { userId: parsed.data.userId, blockedUserId: parsed.data.blockedUserId } },
    create: parsed.data,
    update: { reason: parsed.data.reason }
  });
  res.json({ block });
});

app.post("/blocks/add/authed", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const schema = z.object({
    blockedUserId: z.string().uuid(),
    reason: z.string().max(200).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (userId === parsed.data.blockedUserId) return res.status(400).json({ error: "cannot block self" });

  const block = await prisma.userBlock.upsert({
    where: { userId_blockedUserId: { userId, blockedUserId: parsed.data.blockedUserId } },
    create: { userId, blockedUserId: parsed.data.blockedUserId, reason: parsed.data.reason },
    update: { reason: parsed.data.reason }
  });
  res.json({ block });
});

app.post("/blocks/remove", async (req, res) => {
  const schema = z.object({ userId: z.string().uuid(), blockedUserId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await prisma.userBlock.delete({
    where: { userId_blockedUserId: { userId: parsed.data.userId, blockedUserId: parsed.data.blockedUserId } }
  }).catch(() => {});
  res.json({ ok: true });
});

app.get("/blocks/list", async (req, res) => {
  const schema = z.object({ userId: z.string().uuid() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const blocks = await prisma.userBlock.findMany({
    where: { userId: parsed.data.userId },
    orderBy: { createdAt: "desc" }
  });
  res.json({ blocks });
});

// -------- Friends --------
app.post("/friends/request", async (req, res) => {
  const schema = z.object({ fromUserId: z.string().uuid(), toUserId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.fromUserId === parsed.data.toUserId) return res.status(400).json({ error: "cannot friend self" });

  const request = await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId: parsed.data.fromUserId, toUserId: parsed.data.toUserId } },
    create: { fromUserId: parsed.data.fromUserId, toUserId: parsed.data.toUserId },
    update: {}
  });
  res.json({ request });
});

// Premium gating: create friend requests should use auth (prevents spoofing in Plus "see who added you")
app.post("/friends/request/authed", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const schema = z.object({ toUserId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (userId === parsed.data.toUserId) return res.status(400).json({ error: "cannot friend self" });

  const request = await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId: userId, toUserId: parsed.data.toUserId } },
    create: { fromUserId: userId, toUserId: parsed.data.toUserId },
    update: {}
  });
  res.json({ request });
});

app.post("/friends/respond", async (req, res) => {
  const schema = z.object({ requestId: z.string().uuid(), accepted: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const request = await prisma.friendRequest.update({
    where: { id: parsed.data.requestId },
    data: { respondedAt: new Date(), accepted: parsed.data.accepted }
  });

  if (parsed.data.accepted) {
    const a = request.fromUserId;
    const b = request.toUserId;
    const userIdLow = a < b ? a : b;
    const userIdHigh = a < b ? b : a;
    await prisma.friend.upsert({
      where: { userIdLow_userIdHigh: { userIdLow, userIdHigh } },
      create: { userIdLow, userIdHigh },
      update: {}
    });
  }

  res.json({ request });
});

app.get("/friends/list", async (req, res) => {
  const schema = z.object({ userId: z.string().uuid() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = parsed.data.userId;
  const lows = await prisma.friend.findMany({ where: { userIdLow: id }, orderBy: { createdAt: "desc" } });
  const highs = await prisma.friend.findMany({ where: { userIdHigh: id }, orderBy: { createdAt: "desc" } });
  const friends = [
    ...lows.map((f) => ({ friendUserId: f.userIdHigh, createdAt: f.createdAt })),
    ...highs.map((f) => ({ friendUserId: f.userIdLow, createdAt: f.createdAt }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ friends });
});

// Plus: see who added you as friend (pending requests)
app.get("/friends/requests/received", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const ent = await getUserEntitlements(userId);
  if (!ent.seeWhoAddedYou) return res.status(402).json({ error: "plus_required" });

  const rows = await prisma.friendRequest.findMany({
    where: { toUserId: userId, respondedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json({ requests: rows });
});

// -------- Subscriptions (dev-mode) --------
app.get("/plans", async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  res.json({ plans });
});

app.post("/plans/upsert", async (req, res) => {
  const schema = z.object({
    id: z.string().min(3).max(40),
    priceCents: z.number().int().min(0),
    currency: z.string().min(3).max(5).default("USD"),
    interval: z.string().min(3).max(10).default("month"),
    tier: z.enum(["free", "plus"]).default("free"),
    providerPriceId: z.string().max(120).optional(),
    entitlements: z.any().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: parsed.data.id },
    create: {
      id: parsed.data.id,
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      interval: parsed.data.interval,
      tier: parsed.data.tier as any,
      providerPriceId: parsed.data.providerPriceId,
      entitlements: parsed.data.entitlements ?? {}
    },
    update: {
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      interval: parsed.data.interval,
      tier: parsed.data.tier as any,
      providerPriceId: parsed.data.providerPriceId,
      entitlements: parsed.data.entitlements ?? {}
    }
  });
  res.json({ plan });
});

app.post("/subscriptions/dev/activate", async (req, res) => {
  const schema = z.object({ userId: z.string().uuid(), planId: z.string().min(3).max(40) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const sub = await prisma.subscription.create({
    data: {
      userId: parsed.data.userId,
      planId: parsed.data.planId,
      provider: "stripe",
      providerSubId: `dev_${Date.now()}`,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });
  res.json({ subscription: sub });
});

// -------- Billing (Stripe + generic subscription status) --------
app.get("/billing/status", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }]
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true }
  });
  const tier = sub?.plan?.tier ?? "free";
  res.json({
    tier,
    subscription: sub
      ? {
          id: sub.id,
          provider: sub.provider,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialEndsAt: sub.trialEndsAt,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          plan: {
            id: sub.plan.id,
            tier: sub.plan.tier,
            interval: sub.plan.interval,
            currency: sub.plan.currency,
            priceCents: sub.plan.priceCents,
            entitlements: sub.plan.entitlements
          }
        }
      : null
  });
});

app.get("/entitlements", authMiddleware(env), async (req, res) => {
  const userId = (req as any).userId as string;
  const entitlements = await getUserEntitlements(userId);
  res.json({ entitlements });
});

app.get("/billing/plans", async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({ where: { active: true }, orderBy: [{ tier: "desc" }, { priceCents: "asc" }] });
  res.json({ plans });
});

app.post("/billing/stripe/checkout", authMiddleware(env), async (req, res) => {
  if (!stripe) return res.status(501).json({ error: "stripe_not_configured" });
  const userId = (req as any).userId as string;
  const schema = z.object({
    interval: z.enum(["month", "year"]),
    trialDays: z.coerce.number().int().min(0).max(30).default(7)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const priceId =
    parsed.data.interval === "year" ? env.STRIPE_PLUS_YEARLY_PRICE_ID : env.STRIPE_PLUS_MONTHLY_PRICE_ID;
  if (!priceId) return res.status(400).json({ error: "missing_price_id" });

  // Ensure we have a Plus plan row for gating.
  const planId = parsed.data.interval === "year" ? "plus_yearly" : "plus_monthly";
  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: planId },
    create: {
      id: planId,
      tier: "plus" as any,
      interval: parsed.data.interval,
      currency: "USD",
      priceCents: parsed.data.interval === "year" ? 9999 : 999,
      providerPriceId: priceId,
      entitlements: {
        advancedFilters: true,
        unlimitedRewinds: true,
        adFree: true,
        priorityMatching: true,
        exclusiveFilters: true,
        seeWhoAddedYou: true
      }
    },
    update: { tier: "plus" as any, providerPriceId: priceId }
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: stripeSuccessUrl(env),
    cancel_url: stripeCancelUrl(env),
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: parsed.data.trialDays,
      metadata: { userId, planId: plan.id }
    },
    metadata: { userId, planId: plan.id }
  });

  res.json({ url: session.url });
});

app.post("/billing/stripe/portal", authMiddleware(env), async (req, res) => {
  if (!stripe) return res.status(501).json({ error: "stripe_not_configured" });
  const userId = (req as any).userId as string;
  const sub = await prisma.subscription.findFirst({
    where: { userId, provider: "stripe", providerCustomerId: { not: null } },
    orderBy: { createdAt: "desc" }
  });
  if (!sub?.providerCustomerId) return res.status(404).json({ error: "no_stripe_customer" });

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.providerCustomerId,
    return_url: "http://localhost:3000/plus"
  });
  res.json({ url: session.url });
});

app.get("/subscriptions/status", async (req, res) => {
  const schema = z.object({ userId: z.string().uuid() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const active = await prisma.subscription.findFirst({
    where: {
      userId: parsed.data.userId,
      status: { in: ["active", "trialing"] }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json({ active });
});

// -------- Moderation dashboard APIs (dev) --------
app.get("/moderation/queue", requireModerator, async (req, res) => {
  const schema = z.object({
    status: z.enum(["open", "triaged", "in_review", "closed"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50)
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const reports = await prisma.report.findMany({
    where: parsed.data.status ? { status: parsed.data.status } : { status: { in: ["open", "triaged", "in_review"] } },
    orderBy: [{ triageScore: "desc" }, { createdAt: "desc" }],
    take: parsed.data.limit,
    include: {
      evidence: { take: 3, orderBy: { createdAt: "desc" } }
    }
  });
  res.json({ reports });
});

app.get("/moderation/reports/detail", requireModerator, async (req, res) => {
  const schema = z.object({ reportId: z.string().uuid() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const report = await prisma.report.findUnique({
    where: { id: parsed.data.reportId },
    include: {
      evidence: { orderBy: { createdAt: "desc" } },
      moderationCase: { include: { actions: { orderBy: { createdAt: "desc" } }, strikes: { orderBy: { createdAt: "desc" } } } }
    }
  });
  if (!report) return res.status(404).json({ error: "not_found" });

  const userHistory = await prisma.report.findMany({
    where: { reportedUserId: report.reportedUserId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  const sanctions = await prisma.userSanction.findMany({
    where: { userId: report.reportedUserId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  const mlFlags = await prisma.mLFlag.findMany({
    where: { userId: report.reportedUserId, createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  res.json({ report, userHistory, sanctions, mlFlags });
});

app.post("/moderation/decide", requireModerator, async (req, res) => {
  const schema = z.object({
    reportId: z.string().uuid(),
    decision: z.enum(["clear", "warn", "timeout", "suspend", "ban"]),
    reason: z.string().min(3).max(300),
    expiresAt: z.string().datetime().optional(),
    note: z.string().max(500).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const report = await prisma.report.findUnique({ where: { id: parsed.data.reportId } });
  if (!report) return res.status(404).json({ error: "report_not_found" });

  const caze =
    (await prisma.moderationCase.findFirst({ where: { reportId: report.id } })) ??
    (await prisma.moderationCase.create({
      data: { reportId: report.id, reportedUserId: report.reportedUserId, matchId: report.matchId, momentId: report.momentId }
    }));

  if (parsed.data.decision === "clear") {
    await prisma.report.update({
      where: { id: report.id },
      data: { status: "closed", metadata: { ...(report.metadata as any), resolvedBy: "moderator", note: parsed.data.note ?? null } }
    });
    await prisma.moderationCase.update({ where: { id: caze.id }, data: { status: "closed", resolvedAt: new Date(), resolutionNote: parsed.data.note ?? null } });
    return res.json({ ok: true });
  }

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  const { moderationAction, sanction } = await applySanction({
    targetUserId: report.reportedUserId,
    action: parsed.data.decision,
    reason: parsed.data.reason,
    expiresAt,
    actorUserId: "moderator",
    caseId: caze.id,
    metadata: { manual: true, reportId: report.id }
  });

  await prisma.report.update({ where: { id: report.id }, data: { status: "closed" } });
  await prisma.moderationCase.update({ where: { id: caze.id }, data: { status: "closed", resolvedAt: new Date(), resolutionNote: parsed.data.note ?? null } });

  await notifyUserEmailLike(report.reportedUserId, "moderation.action_applied", {
    action: moderationAction.action,
    reason: moderationAction.reason,
    expiresAt: sanction.expiresAt
  });

  res.json({ moderationAction, sanction });
});

// Appeals
app.post("/appeals/create", authMiddleware(env), async (req, res) => {
  const schema = z.object({
    moderationActionId: z.string().uuid().optional(),
    userSanctionId: z.string().uuid().optional(),
    summary: z.string().min(10).max(200),
    details: z.string().max(2000).optional(),
    evidenceUrls: z.any().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;

  if (!parsed.data.moderationActionId && !parsed.data.userSanctionId) {
    return res.status(400).json({ error: "missing_action_or_sanction" });
  }

  if (parsed.data.moderationActionId) {
    const act = await prisma.moderationAction.findUnique({ where: { id: parsed.data.moderationActionId } });
    if (!act || act.targetUserId !== userId) return res.status(403).json({ error: "not_allowed" });
  }

  if (parsed.data.userSanctionId) {
    const s = await prisma.userSanction.findUnique({ where: { id: parsed.data.userSanctionId } });
    if (!s || s.userId !== userId) return res.status(403).json({ error: "not_allowed" });
  }

  const appeal = await prisma.appeal.create({
    data: {
      appellantUserId: userId,
      moderationActionId: parsed.data.moderationActionId ?? null,
      userSanctionId: parsed.data.userSanctionId ?? null,
      summary: parsed.data.summary,
      details: parsed.data.details ?? null,
      evidenceUrls: parsed.data.evidenceUrls ?? null
    }
  });
  res.json({ appeal });
});

app.get("/moderation/appeals", requireModerator, async (req, res) => {
  const schema = z.object({
    status: z.enum(["open", "in_review", "accepted", "rejected", "closed"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50)
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const appeals = await prisma.appeal.findMany({
    where: parsed.data.status ? { status: parsed.data.status } : { status: { in: ["open", "in_review"] } },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit
  });
  res.json({ appeals });
});

app.post("/moderation/appeals/resolve", requireModerator, async (req, res) => {
  const schema = z.object({
    appealId: z.string().uuid(),
    status: z.enum(["accepted", "rejected", "closed"]),
    resolutionNote: z.string().min(3).max(500)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const appeal = await prisma.appeal.update({
    where: { id: parsed.data.appealId },
    data: { status: parsed.data.status as any, resolvedAt: new Date(), resolutionNote: parsed.data.resolutionNote }
  });

  // If accepted and tied to a moderation action, unban/unrestrict via unban sanction.
  if (parsed.data.status === "accepted" && appeal.moderationActionId) {
    const act = await prisma.moderationAction.findUnique({ where: { id: appeal.moderationActionId } });
    if (act?.targetUserId) {
      await applySanction({
        targetUserId: act.targetUserId,
        action: "unban",
        reason: "Appeal accepted",
        expiresAt: null,
        actorUserId: "moderator",
        caseId: act.caseId ?? null,
        metadata: { appealId: appeal.id }
      });
      await notifyUserEmailLike(act.targetUserId, "moderation.appeal_accepted", { appealId: appeal.id });
    }
  }

  res.json({ appeal });
});

app.get("/moderation/reports", requireModerator, async (req, res) => {
  const schema = z.object({
    status: z.enum(["open", "triaged", "in_review", "closed"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50)
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const reports = await prisma.report.findMany({
    where: parsed.data.status ? { status: parsed.data.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit
  });
  res.json({ reports });
});

app.post("/moderation/reports/status", requireModerator, async (req, res) => {
  const schema = z.object({
    reportId: z.string().uuid(),
    status: z.enum(["open", "triaged", "in_review", "closed"])
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const report = await prisma.report.update({ where: { id: parsed.data.reportId }, data: { status: parsed.data.status } });
  res.json({ report });
});

app.get("/moderation/moments", requireModerator, async (req, res) => {
  const schema = z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50)
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const moments = await prisma.moment.findMany({
    where: parsed.data.status ? { status: parsed.data.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit
  });
  res.json({ moments });
});

app.post("/moderation/moments/status", requireModerator, async (req, res) => {
  const schema = z.object({
    momentId: z.string().uuid(),
    status: z.enum(["pending", "approved", "rejected"])
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const moment = await prisma.moment.update({ where: { id: parsed.data.momentId }, data: { status: parsed.data.status } });
  res.json({ moment });
});

app.post("/moderation/actions", requireModerator, async (req, res) => {
  const schema = z.object({
    targetUserId: z.string().uuid(),
    action: z.enum(["warn", "timeout", "suspend", "ban", "unban", "content_remove", "content_restore"]),
    reason: z.string().min(3).max(300),
    expiresAt: z.string().datetime().optional(),
    caseId: z.string().uuid().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const action = await prisma.moderationAction.create({
    data: {
      targetUserId: parsed.data.targetUserId,
      action: parsed.data.action as any,
      reason: parsed.data.reason,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      caseId: parsed.data.caseId
    }
  });

  // also record as sanction for enforcement
  const sanction = await prisma.userSanction.create({
    data: {
      userId: parsed.data.targetUserId,
      action: parsed.data.action as any,
      reason: parsed.data.reason,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined
    }
  });

  res.json({ action, sanction });
});

// -------- ML moderation ingestion (frame analysis results) --------
app.post("/ml/flag", authMiddleware(env), async (req, res) => {
  const schema = z.object({
    matchId: z.string().uuid().optional(),
    momentId: z.string().uuid().optional(),
    label: z.string().min(2).max(80),
    score: z.number().min(0).max(1),
    modelName: z.string().min(2).max(80).default("client"),
    modelVersion: z.string().max(40).optional(),
    metadata: z.any().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;

  const flag = await prisma.mLFlag.create({
    data: {
      userId,
      matchId: parsed.data.matchId,
      momentId: parsed.data.momentId,
      label: parsed.data.label,
      score: parsed.data.score,
      modelName: parsed.data.modelName,
      modelVersion: parsed.data.modelVersion,
      metadata: parsed.data.metadata ?? null
    }
  });

  res.json({ flag });
});

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: env.CORS_ORIGIN, credentials: true }
});

const redis = env.REDIS_URL ? new Redis(env.REDIS_URL) : null;
const matchmaker = new Matchmaker(io, redis);

const HelloSchema = z.object({
  userId: z.string().uuid()
});

io.on("connection", (socket) => {
  let userId: string | null = null;
  let queuedRegion: string | null = null;

  socket.on("hello", async (data) => {
    const parsed = HelloSchema.safeParse(data);
    if (!parsed.success) {
      socket.emit("error:bad_hello", { error: parsed.error.flatten() });
      return;
    }
    userId = parsed.data.userId;
    await matchmaker.registerSocket(userId, socket.id);
    socket.emit("hello:ok", { userId });
  });

  socket.on("queue:join", async (data?: { region?: string; connScore?: number }) => {
    if (!userId) return socket.emit("error:not_authed", { message: "Send hello first" });
    try {
      queuedRegion = (data?.region ?? "global").slice(0, 32);
      await matchmaker.enqueue(userId, { region: queuedRegion, connScore: data?.connScore });
      matchmaker.startQueuePositionUpdates(userId, queuedRegion);
      socket.emit("queue:joined");
    } catch (e) {
      socket.emit("queue:error", { message: e instanceof Error ? e.message : "Queue error" });
    }
  });

  socket.on("queue:leave", async () => {
    if (!userId) return;
    await matchmaker.dequeue(userId);
    socket.emit("queue:left");
  });

  // WebRTC signaling relays
  socket.on("webrtc:offer", async (data) => {
    if (!userId) return;
    const schema = z.object({ matchId: z.string().uuid(), sdp: z.any() });
    const parsed = schema.safeParse(data);
    if (!parsed.success) return;
    await matchmaker.relayToPeer(parsed.data.matchId, userId, "webrtc:offer", { matchId: parsed.data.matchId, sdp: parsed.data.sdp });
  });

  socket.on("webrtc:answer", async (data) => {
    if (!userId) return;
    const schema = z.object({ matchId: z.string().uuid(), sdp: z.any() });
    const parsed = schema.safeParse(data);
    if (!parsed.success) return;
    await matchmaker.relayToPeer(parsed.data.matchId, userId, "webrtc:answer", { matchId: parsed.data.matchId, sdp: parsed.data.sdp });
  });

  socket.on("webrtc:ice", async (data) => {
    if (!userId) return;
    const schema = z.object({ matchId: z.string().uuid(), candidate: z.any() });
    const parsed = schema.safeParse(data);
    if (!parsed.success) return;
    await matchmaker.relayToPeer(parsed.data.matchId, userId, "webrtc:ice", { matchId: parsed.data.matchId, candidate: parsed.data.candidate });
  });

  socket.on("extend:decide", async (data) => {
    if (!userId) return;
    const schema = z.object({ matchId: z.string().uuid(), decision: z.boolean() });
    const parsed = schema.safeParse(data);
    if (!parsed.success) return;
    const result = await matchmaker.requestExtend(parsed.data.matchId, userId, parsed.data.decision);
    socket.emit("extend:status", { matchId: parsed.data.matchId, ...result });
  });

  socket.on("call:end", async (data) => {
    if (!userId) return;
    const schema = z.object({ matchId: z.string().uuid(), reason: z.string().optional() });
    const parsed = schema.safeParse(data);
    if (!parsed.success) return;
    await matchmaker.endMatch(parsed.data.matchId, parsed.data.reason ?? "user_end");
  });

  // Client-sent ML moderation flags (e.g., from real-time frame analysis)
  socket.on("ml:violation", async (data) => {
    if (!userId) return;
    const schema = z.object({
      matchId: z.string().uuid(),
      suspectUserId: z.string().uuid(),
      label: z.string().min(2).max(80),
      score: z.number().min(0).max(1),
      modelName: z.string().min(2).max(80).default("client"),
      modelVersion: z.string().max(40).optional(),
      reasonCode: z.string().min(2).max(80).optional(),
      evidenceUrl: z.string().max(300).optional(),
      metadata: z.any().optional()
    });
    const parsed = schema.safeParse(data);
    if (!parsed.success) return;

    // Validate that the reporter is actually in this match
    const match = await prisma.match.findUnique({ where: { id: parsed.data.matchId } }).catch(() => null);
    if (!match) return;
    if (userId !== match.userAId && userId !== match.userBId) return;

    const flag = await prisma.mLFlag.create({
      data: {
        userId: parsed.data.suspectUserId,
        matchId: parsed.data.matchId,
        label: parsed.data.label,
        score: parsed.data.score,
        modelName: parsed.data.modelName,
        modelVersion: parsed.data.modelVersion,
        metadata: {
          reporterUserId: userId,
          evidenceUrl: parsed.data.evidenceUrl ?? null,
          ...(parsed.data.metadata ?? {})
        }
      }
    });

    // Normalize reason + severity mapping
    const reason = normalizeReasonCode(parsed.data.reasonCode ?? parsed.data.label);
    const sev = reasonSeverity(reason);

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId: parsed.data.suspectUserId,
        matchId: parsed.data.matchId,
        reasonCode: reason,
        details: `Auto-flag: ${parsed.data.label} (${parsed.data.score.toFixed(2)})`,
        status: "triaged",
        triageScore: Math.max(sev.triageScore, parsed.data.score),
        metadata: {
          createdVia: "ml_flag",
          severity: sev.severity,
          mlFlagId: flag.id
        }
      }
    });

    const caze = await prisma.moderationCase.create({
      data: {
        reportId: report.id,
        reportedUserId: report.reportedUserId,
        matchId: report.matchId,
        status: "open"
      }
    });

    await createStrike({
      userId: report.reportedUserId,
      points: Math.max(1, sev.points),
      reasonCode: reason,
      source: "ml",
      caseId: caze.id,
      reportId: report.id,
      mlFlagId: flag.id,
      metadata: { score: parsed.data.score, label: parsed.data.label }
    });

    // Safety: end session immediately for high confidence ML detections
    const shouldEnd =
      (reason === "underage" && parsed.data.score >= 0.75) ||
      (reason === "nudity_explicit" && parsed.data.score >= 0.85) ||
      (reason === "violence_gore" && parsed.data.score >= 0.85);

    if (shouldEnd) {
      await matchmaker.endMatch(parsed.data.matchId, "moderator_end");
    }

    // Potential auto action (ban/timeout/warn) based on strike history
    const decision = await decideAutomatedAction(report.reportedUserId, reason, sev.severity);
    if (decision.type !== "none") {
      await applySanction({
        targetUserId: report.reportedUserId,
        action: decision.type,
        reason: decision.reason,
        expiresAt: "expiresAt" in decision ? decision.expiresAt : null,
        actorUserId: "system",
        caseId: caze.id,
        metadata: { automated: true, mlFlagId: flag.id, reportId: report.id }
      });
      await notifyUserEmailLike(report.reportedUserId, "moderation.action_applied", {
        action: decision.type,
        reason: decision.reason
      });
    }
  });

  socket.on("disconnect", async () => {
    if (!userId) return;
    await matchmaker.unregisterSocket(userId);
    await matchmaker.onDisconnect(userId);
  });
});

httpServer.listen(env.API_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${env.API_PORT}`);
});

// ---- Cleanup job: delete expired moments every 5 minutes (dev) ----
setInterval(() => {
  void cleanupExpiredMoments(uploadsDir).catch(() => {});
}, 5 * 60 * 1000);

