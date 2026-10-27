import { clientIp, guardChatRequest } from "@/lib/arcjet";
import { getEntitlementsForOrganization } from "@/lib/billing/entitlements";
import { getMonthlyCost } from "@/lib/usage/service";
import { widgetChatSchema } from "@/lib/validations/widget";
import { generateReply } from "@/lib/widgets/chat";
import { corsHeaders, isOriginAllowed } from "@/lib/widgets/origins";
import { rateLimit } from "@/lib/widgets/rate-limit";
import { getWidgetByPublicKey } from "@/lib/widgets/service";

type RouteContext = { params: Promise<{ key: string }> };

async function widgetContext(request: Request, context: RouteContext) {
  const { key } = await context.params;
  const origin = request.headers.get("origin");
  const widget = await getWidgetByPublicKey(key);
  const allowed = widget?.allowedOrigins ?? [];

  return {
    origin,
    allowed,
    widget,
    originAllowed: isOriginAllowed(origin, allowed),
  };
}

export async function OPTIONS(request: Request, context: RouteContext) {
  const { origin, allowed } = await widgetContext(request, context);

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, allowed),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { origin, allowed, widget, originAllowed } = await widgetContext(
    request,
    context,
  );
  const headers = corsHeaders(origin, allowed);

  if (!widget) {
    return Response.json(
      { error: "Unknown widget key." },
      { status: 404, headers },
    );
  }

  if (!originAllowed) {
    return Response.json(
      { error: "This origin is not allowed for this widget." },
      { status: 403, headers },
    );
  }

  if (!widget.active) {
    return Response.json(
      { error: "This widget is disabled." },
      { status: 403, headers },
    );
  }

  const parsed = widgetChatSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400, headers },
    );
  }

  // Limits and LLM guards run before retrieval, so a blocked request never
  // reaches the embedding or model APIs.
  const guard = await guardChatRequest(request, {
    widgetId: widget.id,
    message: parsed.data.message,
  });

  if (!guard.allowed) {
    return Response.json(
      { error: guard.error },
      { status: guard.status, headers },
    );
  }

  // Always run the in-process limiter as a backstop. Gating it on "Arcjet is
  // not configured" meant that a misconfigured or degraded Arcjet — which fails
  // open by design — left this public endpoint with no limit at all.
  const limit = rateLimit(`${widget.id}:${clientIp(request) || "unknown"}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.ok) {
    return Response.json(
      { error: "Too many messages. Please slow down." },
      {
        status: 429,
        headers: { ...headers, "Retry-After": `${limit.retryAfterSeconds}` },
      },
    );
  }

  // Spend ceiling. The widget key ships in the customer's HTML, so a per-IP
  // limit is fairness, not a boundary — this is what actually caps the bill.
  const entitlements = await getEntitlementsForOrganization(
    widget.organizationId,
  );

  if (
    (await getMonthlyCost(widget.organizationId)) >=
    entitlements.monthlyCostCeilingUsd
  ) {
    return Response.json(
      {
        error:
          "This assistant has reached its monthly usage limit. Ask the site owner to raise it.",
      },
      { status: 429, headers },
    );
  }

  try {
    const answer = await generateReply({
      organizationId: widget.organizationId,
      widgetId: widget.id,
      message: parsed.data.message,
      history: parsed.data.history,
    });

    return Response.json(
      {
        reply: answer.answer,
        kind: answer.kind,
        status: answer.status,
        citations: answer.citations,
        topics: answer.topics,
      },
      { headers },
    );
  } catch (error) {
    console.error("[widget] answer failed", error);

    return Response.json(
      { error: "The assistant couldn't answer just now. Please try again." },
      { status: 502, headers },
    );
  }
}
