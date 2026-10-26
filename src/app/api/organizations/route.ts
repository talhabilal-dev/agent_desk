import { checkOrganizationLimit } from "@/lib/billing/guard";
import { requireApiSession } from "@/lib/organizations/guard";
import {
  createOrganization,
  listOrganizations,
  OrganizationSlugTakenError,
} from "@/lib/organizations/service";
import { organizationDetailsSchema } from "@/lib/validations/organization";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const organizations = await listOrganizations(auth.session.user.id);

  return Response.json(organizations);
}

export async function POST(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
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

  // 402 rather than 403 so the client can tell "upgrade" from a real error.
  const limit = await checkOrganizationLimit(auth.session.user.id);

  if (!limit.ok) {
    return Response.json(limit.body, { status: 402 });
  }

  try {
    const created = await createOrganization(auth.session.user.id, parsed.data);

    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof OrganizationSlugTakenError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}
