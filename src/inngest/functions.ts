import { claimStripeEvent, verifyCheckoutSession } from "@/lib/billing/verify";

import { inngest } from "./client";

type CheckoutCompletedData = {
  eventId: string;
  sessionId: string;
};

/**
 * Authoritative post-payment verification.
 *
 * Webhooks can be delivered more than once and the success redirect proves
 * nothing, so this re-reads the checkout from Stripe and reconciles the local
 * subscription. Idempotent at three levels: Inngest event dedupe, the
 * function-level `idempotency` key, and the `stripe_event` primary key.
 */
export const verifyStripeCheckout = inngest.createFunction(
  {
    id: "verify-stripe-checkout",
    name: "Verify Stripe checkout",
    triggers: [{ event: "stripe/checkout.completed" }],
    idempotency: "event.data.eventId",
    retries: 3,
  },
  async ({ event, step }) => {
    const { eventId, sessionId } = event.data as CheckoutCompletedData;

    const claimed = await step.run("claim-event", () =>
      claimStripeEvent(eventId, "checkout.session.completed"),
    );

    if (!claimed) {
      return { skipped: true, reason: "Event already processed." };
    }

    return step.run("verify-session", () => verifyCheckoutSession(sessionId));
  },
);
