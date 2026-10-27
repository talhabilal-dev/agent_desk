import { z } from "zod";

/**
 * Environment contract.
 *
 * `validateEnv()` is called once at boot (see `src/instrumentation.ts`), so a
 * missing required variable fails loudly instead of silently disabling a
 * feature — the failure mode that made a missing Stripe key look like
 * "unlimited free accounts" and a missing Arcjet key mean "no abuse
 * protection".
 *
 * Everything except the database, the auth secret and the storage bucket is
 * optional: those are features that degrade, not reasons to refuse to start.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Required: the app cannot serve a single request without these.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required."),
  BETTER_AUTH_URL: z.string().url().optional(),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_CHAT_MODEL: z.string().min(1).optional(),

  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  ARCJET_KEY: z.string().min(1).optional(),
  ARCJET_ENV: z.string().min(1).optional(),

  // Object storage. Required in production; `storage.ts` enforces that at call
  // time so a build without configuration still succeeds.
  S3_BUCKET: z.string().min(1).optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),

  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),

  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  UPLOAD_DIR: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

/** True when both Stripe secrets are present. Billing off = no plan limits. */
export function isStripeConfigured(env: Env = validateEnv()) {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}
