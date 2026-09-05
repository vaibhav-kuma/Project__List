import Stripe from "stripe";
import type { Env } from "./env.js";
import { prisma } from "./prisma.js";

export function getStripe(env: Env) {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
}

export function stripeSuccessUrl(env: Env) {
  return env.STRIPE_SUCCESS_URL ?? "http://localhost:3000/plus?success=1";
}

export function stripeCancelUrl(env: Env) {
  return env.STRIPE_CANCEL_URL ?? "http://localhost:3000/plus?canceled=1";
}

export async function upsertStripeSubscriptionFromWebhook(opts: {
  providerEventId: string;
  payload: any;
}) {
  // We store the raw event payload for auditability/dedup.
  await prisma.paymentEvent
    .create({
      data: {
        provider: "stripe",
        providerEventId: opts.providerEventId,
        payload: opts.payload
      }
    })
    .catch(() => {});
}

export async function setSubscriptionFromStripe(params: {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubId: string;
  status: string;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
  trialEnd: number | null;
  planId: string;
}) {
  const status = params.status as any;
  const currentPeriodStart = params.currentPeriodStart ? new Date(params.currentPeriodStart * 1000) : null;
  const currentPeriodEnd = params.currentPeriodEnd ? new Date(params.currentPeriodEnd * 1000) : null;
  const canceledAt = params.canceledAt ? new Date(params.canceledAt * 1000) : null;
  const trialEndsAt = params.trialEnd ? new Date(params.trialEnd * 1000) : null;

  const existing = await prisma.subscription.findFirst({
    where: { userId: params.userId, provider: "stripe", providerSubId: params.stripeSubId }
  });

  if (existing) {
    return await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        providerCustomerId: params.stripeCustomerId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd,
        canceledAt,
        planId: params.planId
      }
    });
  }

  return await prisma.subscription.create({
    data: {
      userId: params.userId,
      provider: "stripe",
      providerCustomerId: params.stripeCustomerId,
      providerSubId: params.stripeSubId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
      canceledAt,
      planId: params.planId
    }
  });
}

