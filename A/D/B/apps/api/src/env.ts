import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  CORS_ORIGIN: z.string().min(1),

  // If set, all /moderation/* endpoints require this header: x-moderator-key
  MODERATOR_API_KEY: z.string().optional(),
  
  ADMIN_EMAILS: z.string().optional(),

  // Billing (Stripe). If STRIPE_SECRET_KEY is unset, billing stays in dev-mode only.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PLUS_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PLUS_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_SUCCESS_URL: z.string().optional(), // e.g. http://localhost:3000/plus?success=1
  STRIPE_CANCEL_URL: z.string().optional(), // e.g. http://localhost:3000/plus?canceled=1

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60 * 60).default(60 * 60 * 24 * 30),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URL: z.string().optional(),

  // Compliance toggles
  ALLOW_UNDER13_WITH_PARENTAL_CONSENT: z.coerce.boolean().optional(),
  REQUIRE_AGE_VERIFIED_FOR_VIDEO: z.coerce.boolean().optional(),

  // Third-party ID verification provider (stubbed if unset)
  IDV_PROVIDER: z.string().optional(),
  IDV_API_KEY: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

