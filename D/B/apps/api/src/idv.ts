import crypto from "crypto";
import type { Env } from "./env.js";

export type IdvSession = {
  provider: string;
  sessionId: string;
  url: string;
};

// Stubbed integration. Replace with Persona/Onfido/etc using env.IDV_PROVIDER + env.IDV_API_KEY.
export async function createIdvSession(env: Env, userId: string): Promise<IdvSession> {
  const provider = env.IDV_PROVIDER ?? "mock";
  const sessionId = crypto.randomUUID();
  const url = `http://localhost:${env.API_PORT}/idv/mock/${sessionId}?userId=${encodeURIComponent(userId)}`;
  return { provider, sessionId, url };
}

