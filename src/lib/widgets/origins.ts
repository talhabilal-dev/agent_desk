/**
 * Per-widget CORS. `allowedOrigins` lives in the database so a customer can add
 * a domain without a redeploy.
 */

export const CORS_BASE_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // The response varies by Origin, so caches must not serve it across domains.
  Vary: "Origin",
};

/**
 * A request with no `Origin` is not a browser (curl, server-to-server) and can
 * forge one anyway, so it is allowed through — the widget key remains the real
 * gate. Browsers on an unlisted origin are refused.
 */
export function isOriginAllowed(origin: string | null, allowed: string[]) {
  if (!origin) {
    return true;
  }

  return allowed.length === 0 || allowed.includes(origin.toLowerCase());
}

/**
 * When the origin isn't allowed no `Access-Control-Allow-Origin` is emitted at
 * all, so the browser blocks the response even if a caller ignores the status.
 */
export function corsHeaders(origin: string | null, allowed: string[]) {
  const headers: Record<string, string> = { ...CORS_BASE_HEADERS };

  if (allowed.length === 0) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (origin && allowed.includes(origin.toLowerCase())) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
