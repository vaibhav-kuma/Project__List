import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import crypto from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "./prisma.js";
import type { Env } from "./env.js";

const ACCESS_COOKIE = "ninor_access";
const REFRESH_COOKIE = "ninor_refresh";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function calcAge(dobIsoDate: string): number {
  const dob = new Date(dobIsoDate);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

function cookieOptions(req: Request) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: Boolean(isHttps),
    path: "/"
  };
}

export function authMiddleware(env: Env) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) return res.status(401).json({ error: "not_authenticated" });
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
      (req as any).userId = payload.sub;
      next();
    } catch {
      return res.status(401).json({ error: "invalid_token" });
    }
  };
}

export function getAuthedUserId(req: Request): string | null {
  return (req as any).userId ?? null;
}

function signAccess(env: Env, userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS });
}

function signRefresh(env: Env, userId: string, tokenId: string) {
  return jwt.sign({ sub: userId, tid: tokenId }, env.JWT_REFRESH_SECRET, { expiresIn: env.REFRESH_TOKEN_TTL_SECONDS });
}

export async function setAuthCookies(env: Env, req: Request, res: Response, userId: string) {
  const refreshId = crypto.randomUUID();
  const refreshJwt = signRefresh(env, userId, refreshId);
  const refreshHash = sha256(refreshJwt);

  await prisma.refreshToken.create({
    data: {
      id: refreshId,
      userId,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
      userAgent: req.headers["user-agent"] ?? null,
      ip: (req.headers["x-forwarded-for"] as string | undefined) ?? req.socket.remoteAddress ?? null
    }
  });

  const accessJwt = signAccess(env, userId);
  res.cookie(ACCESS_COOKIE, accessJwt, { ...cookieOptions(req), maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000 });
  res.cookie(REFRESH_COOKIE, refreshJwt, { ...cookieOptions(req), maxAge: env.REFRESH_TOKEN_TTL_SECONDS * 1000 });
}

export async function clearAuthCookies(req: Request, res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...cookieOptions(req), maxAge: 0 });
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(req), maxAge: 0 });
}

export const RegisterStartSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(72),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  gender: z.enum(["male", "female", "other", "undisclosed"]).default("undisclosed"),
  bio: z.string().max(200).optional(),
  termsVersion: z.string().min(1).default("v1"),
  privacyVersion: z.string().min(1).default("v1"),
  parentEmail: z.string().email().optional()
});

export async function registerStart(env: Env, req: Request, res: Response) {
  const parsed = RegisterStartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const age = calcAge(parsed.data.dob);
  if (age < 13 && !env.ALLOW_UNDER13_WITH_PARENTAL_CONSENT) return res.status(400).json({ error: "under_13_not_allowed" });
  if (age < 18 && !parsed.data.parentEmail) return res.status(400).json({ error: "parent_email_required_for_minors" });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing?.emailVerifiedAt) return res.status(409).json({ error: "email_already_registered" });

  const user =
    existing ??
    (await prisma.user.create({
      data: { email: parsed.data.email }
    }));

  const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
  await prisma.passwordCredential.upsert({
    where: { userId: user.id },
    create: { userId: user.id, passwordHash },
    update: { passwordHash }
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      dob: new Date(parsed.data.dob + "T00:00:00.000Z"),
      ageBucket: age,
      gender: parsed.data.gender,
      bio: parsed.data.bio ?? null,
      preferences: {}
    },
    update: {
      dob: new Date(parsed.data.dob + "T00:00:00.000Z"),
      ageBucket: age,
      gender: parsed.data.gender,
      bio: parsed.data.bio ?? null
    }
  });

  await prisma.privacySettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {}
  });

  if (age < 18 && parsed.data.parentEmail) {
    await prisma.parentalConsent.upsert({
      where: { userId: user.id },
      create: { userId: user.id, parentEmail: parsed.data.parentEmail, consentStatus: "pending" },
      update: { parentEmail: parsed.data.parentEmail }
    });
  }

  await prisma.termsAcceptance.create({
    data: {
      userId: user.id,
      termsVersion: parsed.data.termsVersion,
      privacyVersion: parsed.data.privacyVersion,
      ip: (req.headers["x-forwarded-for"] as string | undefined) ?? req.socket.remoteAddress ?? null,
      userAgent: req.headers["user-agent"] ?? null
    }
  });

  const code = randomCode6();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verificationCode.create({
    data: {
      userId: user.id,
      channel: "email",
      purpose: "register",
      target: parsed.data.email,
      codeHash,
      expiresAt
    }
  });

  // Dev-mode: return code. In production, send via email provider.
  res.json({ ok: true, userId: user.id, devCode: code, expiresAt });
}

export const RegisterVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/)
});

export async function registerVerify(env: Env, req: Request, res: Response) {
  const parsed = RegisterVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const codeHash = sha256(parsed.data.code);
  const vc = await prisma.verificationCode.findFirst({
    where: {
      channel: "email",
      purpose: "register",
      target: parsed.data.email,
      codeHash,
      expiresAt: { gt: new Date() },
      consumedAt: null
    },
    orderBy: { createdAt: "desc" }
  });
  if (!vc) return res.status(400).json({ error: "invalid_or_expired_code" });

  await prisma.verificationCode.update({ where: { id: vc.id }, data: { consumedAt: new Date() } });
  const user = await prisma.user.findFirst({ where: { id: vc.userId ?? undefined, email: parsed.data.email } });
  if (!user) return res.status(404).json({ error: "user_not_found" });

  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  await setAuthCookies(env, req, res, user.id);
  res.json({ ok: true, userId: user.id });
}

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().regex(/^\d{6}$/).optional()
});

export async function login(env: Env, req: Request, res: Response) {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(401).json({ error: "invalid_credentials" });
  if (!user.emailVerifiedAt) return res.status(403).json({ error: "email_not_verified" });
  if (user.status !== "active") return res.status(403).json({ error: "user_not_active" });

  const cred = await prisma.passwordCredential.findUnique({ where: { userId: user.id } });
  if (!cred) return res.status(401).json({ error: "invalid_credentials" });
  const ok = await argon2.verify(cred.passwordHash, parsed.data.password);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const tfa = await prisma.twoFactorSecret.findUnique({ where: { userId: user.id } });
  if (tfa?.enabledAt) {
    if (!parsed.data.totp) return res.status(403).json({ error: "totp_required" });
    const valid = speakeasy.totp.verify({
      secret: tfa.secretBase32,
      encoding: "base32",
      token: parsed.data.totp,
      window: 1
    });
    if (!valid) return res.status(403).json({ error: "invalid_totp" });
  }

  await setAuthCookies(env, req, res, user.id);
  res.json({ ok: true, userId: user.id });
}

export async function refresh(env: Env, req: Request, res: Response) {
  const refreshJwt = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!refreshJwt) return res.status(401).json({ error: "no_refresh" });

  try {
    const payload = jwt.verify(refreshJwt, env.JWT_REFRESH_SECRET) as { sub: string; tid: string };
    const row = await prisma.refreshToken.findUnique({ where: { id: payload.tid } }).catch(() => null);
    if (!row || row.userId !== payload.sub) return res.status(401).json({ error: "invalid_refresh" });
    if (row.revokedAt) return res.status(401).json({ error: "revoked_refresh" });
    if (row.expiresAt <= new Date()) return res.status(401).json({ error: "expired_refresh" });

    if (row.tokenHash !== sha256(refreshJwt)) return res.status(401).json({ error: "invalid_refresh" });

    const accessJwt = signAccess(env, payload.sub);
    res.cookie(ACCESS_COOKIE, accessJwt, { ...cookieOptions(req), maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000 });
    res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: "invalid_refresh" });
  }
}

export async function logout(env: Env, req: Request, res: Response) {
  const refreshJwt = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (refreshJwt) {
    try {
      const payload = jwt.verify(refreshJwt, env.JWT_REFRESH_SECRET) as { tid: string };
      await prisma.refreshToken.update({ where: { id: payload.tid }, data: { revokedAt: new Date() } }).catch(() => {});
    } catch {
      // ignore
    }
  }
  await clearAuthCookies(req, res);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const userId = getAuthedUserId(req);
  if (!userId) return res.status(401).json({ error: "not_authenticated" });

  const cacheKey = `user:me:${userId}`;
  const getMeData = async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, privacySettings: true }
    });
    if (!user) return null;
    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
        status: user.status
      },
      profile: user.profile,
      privacy: user.privacySettings
    };
  };

  // Dynamically import cache to avoid circular loops
  const { getCached } = await import("./redisCache.js");
  const data = await getCached(cacheKey, getMeData, 60); // Cache for 60 seconds

  if (!data) return res.status(404).json({ error: "not_found" });

  res.json(data);
}


export const UpdateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(200).optional(),
  gender: z.enum(["male", "female", "other", "undisclosed"]).optional(),
  preferences: z.any().optional(),
  privacy: z
    .object({
      discoverable: z.boolean().optional(),
      showAge: z.boolean().optional(),
      showGender: z.boolean().optional(),
      allowFriendRequests: z.boolean().optional()
    })
    .optional()
});

export async function updateProfile(req: Request, res: Response) {
  const userId = getAuthedUserId(req);
  if (!userId) return res.status(401).json({ error: "not_authenticated" });
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const profile = await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      gender: parsed.data.gender ?? "undisclosed",
      preferences: parsed.data.preferences ?? {}
    },
    update: {
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      gender: parsed.data.gender,
      preferences: parsed.data.preferences
    }
  });

  if (parsed.data.privacy) {
    await prisma.privacySettings.upsert({
      where: { userId },
      create: { userId, ...parsed.data.privacy },
      update: { ...parsed.data.privacy }
    });
  }

  res.json({ profile });
}

export async function twoFactorSetupStart(req: Request, res: Response) {
  const userId = getAuthedUserId(req);
  if (!userId) return res.status(401).json({ error: "not_authenticated" });

  const secret = speakeasy.generateSecret({ name: "Ninor Video Chat" });
  await prisma.twoFactorSecret.upsert({
    where: { userId },
    create: { userId, secretBase32: secret.base32 },
    update: { secretBase32: secret.base32, enabledAt: null, verifiedAt: null }
  });

  const otpauth = secret.otpauth_url!;
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  res.json({ otpauth, qrDataUrl });
}

export const TwoFactorVerifySchema = z.object({ token: z.string().regex(/^\d{6}$/) });

export async function twoFactorSetupVerify(req: Request, res: Response) {
  const userId = getAuthedUserId(req);
  if (!userId) return res.status(401).json({ error: "not_authenticated" });
  const parsed = TwoFactorVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tfa = await prisma.twoFactorSecret.findUnique({ where: { userId } });
  if (!tfa) return res.status(400).json({ error: "no_secret" });

  const valid = speakeasy.totp.verify({
    secret: tfa.secretBase32,
    encoding: "base32",
    token: parsed.data.token,
    window: 1
  });
  if (!valid) return res.status(400).json({ error: "invalid_totp" });

  await prisma.twoFactorSecret.update({ where: { userId }, data: { verifiedAt: new Date(), enabledAt: new Date() } });
  res.json({ ok: true });
}

// -------- Phone verification (dev-mode) --------
export const PhoneStartSchema = z.object({
  phoneE164: z.string().min(8).max(20),
  purpose: z.enum(["register", "login"]).default("login")
});

export async function phoneStart(_env: Env, req: Request, res: Response) {
  const parsed = PhoneStartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const code = randomCode6();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.verificationCode.create({
    data: {
      channel: "phone",
      purpose: parsed.data.purpose,
      target: parsed.data.phoneE164,
      codeHash,
      expiresAt
    }
  });

  // Dev: return code. Prod: send via SMS provider (Twilio).
  res.json({ ok: true, devCode: code, expiresAt });
}

export const PhoneVerifySchema = z.object({
  phoneE164: z.string().min(8).max(20),
  code: z.string().regex(/^\d{6}$/)
});

export async function phoneVerify(env: Env, req: Request, res: Response) {
  const parsed = PhoneVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const vc = await prisma.verificationCode.findFirst({
    where: {
      channel: "phone",
      target: parsed.data.phoneE164,
      codeHash: sha256(parsed.data.code),
      expiresAt: { gt: new Date() },
      consumedAt: null
    },
    orderBy: { createdAt: "desc" }
  });
  if (!vc) return res.status(400).json({ error: "invalid_or_expired_code" });

  await prisma.verificationCode.update({ where: { id: vc.id }, data: { consumedAt: new Date() } });

  // If user exists with this phone, log them in; otherwise create a skeleton user (profile later).
  const existing = await prisma.user.findUnique({ where: { phoneE164: parsed.data.phoneE164 } });
  const user =
    existing ??
    (await prisma.user.create({
      data: { phoneE164: parsed.data.phoneE164, phoneVerifiedAt: new Date() }
    }));

  if (!existing) {
    await prisma.privacySettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  }

  await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
  await setAuthCookies(env, req, res, user.id);
  res.json({ ok: true, userId: user.id });
}

// -------- Google OAuth (env-driven) --------
function requireGoogle(env: Env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URL) {
    throw new Error("google_oauth_not_configured");
  }
}

export async function googleStart(env: Env, req: Request, res: Response) {
  try {
    requireGoogle(env);
  } catch (e) {
    return res.status(501).json({ error: e instanceof Error ? e.message : "google_oauth_not_configured" });
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URL);
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("ninor_oauth_state", state, { ...cookieOptions(req), maxAge: 10 * 60 * 1000 });

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "consent"
  });
  res.redirect(url);
}

export async function googleCallback(env: Env, req: Request, res: Response) {
  try {
    requireGoogle(env);
  } catch (e) {
    return res.status(501).send("Google OAuth not configured");
  }

  const stateCookie = req.cookies?.["ninor_oauth_state"] as string | undefined;
  const stateQuery = (req.query.state as string | undefined) ?? "";
  if (!stateCookie || stateCookie !== stateQuery) return res.status(400).send("Invalid state");

  const code = (req.query.code as string | undefined) ?? "";
  if (!code) return res.status(400).send("Missing code");

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URL);
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) return res.status(400).send("Missing id_token");

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) return res.status(400).send("Invalid Google profile");

  // Link or create user
  const provider = "google";
  const providerUserId = payload.sub;

  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: { provider, providerUserId } },
    include: { user: true }
  }).catch(() => null);

  let userId: string;
  if (existingOAuth) {
    userId = existingOAuth.userId;
  } else {
    const existingUser = await prisma.user.findUnique({ where: { email: payload.email } });
    const user =
      existingUser ??
      (await prisma.user.create({
        data: { email: payload.email, emailVerifiedAt: new Date() }
      }));

    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerUserId
      }
    });

    if (!user.emailVerifiedAt) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    await prisma.privacySettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });

    userId = user.id;
  }

  await setAuthCookies(env, req, res, userId);
  res.redirect("http://localhost:3000/profile");
}

