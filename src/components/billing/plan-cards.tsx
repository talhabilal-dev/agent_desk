"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { startCheckout } from "@/lib/billing/client";
import type { PlanView } from "@/lib/billing/plans";
import { errorMessage } from "@/utils/error";
import { formatUsd } from "@/utils/format";

type Interval = "monthly" | "annual";

export function PlanCards({
  plans,
  currentPlan,
  billingConfigured,
}: {
  plans: PlanView[];
  currentPlan: string | null;
  billingConfigured: boolean;
}) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  async function subscribe(plan: PlanView) {
    setPendingPlan(plan.key);

    try {
      const url = await startCheckout({
        plan: plan.key,
        annual: interval === "annual",
        successUrl: `${window.location.origin}/dashboard/billing`,
        cancelUrl: `${window.location.origin}/dashboard/billing`,
      });

      window.location.assign(url);
    } catch (error) {
      toast.add({
        type: "error",
        title: "Could not start checkout",
        description: errorMessage(error),
      });
      setPendingPlan(null);
    }
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No plans are available yet. Run{" "}
        <code className="font-mono text-xs">scripts/seed-plans.sql</code> to
        populate the catalog.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 self-start rounded-lg border border-white/10 bg-white/[0.03] p-1">
        <Button
          variant={interval === "monthly" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setInterval("monthly")}
        >
          Monthly
        </Button>
        <Button
          variant={interval === "annual" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setInterval("annual")}
        >
          Yearly · save ~20%
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const price =
            interval === "annual"
              ? plan.annualMonthlyPriceCents
              : plan.monthlyPriceCents;
          const available =
            billingConfigured &&
            (interval === "annual" ? plan.canPayAnnually : plan.canPayMonthly);
          const isPending = pendingPlan === plan.key;

          return (
            <div
              key={plan.key}
              className={`flex flex-col gap-4 rounded-xl border p-5 ${
                isCurrent
                  ? "border-indigo-400/40 bg-indigo-500/[0.07]"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{plan.name}</span>
                {isCurrent ? (
                  <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                    Current
                  </span>
                ) : null}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight">
                  {formatUsd(price)}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>

              <p className="text-xs text-muted-foreground">
                {interval === "annual"
                  ? `${formatUsd(price * 12)} billed yearly`
                  : "Billed monthly"}
              </p>

              <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <li>
                  {plan.organizationLimit === null
                    ? "Unlimited organizations"
                    : `${plan.organizationLimit} organization${
                        plan.organizationLimit === 1 ? "" : "s"
                      }`}
                </li>
                <li>{plan.pageLimit} pages / month</li>
                <li>{plan.ocrEnabled ? "OCR included" : "No OCR"}</li>
                <li>
                  {plan.processingTier === "advanced"
                    ? "Advanced processing"
                    : "Basic processing"}
                </li>
              </ul>

              <Button
                className="mt-auto w-full"
                variant={isCurrent ? "outline" : "default"}
                disabled={isCurrent || !available || isPending}
                onClick={() => subscribe(plan)}
              >
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {isCurrent
                  ? "Current plan"
                  : !billingConfigured
                    ? "Billing not configured"
                    : !available
                      ? "Not available yet"
                      : currentPlan
                        ? "Switch plan"
                        : "Subscribe"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
