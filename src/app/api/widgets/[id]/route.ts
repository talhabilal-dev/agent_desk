import { requireApiSession } from "@/lib/organizations/guard";
import { organizationIdSchema } from "@/lib/validations/organization";
import { updateWidgetSchema } from "@/lib/validations/widget";
import { deleteWidget, updateWidget } from "@/lib/widgets/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const id = organizationIdSchema.safeParse((await context.params).id);

  if (!id.success) {
    return Response.json({ error: "Invalid widget id." }, { status: 400 });
  }

  const parsed = updateWidgetSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const updated = await updateWidget(
    auth.session.user.id,
    id.data,
    parsed.data,
  );

  if (!updated) {
    return Response.json({ error: "Widget not found." }, { status: 404 });
  }

  return Response.json(updated);
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const id = organizationIdSchema.safeParse((await context.params).id);

  if (!id.success) {
    return Response.json({ error: "Invalid widget id." }, { status: 400 });
  }

  const deleted = await deleteWidget(auth.session.user.id, id.data);

  if (!deleted) {
    return Response.json({ error: "Widget not found." }, { status: 404 });
  }

  return Response.json({ deleted: true });
}
