/**
 * Boot hook. Next calls this once per server process, before it handles
 * requests, which is the only place a configuration error can be raised before
 * it silently degrades a feature.
 */
export async function register() {
  const { validateEnv } = await import("@/lib/env");
  const env = validateEnv();

  const warnings: string[] = [];

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    warnings.push(
      "Stripe is not configured: billing is disabled AND plan limits are not enforced.",
    );
  }

  if (!env.ARCJET_KEY) {
    warnings.push(
      "ARCJET_KEY is not set: only the in-process rate limiter protects the public widget endpoints.",
    );
  }

  if (!env.OPENAI_API_KEY) {
    warnings.push(
      "OPENAI_API_KEY is not set: document processing will save text but no embeddings, and chat has no model.",
    );
  }

  if (!env.S3_BUCKET) {
    warnings.push(
      "S3_BUCKET is not set: uploads fall back to local disk (development only) and will fail in production.",
    );
  }

  // Deferred by decision (needs a working sender). Stated loudly so it is not
  // mistaken for an oversight.
  warnings.push(
    "Email verification is disabled: accounts are usable with an unverified address.",
  );

  for (const warning of warnings) {
    console.warn(`[config] ${warning}`);
  }
}
