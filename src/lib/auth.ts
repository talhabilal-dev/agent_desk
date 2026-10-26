import { stripe } from "@better-auth/stripe";
import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import Stripe from "stripe";

import { db } from "../db";
import * as schema from "../db/auth-schema";
import { inngest } from "../inngest/client";
import { getStripePlans } from "./billing/plans";

/**
 * Stripe is registered only when both secrets exist. `new Stripe("")` throws at
 * module load, and this module is imported by the proxy, so an unconditional
 * client would take down the whole app whenever the keys are absent.
 */
function billingPlugins(): BetterAuthPlugin[] {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return [];
  }

  return [
    stripe({
      stripeClient: new Stripe(secretKey),
      stripeWebhookSecret: webhookSecret,
      createCustomerOnSignUp: true,
      /**
       * Enqueue authoritative verification. Signature verification already
       * happened before this hook runs, and the plugin has already written the
       * subscription row, so a queueing failure must never fail the webhook
       * (Stripe would retry the whole event).
       */
      onEvent: async (event) => {
        if (event.type !== "checkout.session.completed") {
          return;
        }

        const session = event.data.object as Stripe.Checkout.Session;

        try {
          await inngest.send({
            // Inngest dedupes on this id for 24h.
            id: `stripe-${event.id}`,
            name: "stripe/checkout.completed",
            data: { eventId: event.id, sessionId: session.id },
          });
        } catch (error) {
          console.error(
            "[billing] could not enqueue checkout verification",
            error,
          );
        }
      },
      subscription: {
        enabled: true,
        // A function, so the catalog is read from the database on demand.
        plans: getStripePlans,
        // Subscriptions are user-scoped; organizations belong to their owner.
        authorizeReference: async ({ user, referenceId }) =>
          referenceId === user.id,
        /**
         * Stripe idempotency key for Checkout session creation.
         *
         * Retries and double-submits inside the same 15-minute bucket return
         * the already-created session instead of creating a second one, so a
         * user cannot end up paying twice. After that the key changes, so an
         * abandoned (expired) session doesn't block a fresh attempt.
         */
        getCheckoutSessionParams: async ({ user, plan }) => {
          const bucket = Math.floor(Date.now() / (15 * 60 * 1000));

          return {
            options: {
              idempotencyKey: `checkout:${user.id}:${plan.name}:${bucket}`,
            },
          };
        },
      },
    }),
  ];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  // No organization plugin: organizations are owned by this app and served
  // from /api/organizations (guarded in the proxy and in the route handlers).
  plugins: [...billingPlugins(), nextCookies()],
});
