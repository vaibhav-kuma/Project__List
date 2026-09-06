import { prisma } from "./prisma.js";

export type Entitlements = {
  tier: "free" | "plus";
  advancedFilters: boolean;
  unlimitedRewinds: boolean;
  adFree: boolean;
  priorityMatching: boolean;
  exclusiveFilters: boolean;
  seeWhoAddedYou: boolean;
};

const FREE: Entitlements = {
  tier: "free",
  advancedFilters: false,
  unlimitedRewinds: false,
  adFree: false,
  priorityMatching: false,
  exclusiveFilters: false,
  seeWhoAddedYou: false
};

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
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
  if (!sub?.plan) return FREE;

  const tier = (sub.plan.tier as any) === "plus" ? "plus" : "free";
  const e = (sub.plan.entitlements ?? {}) as any;
  if (tier !== "plus") return FREE;

  return {
    tier,
    advancedFilters: Boolean(e.advancedFilters ?? true),
    unlimitedRewinds: Boolean(e.unlimitedRewinds ?? true),
    adFree: Boolean(e.adFree ?? true),
    priorityMatching: Boolean(e.priorityMatching ?? true),
    exclusiveFilters: Boolean(e.exclusiveFilters ?? true),
    seeWhoAddedYou: Boolean(e.seeWhoAddedYou ?? true)
  };
}

