import type { Server as SocketIOServer } from "socket.io";
import { nanoid } from "nanoid";
import type Redis from "ioredis";
import { prisma } from "./prisma.js";
import { getUserEntitlements } from "./entitlements.js";

const QUEUE_ZSET_ALL_PREFIX = "queue:v4:all:"; // region -> zset(userId) score=enqueuedAt
const QUEUE_ZSET_GENDER_PREFIX = "queue:v4:gender:"; // region:gender -> zset(userId) score=enqueuedAt
const QUEUE_ITEM_PREFIX = "queue:v4:item:"; // userId -> json
const ACTIVE_REGIONS_KEY = "queue:v4:regions"; // set
const USER_SOCKET_KEY_PREFIX = "user_socket:v1:"; // userId -> socketId
const COOLDOWN_PREFIX = "cooldown:v1:"; // cooldown key prefix

const GENDERS: QueueItem["gender"][] = ["male", "female", "other", "undisclosed"];

type UserPrefs = {
  genderPreference?: "male" | "female" | "other" | "undisclosed" | "any";
  ageMin?: number;
  ageMax?: number;
};

type QueueItem = {
  userId: string;
  age: number | null;
  gender: "male" | "female" | "other" | "undisclosed";
  prefs: UserPrefs;
  region: string;
  // simple signal from client (optional); used only as tie-breaker
  connScore?: number; // 0..100, higher is better
  enqueuedAt: number;
};

type ActiveMatch = {
  matchId: string;
  roomId: string;
  userAId: string;
  userBId: string;
  startedAtMs: number;
  durationMs: number;
  segmentId: string;
  segmentIndex: number;
  extend: {
    [userId: string]: boolean | undefined;
  };
  timer?: NodeJS.Timeout;
};

export class Matchmaker {
  private redis: Redis | null;
  private io: SocketIOServer;
  private activeMatches = new Map<string, ActiveMatch>(); // matchId -> match
  private activeMatchByUserId = new Map<string, string>(); // userId -> matchId
  private memoryQueue: QueueItem[] = [];
  private memoryUserSocket = new Map<string, string>(); // userId -> socketId
  private memoryCooldown = new Map<string, number>(); // key -> expiresAtMs
  private memoryQueueByRegion = new Map<string, QueueItem[]>(); // region -> queue
  private queueUpdateTimers = new Map<string, NodeJS.Timeout>(); // userId -> interval
  private regionRoundRobin: string[] = [];
  private regionIdx = 0;

  constructor(io: SocketIOServer, redis: Redis | null) {
    this.io = io;
    this.redis = redis;
  }

  async registerSocket(userId: string, socketId: string) {
    if (this.redis) {
      await this.redis.set(USER_SOCKET_KEY_PREFIX + userId, socketId, "EX", 60 * 60);
      return;
    }
    this.memoryUserSocket.set(userId, socketId);
  }

  async unregisterSocket(userId: string) {
    if (this.redis) {
      await this.redis.del(USER_SOCKET_KEY_PREFIX + userId);
      return;
    }
    this.memoryUserSocket.delete(userId);
  }

  async enqueue(userId: string, opts?: { region?: string; connScore?: number }) {
    // prevent enqueue if already in match
    if (this.activeMatchByUserId.has(userId)) return;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status !== "active") {
      throw new Error("Account is not active");
    }

    // Optional compliance: require age verification for video chats
    // - Verified age OR approved parental consent for minors
    // - Controlled by env in API (passed via process.env to keep Matchmaker signature stable)
    if (process.env.REQUIRE_AGE_VERIFIED_FOR_VIDEO === "true") {
      const av = await prisma.ageVerification.findUnique({ where: { userId } });
      const pc = await prisma.parentalConsent.findUnique({ where: { userId } });
      const ok =
        av?.status === "verified" ||
        (pc?.consentStatus === "approved");
      if (!ok) {
        throw new Error("Age verification required");
      }
    }

    // enforce sanctions (timeout/suspend/ban)
    const now = new Date();
    const activeSanction = await prisma.userSanction.findFirst({
      where: {
        userId,
        action: { in: ["timeout", "suspend", "ban"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      orderBy: { createdAt: "desc" }
    });
    if (activeSanction) {
      const until = activeSanction.expiresAt ? activeSanction.expiresAt.toISOString() : "permanent";
      throw new Error(`Account restricted (${activeSanction.action}) until ${until}`);
    }

    // basic: ensure profile exists
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new Error("Profile required before matching");
    }

    const item: QueueItem = {
      userId,
      age: profile.ageBucket ?? null,
      gender: (profile.gender as QueueItem["gender"]) ?? "undisclosed",
      prefs: (profile.preferences as any) ?? {},
      region: (opts?.region ?? "global").slice(0, 32),
      connScore: opts?.connScore,
      enqueuedAt: Date.now()
    };

    // Plus: priority matching (simple boost)
    const ent = await getUserEntitlements(userId).catch(() => null);
    if (ent?.priorityMatching) {
      const base = typeof item.connScore === "number" ? item.connScore : 50;
      item.connScore = Math.min(100, base + 25);
    }

    // prevent duplicates in queue
    if (this.redis) {
      const keyAll = this.redisKeyAll(item.region);
      const existingRank = await this.redis.zrank(keyAll, userId);
      if (existingRank !== null) return;

      await this.redis.set(QUEUE_ITEM_PREFIX + userId, JSON.stringify(item), "EX", 60 * 10);
      await this.redis.zadd(keyAll, item.enqueuedAt, userId);
      await this.redis.zadd(this.redisKeyGender(item.region, item.gender), item.enqueuedAt, userId);
      await this.redis.sadd(ACTIVE_REGIONS_KEY, item.region);
    } else {
      if (this.isQueuedMemory(userId)) return;
      const q = this.memoryQueueByRegion.get(item.region) ?? [];
      q.push(item);
      this.memoryQueueByRegion.set(item.region, q);
      this.refreshRegionListMemory();
    }
    await this.tryMatch();
  }

  async dequeue(userId: string) {
    this.stopQueuePositionUpdates(userId);
    if (this.redis) {
      const raw = await this.redis.get(QUEUE_ITEM_PREFIX + userId);
      await this.redis.del(QUEUE_ITEM_PREFIX + userId);
      if (raw) {
        try {
          const it = JSON.parse(raw) as QueueItem;
          await this.redis.zrem(this.redisKeyAll(it.region), userId);
          await this.redis.zrem(this.redisKeyGender(it.region, it.gender), userId);
        } catch {
          // ignore
        }
      } else {
        const regions = await this.redis.smembers(ACTIVE_REGIONS_KEY);
        for (const region of regions) {
          await this.redis.zrem(this.redisKeyAll(region), userId);
          for (const g of GENDERS) await this.redis.zrem(this.redisKeyGender(region, g), userId);
        }
      }
      return;
    }
    for (const [region, q] of this.memoryQueueByRegion.entries()) {
      const next = q.filter((it) => it.userId !== userId);
      this.memoryQueueByRegion.set(region, next);
    }
    this.refreshRegionListMemory();
  }

  async tryMatch() {
    const [a, b] = await this.takeCompatiblePair();
    if (!a || !b) return;

    // If either already matched (race), requeue the other
    if (this.activeMatchByUserId.has(a.userId)) {
      await this.requeueFront(b);
      return;
    }
    if (this.activeMatchByUserId.has(b.userId)) {
      await this.requeueFront(a);
      return;
    }

    const match = await prisma.match.create({
      data: {
        userAId: a.userId,
        userBId: b.userId,
        region: a.region,
        startedAt: new Date()
      }
    });

    const segment = await prisma.matchSegment.create({
      data: {
        matchId: match.id,
        segmentIndex: 0,
        plannedSeconds: 15,
        startedAt: new Date()
      }
    });

    const roomId = "room_" + nanoid(10);
    const startedAtMs = Date.now();
    const durationMs = 15_000;

    const active: ActiveMatch = {
      matchId: match.id,
      roomId,
      userAId: a.userId,
      userBId: b.userId,
      startedAtMs,
      durationMs,
      segmentId: segment.id,
      segmentIndex: segment.segmentIndex,
      extend: {}
    };

    this.activeMatches.set(active.matchId, active);
    this.activeMatchByUserId.set(a.userId, active.matchId);
    this.activeMatchByUserId.set(b.userId, active.matchId);
    this.stopQueuePositionUpdates(a.userId);
    this.stopQueuePositionUpdates(b.userId);

    await this.setCooldown(a.userId, b.userId, 10 * 60);

    // Tell both clients they are matched.
    this.io.to(await this.getSocketId(a.userId)).emit("matched", {
      matchId: active.matchId,
      roomId: active.roomId,
      peerUserId: b.userId,
      durationMs: active.durationMs
    });
    this.io.to(await this.getSocketId(b.userId)).emit("matched", {
      matchId: active.matchId,
      roomId: active.roomId,
      peerUserId: a.userId,
      durationMs: active.durationMs
    });

    // Start authoritative timer
    active.timer = setTimeout(() => {
      void this.endMatch(active.matchId, "timer_elapsed");
    }, durationMs);
  }

  async onDisconnect(userId: string) {
    await this.dequeue(userId);
    const matchId = this.activeMatchByUserId.get(userId);
    if (matchId) {
      await this.endMatch(matchId, "disconnect");
    }
  }

  async requestExtend(matchId: string, userId: string, decision: boolean) {
    const active = this.activeMatches.get(matchId);
    if (!active) return { status: "no_active_match" as const };
    if (userId !== active.userAId && userId !== active.userBId) return { status: "not_in_match" as const };

    active.extend[userId] = decision;
    await prisma.segmentExtensionVote.upsert({
      where: { segmentId_userId: { segmentId: active.segmentId, userId } },
      create: { segmentId: active.segmentId, userId, decision },
      update: { decision }
    });

    const otherUserId = userId === active.userAId ? active.userBId : active.userAId;
    this.io.to(await this.getSocketId(otherUserId)).emit("extend:update", { matchId, peerDecision: decision });

    const a = active.extend[active.userAId];
    const b = active.extend[active.userBId];

    if (a === true && b === true) {
      // Extend by another 15 seconds for MVP
      if (active.timer) clearTimeout(active.timer);
      // Close previous segment
      await prisma.matchSegment.update({
        where: { id: active.segmentId },
        data: { endedAt: new Date() }
      });

      const nextSegment = await prisma.matchSegment.create({
        data: {
          matchId: active.matchId,
          segmentIndex: active.segmentIndex + 1,
          plannedSeconds: 15,
          startedAt: new Date()
        }
      });

      active.segmentId = nextSegment.id;
      active.segmentIndex = nextSegment.segmentIndex;
      active.startedAtMs = Date.now();
      active.durationMs = 15_000;
      active.extend = {};

      this.io.to(await this.getSocketId(active.userAId)).emit("extend:accepted", {
        matchId,
        durationMs: active.durationMs
      });
      this.io.to(await this.getSocketId(active.userBId)).emit("extend:accepted", {
        matchId,
        durationMs: active.durationMs
      });

      active.timer = setTimeout(() => {
        void this.endMatch(active.matchId, "timer_elapsed");
      }, active.durationMs);

      return { status: "extended" as const };
    }

    if (a === false || b === false) {
      await this.endMatch(matchId, "extend_rejected");
      return { status: "ended" as const };
    }

    return { status: "pending" as const };
  }

  async endMatch(matchId: string, reason: string) {
    const active = this.activeMatches.get(matchId);
    if (!active) return;

    if (active.timer) clearTimeout(active.timer);
    this.activeMatches.delete(matchId);
    this.activeMatchByUserId.delete(active.userAId);
    this.activeMatchByUserId.delete(active.userBId);

    const endedAt = new Date();
    await prisma.matchSegment.update({
      where: { id: active.segmentId },
      data: { endedAt }
    }).catch(() => {});

    await prisma.match.update({
      where: { id: matchId },
      data: {
        endedAt,
        endReason: reason as any,
        durationSeconds: Math.max(0, Math.floor((endedAt.getTime() - active.startedAtMs) / 1000))
      }
    });

    const socketA = await this.getSocketId(active.userAId);
    const socketB = await this.getSocketId(active.userBId);
    this.io.to(socketA).emit("call:ended", { matchId, reason });
    this.io.to(socketB).emit("call:ended", { matchId, reason });

    // After ending, try to match again (if queues have users)
    await this.tryMatch();
  }

  async relayToPeer(matchId: string, fromUserId: string, event: string, payload: unknown) {
    const active = this.activeMatches.get(matchId);
    if (!active) return;
    const peerUserId = fromUserId === active.userAId ? active.userBId : active.userAId;
    const peerSocketId = await this.getSocketId(peerUserId);
    this.io.to(peerSocketId).emit(event, payload);
  }

  private async getSocketId(userId: string): Promise<string> {
    if (this.redis) {
      const socketId = await this.redis.get(USER_SOCKET_KEY_PREFIX + userId);
      if (!socketId) throw new Error(`No socket for user ${userId}`);
      return socketId;
    }
    const socketId = this.memoryUserSocket.get(userId);
    if (!socketId) throw new Error(`No socket for user ${userId}`);
    return socketId;
  }

  startQueuePositionUpdates(userId: string, region: string) {
    this.stopQueuePositionUpdates(userId);
    const tick = async () => {
      try {
        const socketId = await this.getSocketId(userId);
        const approx = await this.getApproxQueuePosition(userId, region);
        this.io.to(socketId).emit("queue:position", { approxPosition: approx, region });
      } catch {
        // ignore
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 3000);
    this.queueUpdateTimers.set(userId, t);
  }

  stopQueuePositionUpdates(userId: string) {
    const t = this.queueUpdateTimers.get(userId);
    if (t) clearInterval(t);
    this.queueUpdateTimers.delete(userId);
  }

  private async getApproxQueuePosition(userId: string, region: string): Promise<number | null> {
    if (this.redis) {
      const rank = await this.redis.zrank(this.redisKeyAll(region), userId);
      if (rank === null) {
        const len = await this.redis.zcard(this.redisKeyAll(region));
        return len > 0 ? len : null;
      }
      return rank + 1;
    }
    const q = this.memoryQueueByRegion.get(region) ?? [];
    const idx = q.findIndex((it) => it.userId === userId);
    if (idx >= 0) return idx + 1;
    return q.length > 0 ? q.length : null;
  }

  private isQueuedMemory(userId: string): boolean {
    for (const q of this.memoryQueueByRegion.values()) {
      if (q.some((it) => it.userId === userId)) return true;
    }
    return false;
  }

  private refreshRegionListMemory() {
    this.regionRoundRobin = Array.from(this.memoryQueueByRegion.keys()).filter((r) => (this.memoryQueueByRegion.get(r)?.length ?? 0) > 0);
    if (this.regionIdx >= this.regionRoundRobin.length) this.regionIdx = 0;
  }

  private async setCooldown(a: string, b: string, ttlSeconds: number) {
    const key = this.cooldownKey(a, b);
    if (this.redis) {
      await this.redis.set(key, "1", "EX", ttlSeconds);
      return;
    }
    this.memoryCooldown.set(key, Date.now() + ttlSeconds * 1000);
  }

  private async hasCooldown(a: string, b: string): Promise<boolean> {
    const key = this.cooldownKey(a, b);
    if (this.redis) {
      const v = await this.redis.get(key);
      return Boolean(v);
    }
    const exp = this.memoryCooldown.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.memoryCooldown.delete(key);
      return false;
    }
    return true;
  }

  private cooldownKey(a: string, b: string) {
    return COOLDOWN_PREFIX + (a < b ? `${a}:${b}` : `${b}:${a}`);
  }

  private async requeueFront(item: QueueItem) {
    if (this.redis) {
      await this.redis.set(QUEUE_ITEM_PREFIX + item.userId, JSON.stringify(item), "EX", 60 * 10);
      await this.redis.zadd(this.redisKeyAll(item.region), item.enqueuedAt, item.userId);
      await this.redis.zadd(this.redisKeyGender(item.region, item.gender), item.enqueuedAt, item.userId);
      return;
    }
    const q = this.memoryQueueByRegion.get(item.region) ?? [];
    q.unshift(item);
    this.memoryQueueByRegion.set(item.region, q);
    this.refreshRegionListMemory();
  }

  private async takeCompatiblePair(): Promise<[QueueItem | null, QueueItem | null]> {
    if (!this.redis) {
      const region = this.pickNextRegionMemory();
      if (!region) return [null, null];
      const q = this.memoryQueueByRegion.get(region) ?? [];
      const a = q.shift() ?? null;
      if (!a) return [null, null];
      const idx = await this.findPartnerIndex(a, q);
      if (idx === -1) {
        q.unshift(a);
        this.memoryQueueByRegion.set(region, q);
        this.refreshRegionListMemory();
        return [null, null];
      }
      const [b] = q.splice(idx, 1);
      this.memoryQueueByRegion.set(region, q);
      this.refreshRegionListMemory();
      return [a, b];
    }

    return await this.takeCompatiblePairRedis();
  }

  private async findPartnerIndex(a: QueueItem, candidates: QueueItem[]): Promise<number> {
    for (let i = 0; i < candidates.length; i++) {
      const b = candidates[i]!;
      if (await this.hasCooldown(a.userId, b.userId)) continue;
      if (!this.compatible(a, b)) continue;
      if (!this.compatible(b, a)) continue;
      return i;
    }
    return -1;
  }

  private compatible(viewer: QueueItem, candidate: QueueItem): boolean {
    const gp = viewer.prefs.genderPreference ?? "any";
    if (gp !== "any" && candidate.gender !== gp) return false;
    const ageMin = viewer.prefs.ageMin ?? 18;
    const ageMax = viewer.prefs.ageMax ?? 99;
    if (candidate.age !== null) {
      if (candidate.age < ageMin || candidate.age > ageMax) return false;
    }
    // Age-appropriate baseline: only match 18+ with 18+ in this app’s current policy
    if ((viewer.age ?? 18) < 18) return false;
    if ((candidate.age ?? 18) < 18) return false;
    return true;
  }

  private pickNextRegionMemory(): string | null {
    this.refreshRegionListMemory();
    if (this.regionRoundRobin.length === 0) return null;
    const region = this.regionRoundRobin[this.regionIdx % this.regionRoundRobin.length]!;
    this.regionIdx = (this.regionIdx + 1) % this.regionRoundRobin.length;
    return region;
  }

  private async pickNextRegionRedis(): Promise<string | null> {
    if (!this.redis) return null;
    const regions = await this.redis.smembers(ACTIVE_REGIONS_KEY);
    const nonEmpty: string[] = [];
    for (const r of regions) {
      const len = await this.redis.zcard(this.redisKeyAll(r));
      if (len > 0) nonEmpty.push(r);
    }
    if (nonEmpty.length === 0) return null;
    // fairness: rotate deterministically by time slice
    const idx = Math.floor(Date.now() / 2000) % nonEmpty.length;
    return nonEmpty[idx]!;
  }

  private redisKeyAll(region: string) {
    return QUEUE_ZSET_ALL_PREFIX + region;
  }

  private redisKeyGender(region: string, gender: QueueItem["gender"]) {
    return `${QUEUE_ZSET_GENDER_PREFIX}${region}:${gender}`;
  }

  private acceptableCandidateGenders(a: QueueItem): QueueItem["gender"][] {
    const gp = a.prefs.genderPreference ?? "any";
    if (gp === "any") return GENDERS;
    return [gp as QueueItem["gender"]];
  }

  private async takeCompatiblePairRedis(): Promise<[QueueItem | null, QueueItem | null]> {
    if (!this.redis) return [null, null];
    const region = await this.pickNextRegionRedis();
    if (!region) return [null, null];

    const poppedA = await this.redis.zpopmin(this.redisKeyAll(region), 1);
    if (!poppedA || poppedA.length === 0) return [null, null];
    const userAId = poppedA[0] as string;

    const rawA = await this.redis.get(QUEUE_ITEM_PREFIX + userAId);
    if (!rawA) return [null, null];
    let a: QueueItem;
    try {
      a = JSON.parse(rawA) as QueueItem;
    } catch {
      return [null, null];
    }

    await this.redis.zrem(this.redisKeyGender(region, a.gender), userAId);
    await this.redis.del(QUEUE_ITEM_PREFIX + userAId);

    const acceptableGenders = this.acceptableCandidateGenders(a);
    const stashed: QueueItem[] = [];

    const maxAttemptsPerGender = 8;
    for (const g of acceptableGenders) {
      for (let attempt = 0; attempt < maxAttemptsPerGender; attempt++) {
        const poppedB = await this.redis.zpopmin(this.redisKeyGender(region, g), 1);
        if (!poppedB || poppedB.length === 0) break;
        const userBId = poppedB[0] as string;

        const rawB = await this.redis.get(QUEUE_ITEM_PREFIX + userBId);
        if (!rawB) {
          await this.redis.zrem(this.redisKeyAll(region), userBId);
          continue;
        }
        let b: QueueItem;
        try {
          b = JSON.parse(rawB) as QueueItem;
        } catch {
          await this.redis.del(QUEUE_ITEM_PREFIX + userBId);
          await this.redis.zrem(this.redisKeyAll(region), userBId);
          continue;
        }

        await this.redis.zrem(this.redisKeyAll(region), userBId);
        await this.redis.del(QUEUE_ITEM_PREFIX + userBId);

        const ok = !(await this.hasCooldown(a.userId, b.userId)) && this.compatible(a, b) && this.compatible(b, a);
        if (ok) {
          for (const s of stashed) await this.requeueFront(s);
          return [a, b];
        }
        stashed.push(b);
      }
    }

    for (const s of stashed) await this.requeueFront(s);
    await this.requeueFront(a);
    return [null, null];
  }
}

