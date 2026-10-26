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

/** Behind a proxy the client IP is only in these headers; anything is advisory. */
function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
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

  const limit = rateLimit(`${widget.id}:${clientIp(request)}`, {
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

  const reply = await generateReply({
    widgetName: widget.name,
    message: parsed.data.message,
    history: parsed.data.history,
  });

  return Response.json({ reply }, { headers });
}
