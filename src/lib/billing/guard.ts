import { count, eq } from "drizzle-orm";

import { db, organization } from "@/db";
import {
  getEntitlements,
  isBillingConfigured,
} from "@/lib/billing/entitlements";

type LimitResult =
  | { ok: true }
  | {
      ok: false;
      body: {
        error: string;
        code: "PLAN_LIMIT_REACHED";
        limit: number;
      };
    };

async function countOrganizations(ownerId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(organization)
    .where(eq(organization.ownerId, ownerId));

  return row?.value ?? 0;
}

/**
 * Enforces the plan's organization allowance.
 *
 * Skipped entirely while billing is unconfigured, so a development database
 * without Stripe keys is still usable. A keyed deployment always enforces.
 */
export async function checkOrganizationLimit(
  userId: string,
): Promise<LimitResult> {
  if (!isBillingConfigured()) {
    return { ok: true };
  }

  const entitlements = await getEntitlements(userId);

  if (entitlements.organizations === null) {
    return { ok: true };
  }

  const owned = await countOrganizations(userId);

  if (owned < entitlements.organizations) {
    return { ok: true };
  }

  return {
    ok: false,
    body: {
      error:
        entitlements.organizations === 0
          ? "Subscribe to a plan to create organizations."
          : `Your ${entitlements.plan} plan is limited to ${entitlements.organizations} organization${
              entitlements.organizations === 1 ? "" : "s"
            }. Upgrade to add more.`,
      code: "PLAN_LIMIT_REACHED",
      limit: entitlements.organizations,
    },
  };
}
