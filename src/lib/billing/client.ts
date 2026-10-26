"use client";

import { subscription } from "@/lib/auth-client";

/** The plugin returns a `{ url, redirect }` payload when `disableRedirect` is set. */
function readUrl(data: unknown) {
  return data && typeof data === "object" && "url" in data
    ? ((data as { url?: string }).url ?? undefined)
    : undefined;
}

export async function startCheckout(input: {
  plan: string;
  annual: boolean;
  successUrl: string;
  cancelUrl: string;
}) {
  const { data, error } = await subscription.upgrade({
    plan: input.plan,
    annual: input.annual,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    disableRedirect: true,
  });

  if (error) {
    throw new Error(error.message ?? "Could not start checkout.");
  }

  const url = readUrl(data);

  if (!url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return url;
}

export async function listMySubscriptions() {
  const { data, error } = await subscription.list();

  if (error) {
    throw new Error(error.message ?? "Could not load subscriptions.");
  }

  return data ?? [];
}

/** Cancels at period end. Stripe may return a portal URL to confirm. */
export async function cancelMySubscription(
  returnUrl: string,
): Promise<string | undefined> {
  const { data, error } = await subscription.cancel({
    returnUrl,
    disableRedirect: true,
  });

  if (error) {
    throw new Error(error.message ?? "Could not cancel the subscription.");
  }

  return readUrl(data);
}

export async function restoreMySubscription(): Promise<string | undefined> {
  const { error } = await subscription.restore({});

  if (error) {
    throw new Error(error.message ?? "Could not restore the subscription.");
  }

  return undefined;
}

export async function openBillingPortal(returnUrl: string) {
  const { data, error } = await subscription.billingPortal({
    returnUrl,
    disableRedirect: true,
  });

  if (error) {
    throw new Error(error.message ?? "Could not open the billing portal.");
  }

  const url = readUrl(data);

  if (!url) {
    throw new Error("Stripe did not return a portal URL.");
  }

  return url;
}
