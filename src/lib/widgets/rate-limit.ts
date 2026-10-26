type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Best-effort fixed-window limiter, in-process only: on multiple instances each
 * one counts separately, so a real deployment should move this to Redis. It is
 * here to stop one embed from hammering a public endpoint.
 */
export function rateLimit(
  key: string,
  { limit = 20, windowMs = 60_000 } = {},
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [existing, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(existing);
      }
    }
  }

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });

    return { ok: true };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { ok: true };
}
