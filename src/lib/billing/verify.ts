import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { db, stripeEvent, subscription } from "@/db";

function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }

  return new Stripe(secretKey);
}

/**
 * Claims a Stripe event id in a unique column. Returns false when another run
 * already claimed it — the permanent, database-level idempotency guarantee
 * (Inngest's own dedupe window only lasts 24h).
 */
export async function claimStripeEvent(eventId: string, type: string) {
  const [claimed] = await db
    .insert(stripeEvent)
    .values({ eventId, type })
    .onConflictDoNothing()
    .returning();

  return Boolean(claimed);
}

export type VerificationResult = {
  verified: boolean;
  reason: string;
  reconciled: boolean;
};

/**
 * Verifies a completed checkout against Stripe itself rather than trusting the
 * redirect back to the app, then reconciles the local subscription row.
 *
 * Safe to run repeatedly: it only writes when the local row disagrees with
 * Stripe's authoritative state.
 */
export async function verifyCheckoutSession(
  sessionId: string,
): Promise<VerificationResult> {
  const stripe = createStripeClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.mode !== "subscription") {
    return {
      verified: false,
      reason: "Checkout session is not a subscription.",
      reconciled: false,
    };
  }

  const expanded = session.subscription;
  const stripeSubscriptionId =
    typeof expanded === "string" ? expanded : (expanded?.id ?? null);

  if (!stripeSubscriptionId) {
    return {
      verified: false,
      reason: "Checkout session has no subscription.",
      reconciled: false,
    };
  }

  const stripeSubscription =
    expanded && typeof expanded !== "string"
      ? expanded
      : await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const paid =
    session.payment_status === "paid" ||
    stripeSubscription.status === "active" ||
    stripeSubscription.status === "trialing";

  if (!paid) {
    return {
      verified: false,
      reason: `Payment is "${session.payment_status}" and the subscription is "${stripeSubscription.status}".`,
      reconciled: false,
    };
  }

  const metadata = (session.metadata ?? {}) as {
    userId?: string;
    subscriptionId?: string;
  };

  const [local] = metadata.subscriptionId
    ? await db
        .select()
        .from(subscription)
        .where(eq(subscription.id, metadata.subscriptionId))
        .limit(1)
    : await db
        .select()
        .from(subscription)
        .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
        .limit(1);

  if (!local) {
    // The plugin creates the row before redirecting to Checkout, so a missing
    // row means something went wrong earlier — surface it rather than invent
    // a subscription.
    return {
      verified: false,
      reason: "No local subscription row to reconcile.",
      reconciled: false,
    };
  }

  if (metadata.userId && local.referenceId !== metadata.userId) {
    return {
      verified: false,
      reason: "Local subscription belongs to a different user.",
      reconciled: false,
    };
  }

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : undefined;

  const needsReconcile =
    local.status !== stripeSubscription.status ||
    local.stripeSubscriptionId !== stripeSubscriptionId ||
    (stripeCustomerId !== undefined &&
      local.stripeCustomerId !== stripeCustomerId);

  if (!needsReconcile) {
    return { verified: true, reason: "Already in sync.", reconciled: false };
  }

  await db
    .update(subscription)
    .set({
      status: stripeSubscription.status,
      stripeSubscriptionId,
      stripeCustomerId: stripeCustomerId ?? local.stripeCustomerId,
    })
    .where(eq(subscription.id, local.id));

  return {
    verified: true,
    reason: "Reconciled local subscription with Stripe.",
    reconciled: true,
  };
}
