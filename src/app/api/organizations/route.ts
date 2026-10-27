import {
  getEntitlements,
  isBillingConfigured,
} from "@/lib/billing/entitlements";
import { requireApiSession } from "@/lib/organizations/guard";
import {
  createOrganization,
  listOrganizations,
  OrganizationLimitReachedError,
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

  // Billing unconfigured means no cap, so a development database without Stripe
  // keys stays usable. The limit is handed to the service, which enforces it
  // atomically rather than trusting a check made here.
  const entitlements = await getEntitlements(auth.session.user.id);
  const limit = isBillingConfigured() ? entitlements.organizations : null;

  try {
    const created = await createOrganization(
      auth.session.user.id,
      parsed.data,
      limit,
    );

    return Response.json(created, { status: 201 });
  } catch (error) {
    // 402 rather than 403 so the client can tell "upgrade" from a real error.
    if (error instanceof OrganizationLimitReachedError) {
      return Response.json(
        {
          error: error.message,
          code: "PLAN_LIMIT_REACHED",
          limit: error.limit,
        },
        { status: 402 },
      );
    }

    if (error instanceof OrganizationSlugTakenError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    throw error;
  }
}
