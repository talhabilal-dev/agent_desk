import { and, eq, inArray } from "drizzle-orm";

import { db, subscription } from "@/db";
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
};

export type CurrentSubscription = typeof subscription.$inferSelect;

export const NO_SUBSCRIPTION_ENTITLEMENTS: Entitlements = {
  plan: null,
  organizations: 0,
  pages: 0,
  ocr: false,
  processing: "none",
};

/** Billing is only active once both Stripe secrets exist. */
export function isBillingConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
  );
}

/**
 * The plugin's `subscription` model has no createdAt column, so this takes the
 * first live row rather than ordering. The plugin keeps one live subscription
 * per reference (per group) anyway.
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
  };
}
