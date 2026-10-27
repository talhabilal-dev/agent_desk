import { requireApiSession } from "@/lib/organizations/guard";
import { createWidgetSchema } from "@/lib/validations/widget";
import { createWidget, listWidgets } from "@/lib/widgets/service";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  return Response.json(await listWidgets(auth.session.user.id));
}

export async function POST(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createWidgetSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const created = await createWidget(auth.session.user.id, parsed.data);

    return Response.json(created, { status: 201 });
  } catch (error) {
    // Only the service's own not-found message is safe to echo. A driver or
    // schema error is a 500, not a 400, and must not leak internals.
    if (error instanceof Error && error.message === "Organization not found.") {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("[widgets] failed to create widget", error);

    return Response.json(
      { error: "Could not create the widget." },
      { status: 500 },
    );
  }
}
