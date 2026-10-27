import { and, eq, inArray, sql } from "drizzle-orm";

import { db, organization, subscription } from "@/db";
import { getPlanByKey } from "@/lib/billing/plans";

/** Subscription statuses that still grant access. */
const LIVE_STATUSES = ["active", "trialing", "past_due"];

export type Entitlements = {
  plan: string | null;
  /** null = unlimited. */
  organizations: number | null;
  /** Calendar-month page allowance. */
  pages: number;
  ocr: boolean;
  processing: string;
  /** Calendar-month model spend ceiling in USD, checked before each call. */
  monthlyCostCeilingUsd: number;
};

export type CurrentSubscription = typeof subscription.$inferSelect;

/**
 * What an account without a subscription gets. Deliberately not zero: the
 * product has to be usable before payment, and a zero allowance meant every
 * upload ran the full (expensive) extraction before being marked failed.
 */
export const NO_SUBSCRIPTION_ENTITLEMENTS: Entitlements = {
  plan: null,
  organizations: 1,
  pages: 25,
  ocr: false,
  processing: "basic",
  monthlyCostCeilingUsd: 1,
};

/** Billing is only active once both Stripe secrets exist. */
export function isBillingConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
  );
}

/**
 * The plugin's `subscription` model has no createdAt column. Ordering is still
 * explicit: without it, two live rows (e.g. mid-upgrade) resolve
 * non-deterministically and the account could get either plan's limits.
 */
export async function getCurrentSubscription(userId: string) {
  const [row] = await db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.referenceId, userId),
        inArray(subscription.status, LIVE_STATUSES),
      ),
    )
    .orderBy(sql`${subscription.periodEnd} desc nulls last`)
    .limit(1);

  return row ?? null;
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const current = await getCurrentSubscription(userId);

  if (!current) {
    return NO_SUBSCRIPTION_ENTITLEMENTS;
  }

  const planRow = await getPlanByKey(current.plan);

  if (!planRow) {
    return NO_SUBSCRIPTION_ENTITLEMENTS;
  }

  return {
    plan: planRow.key,
    organizations: planRow.organizationLimit,
    pages: planRow.pageLimit,
    ocr: planRow.ocrEnabled,
    processing: planRow.processingTier,
    monthlyCostCeilingUsd: Number(planRow.monthlyCostCeilingUsd),
  };
}

/**
 * Entitlements for whoever owns `organizationId`. The public widget path has an
 * organization, not a user, and needs the ceiling before calling the model.
 */
export async function getEntitlementsForOrganization(organizationId: string) {
  const [row] = await db
    .select({ ownerId: organization.ownerId })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return row ? getEntitlements(row.ownerId) : NO_SUBSCRIPTION_ENTITLEMENTS;
}
