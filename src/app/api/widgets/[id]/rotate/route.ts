import { requireApiSession } from "@/lib/organizations/guard";
import { organizationIdSchema } from "@/lib/validations/organization";
import { rotateWidgetKey } from "@/lib/widgets/service";

type RouteContext = { params: Promise<{ id: string }> };

/** Issues a new key; the old one stops resolving immediately. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const id = organizationIdSchema.safeParse((await context.params).id);

  if (!id.success) {
    return Response.json({ error: "Invalid widget id." }, { status: 400 });
  }

  const rotated = await rotateWidgetKey(auth.session.user.id, id.data);

  if (!rotated) {
    return Response.json({ error: "Widget not found." }, { status: 404 });
  }

  return Response.json({ publicKey: rotated.publicKey });
}
