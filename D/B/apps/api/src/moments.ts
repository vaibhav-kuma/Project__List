import type { Request, Response } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { prisma } from "./prisma.js";

function isUploadPath(p: string) {
  return typeof p === "string" && p.startsWith("/uploads/");
}

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

async function tryCreateImageThumbnail(uploadsDirAbs: string, mediaUrl: string): Promise<string | null> {
  if (!isUploadPath(mediaUrl)) return null;
  const filename = mediaUrl.replace("/uploads/", "");
  const inPath = path.join(uploadsDirAbs, filename);
  const outName = filename.replace(/\.(\w+)$/, "_thumb.jpg");
  const outPath = path.join(uploadsDirAbs, outName);
  try {
    await sharp(inPath).resize(480, 480, { fit: "cover" }).jpeg({ quality: 80 }).toFile(outPath);
    return `/uploads/${outName}`;
  } catch {
    return null;
  }
}

async function ffprobeDurationSeconds(filePath: string): Promise<number | null> {
  return await new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err: unknown, data: any) => {
      if (err) return resolve(null);
      const dur = typeof data?.format?.duration === "number" ? data.format.duration : null;
      resolve(dur ? Number(dur) : null);
    });
  });
}

async function tryCreateVideoThumbnail(uploadsDirAbs: string, mediaUrl: string): Promise<string | null> {
  if (!isUploadPath(mediaUrl)) return null;
  const filename = mediaUrl.replace("/uploads/", "");
  const inPath = path.join(uploadsDirAbs, filename);
  const outName = filename.replace(/\.(\w+)$/, "_thumb.jpg");
  const outPath = path.join(uploadsDirAbs, outName);
  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inPath)
        .on("end", () => resolve())
        .on("error", (e: unknown) => reject(e))
        .screenshots({
          count: 1,
          timemarks: ["1.0"],
          filename: outName,
          folder: uploadsDirAbs,
          size: "480x?"
        });
    });
    return `/uploads/${outName}`;
  } catch {
    return null;
  }
}

export const MomentCreateSchema = z.object({
  userId: z.string().uuid(),
  caption: z.string().max(140).optional(),
  visibility: z.enum(["public", "friends"]).default("public"),
  durationSeconds: z.coerce.number().int().min(1).max(30).optional(),
  // Client-side overlays configuration (text/stickers/filters) stored as JSON
  metadata: z.any().optional()
});

export async function momentsCreate(uploadsDirAbs: string, req: Request, res: Response) {
  const parsed = MomentCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!req.file) return res.status(400).json({ error: "media file is required" });

  const mime = req.file.mimetype;
  const isVideo = mime.startsWith("video/");
  const isImage = mime.startsWith("image/");
  if (!isVideo && !isImage) return res.status(400).json({ error: "unsupported_mime" });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const mediaUrl = `/uploads/${req.file.filename}`;
  const absPath = path.join(uploadsDirAbs, req.file.filename);

  if (isVideo) {
    const dur = await ffprobeDurationSeconds(absPath);
    // enforce: must be 15-30s (configurable later)
    if (dur !== null && (dur < 15 || dur > 30)) {
      // delete uploaded file
      await fs.unlink(absPath).catch(() => {});
      return res.status(400).json({ error: "video_duration_must_be_15_to_30_seconds", durationSeconds: dur });
    }
  }

  const thumbnailUrl = isImage
    ? await tryCreateImageThumbnail(uploadsDirAbs, mediaUrl)
    : await tryCreateVideoThumbnail(uploadsDirAbs, mediaUrl);

  const moment = await prisma.moment.create({
    data: {
      userId: parsed.data.userId,
      caption: parsed.data.caption,
      visibility: parsed.data.visibility as any,
      mediaKind: isVideo ? "video" : "image",
      mimeType: mime,
      mediaUrl,
      thumbnailUrl,
      metadata: parsed.data.metadata ?? null,
      expiresAt,
      // dev: auto-approve; production would be pending until moderation
      status: "approved"
    }
  });

  res.json({ moment });
}

export async function momentsFeedDiscover(req: Request, res: Response) {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20)
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const moments = await prisma.moment.findMany({
    where: { status: "approved", expiresAt: { gt: new Date() }, visibility: "public" },
    orderBy: [{ reactionCount: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }],
    take: parsed.data.limit,
    include: { user: { include: { profile: true } } }
  });

  res.json({ moments });
}

export async function momentsFeedFriends(req: Request, res: Response) {
  const schema = z.object({
    userId: z.string().uuid(),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = parsed.data.userId;
  const lows = await prisma.friend.findMany({ where: { userIdLow: id }, select: { userIdHigh: true } });
  const highs = await prisma.friend.findMany({ where: { userIdHigh: id }, select: { userIdLow: true } });
  const friendIds = Array.from(new Set([...lows.map((f) => f.userIdHigh), ...highs.map((f) => f.userIdLow)]));

  const moments = await prisma.moment.findMany({
    where: {
      status: "approved",
      expiresAt: { gt: new Date() },
      OR: [
        { userId: { in: friendIds }, visibility: { in: ["friends", "public"] } as any },
        { userId: id } // include own
      ]
    },
    orderBy: [{ createdAt: "desc" }],
    take: parsed.data.limit,
    include: { user: { include: { profile: true } } }
  });

  res.json({ moments });
}

export const MomentViewSchema = z.object({
  momentId: z.string().uuid(),
  viewerUserId: z.string().uuid()
});

export async function momentsView(req: Request, res: Response) {
  const parsed = MomentViewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // idempotent view (per moment per viewer)
  await prisma.momentView
    .create({
      data: { momentId: parsed.data.momentId, viewerUserId: parsed.data.viewerUserId }
    })
    .then(async () => {
      await prisma.moment.update({ where: { id: parsed.data.momentId }, data: { viewCount: { increment: 1 } } });
    })
    .catch(() => {});

  res.json({ ok: true });
}

export const MomentReactSchema = z.object({
  momentId: z.string().uuid(),
  userId: z.string().uuid(),
  reaction: z.string().min(1).max(20) // like, fire, etc
});

export async function momentsReact(req: Request, res: Response) {
  const parsed = MomentReactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const exists = await prisma.momentReaction.findUnique({
    where: { momentId_userId: { momentId: parsed.data.momentId, userId: parsed.data.userId } }
  });

  if (!exists) {
    await prisma.momentReaction.create({
      data: {
        momentId: parsed.data.momentId,
        userId: parsed.data.userId,
        reaction: parsed.data.reaction
      }
    });
    await prisma.moment.update({ where: { id: parsed.data.momentId }, data: { reactionCount: { increment: 1 } } });
  } else {
    await prisma.momentReaction.update({
      where: { momentId_userId: { momentId: parsed.data.momentId, userId: parsed.data.userId } },
      data: { reaction: parsed.data.reaction }
    });
  }

  res.json({ ok: true });
}

export async function cleanupExpiredMoments(uploadsDirAbs: string) {
  const expired = await prisma.moment.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true, mediaUrl: true, thumbnailUrl: true }
  });

  for (const m of expired) {
    const files: string[] = [];
    if (isUploadPath(m.mediaUrl)) files.push(path.join(uploadsDirAbs, m.mediaUrl.replace("/uploads/", "")));
    if (m.thumbnailUrl && isUploadPath(m.thumbnailUrl)) files.push(path.join(uploadsDirAbs, m.thumbnailUrl.replace("/uploads/", "")));

    await prisma.moment.delete({ where: { id: m.id } }).catch(() => {});
    for (const f of files) {
      await fs.unlink(f).catch(() => {});
    }
  }

  return { deleted: expired.length };
}

