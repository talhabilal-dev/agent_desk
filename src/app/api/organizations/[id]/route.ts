import { requireApiSession } from "@/lib/organizations/guard";
import {
  deleteOrganization,
  OrganizationSlugTakenError,
  renameOrganization,
} from "@/lib/organizations/service";
import {
  organizationDetailsSchema,
  organizationIdSchema,
} from "@/lib/validations/organization";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const id = organizationIdSchema.safeParse((await context.params).id);

  if (!id.success) {
    return Response.json(
      { error: "Invalid organization id." },
      { status: 400 },
    );
  }

  const parsed = organizationDetailsSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const updated = await renameOrganization(
      auth.session.user.id,
      id.data,
      parsed.data,
    );

    if (!updated) {
      return Response.json(
        { error: "Organization not found." },
        { status: 404 },
      );
    }

    return Response.json(updated);
  } catch (error) {
    if (error instanceof OrganizationSlugTakenError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const id = organizationIdSchema.safeParse((await context.params).id);

  if (!id.success) {
    return Response.json(
      { error: "Invalid organization id." },
      { status: 400 },
    );
  }

  const deleted = await deleteOrganization(auth.session.user.id, id.data);

  if (!deleted) {
    return Response.json({ error: "Organization not found." }, { status: 404 });
  }

  return Response.json(deleted);
}
