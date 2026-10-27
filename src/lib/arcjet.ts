import arcjet, {
  type ArcjetDecision,
  detectBot,
  detectPromptInjection,
  sensitiveInfo,
  shield,
  slidingWindow,
} from "@arcjet/next";

/** Per-window allowance for one widget + client IP. */
const RATE_LIMIT_INTERVAL = "1m";
const RATE_LIMIT_MAX = 20;

/**
 * The default Arcjet backend only detects these four entity types. Others
 * (SSN, PASSPORT, BANK_ACCOUNT…) throw at construction unless a different
 * backend or a custom `detect` is configured.
 */
const SENSITIVE_INFO_DENY = ["CREDIT_CARD_NUMBER"];

export function isArcjetConfigured() {
  return Boolean(process.env.ARCJET_KEY);
}

/**
 * Client IP from the proxy headers.
 *
 * Vercel and Netlify overwrite `x-forwarded-for`, so it is trustworthy *there*.
 * Behind anything that does not rewrite it, the value is client-supplied: fine
 * for fairness (one noisy visitor shouldn't starve others), never a security
 * boundary. The per-organization spend ceiling is the real limit — this exists
 * so a single IP cannot burn through it in a burst.
 */
export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

/**
 * Shared rules. `characteristics: ["userId"]` deliberately uses only a value
 * we can always supply: with `ip.src` in the list, a request without an IP
 * fails fingerprinting and Arcjet then evaluates *no rules at all* — a silent
 * fail-open. The IP is folded into `userId` below instead.
 */
function baseConfig(key: string) {
  return {
    key,
    characteristics: ["userId"] as const,
    rules: [
      shield({ mode: "LIVE" as const }),
      // Bots inflate model costs and the widget key is public.
      detectBot({ mode: "LIVE" as const, allow: [] }),
      slidingWindow({
        mode: "LIVE" as const,
        interval: RATE_LIMIT_INTERVAL,
        max: RATE_LIMIT_MAX,
      }),
    ],
  };
}

/**
 * Two clients, because the prompt-injection rule makes
 * `detectPromptInjectionMessage` a required `protect()` argument — the config
 * endpoint has no message to inspect, so it gets the limits and bot rules only.
 */
function createClients() {
  const key = process.env.ARCJET_KEY;

  if (!key) {
    return { request: null, chat: null };
  }

  try {
    return {
      request: arcjet(baseConfig(key)),
      chat: arcjet({
        ...baseConfig(key),
        rules: [
          ...baseConfig(key).rules,
          sensitiveInfo({ mode: "LIVE", deny: SENSITIVE_INFO_DENY }),
          detectPromptInjection({ mode: "LIVE" }),
        ],
      }),
    };
  } catch (error) {
    // A bad rule config must not take the endpoints down with it.
    console.error("[arcjet] invalid configuration, guards disabled", error);

    return { request: null, chat: null };
  }
}

const clients = createClients();

export type GuardOutcome =
  | { allowed: true }
  | { allowed: false; status: number; error: string };

/** Maps an Arcjet denial onto a status and a message the widget can show. */
function denial(decision: ArcjetDecision): GuardOutcome {
  const reason = decision.reason;

  if (reason.isRateLimit()) {
    return {
      allowed: false,
      status: 429,
      error: "Too many messages. Please slow down and try again shortly.",
    };
  }

  if (reason.isBot()) {
    return {
      allowed: false,
      status: 403,
      error: "Automated clients are not allowed to use this widget.",
    };
  }

  if (reason.isSensitiveInfo()) {
    return {
      allowed: false,
      status: 400,
      error:
        "Please don't share card or payment details in chat, even if you're asking about a refund.",
    };
  }

  if (reason.isPromptInjection()) {
    return {
      allowed: false,
      status: 400,
      error:
        "That message looks like an attempt to change my instructions. Please rephrase your question.",
    };
  }

  return { allowed: false, status: 403, error: "Request blocked." };
}

/**
 * Chat guard: rate limit, bot, shield, sensitive info and prompt injection,
 * run before retrieval so a blocked request never reaches the embedding or
 * model APIs. Returns `allowed: true` when Arcjet is not configured — the
 * caller then falls back to its in-process limiter.
 */
export async function guardChatRequest(
  request: Request,
  input: { widgetId: string; message: string },
): Promise<GuardOutcome> {
  const client = clients.chat;

  if (!client) {
    return { allowed: true };
  }

  const ip = clientIp(request);

  try {
    const decision = await client.protect(request, {
      ipSrc: ip || undefined,
      userId: `${input.widgetId}:${ip || "unknown"}`,
      // Passed explicitly: Arcjet warns that reading the body itself is
      // deprecated, and doing so would consume the request stream.
      detectPromptInjectionMessage: input.message,
      sensitiveInfoValue: input.message,
    });

    return decision.isDenied() ? denial(decision) : { allowed: true };
  } catch (error) {
    // Arcjet is designed to fail open; so does this, but loudly.
    console.error("[arcjet] protect() failed, allowing request", error);

    return { allowed: true };
  }
}

/** Config guard: limits and bots only, since there is no message to inspect. */
export async function guardWidgetFetch(
  request: Request,
  input: { widgetId: string },
): Promise<GuardOutcome> {
  const client = clients.request;

  if (!client) {
    return { allowed: true };
  }

  const ip = clientIp(request);

  try {
    const decision = await client.protect(request, {
      ipSrc: ip || undefined,
      userId: `${input.widgetId}:${ip || "unknown"}`,
    });

    return decision.isDenied() ? denial(decision) : { allowed: true };
  } catch (error) {
    console.error("[arcjet] protect() failed, allowing request", error);

    return { allowed: true };
  }
}
