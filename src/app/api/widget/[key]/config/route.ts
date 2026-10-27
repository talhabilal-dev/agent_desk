import { guardWidgetFetch } from "@/lib/arcjet";
import { corsHeaders, isOriginAllowed } from "@/lib/widgets/origins";
import { getWidgetByPublicKey } from "@/lib/widgets/service";

/**
 * Public, unauthenticated and cross-origin: third-party pages call this with the
 * publishable widget key. It only ever exposes look-and-feel data.
 */
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

export async function GET(request: Request, context: RouteContext) {
  const { origin, allowed, widget, originAllowed } = await widgetContext(
    request,
    context,
  );
  const headers = corsHeaders(origin, allowed);
  const guard = await guardWidgetFetch(request, {
    widgetId: widget?.id ?? "unknown",
  });

  if (!guard.allowed) {
    return Response.json(
      { error: guard.error },
      { status: guard.status, headers },
    );
  }

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

  return Response.json(
    {
      name: widget.name,
      title: widget.title,
      welcomeMessage: widget.welcomeMessage,
      theme: {
        primaryColor: widget.primaryColor,
        backgroundColor: widget.backgroundColor,
        textColor: widget.textColor,
        position: widget.position,
      },
      size: { width: widget.panelWidth, height: widget.panelHeight },
    },
    { headers: { ...headers, "Cache-Control": "public, max-age=60" } },
  );
}
