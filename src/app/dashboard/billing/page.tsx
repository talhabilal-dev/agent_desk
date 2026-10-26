import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PlanCards } from "@/components/billing/plan-cards";
import { SubscriptionActions } from "@/components/billing/subscription-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCurrentSubscription,
  getEntitlements,
  isBillingConfigured,
} from "@/lib/billing/entitlements";
import { listPlans } from "@/lib/billing/plans";
import { getUsedPages } from "@/lib/documents/quota";
import { listOrganizations } from "@/lib/organizations/service";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Billing",
};

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}

async function BillingContent() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const [plans, current, entitlements, organizations, pagesUsed] =
    await Promise.all([
      listPlans(),
      getCurrentSubscription(session.user.id),
      getEntitlements(session.user.id),
      listOrganizations(session.user.id),
      getUsedPages(session.user.id),
    ]);

  const billingConfigured = isBillingConfigured();
  const pagesRemaining = Math.max(0, entitlements.pages - pagesUsed);
  const pagesPercent =
    entitlements.pages > 0
      ? Math.min(100, Math.round((pagesUsed / entitlements.pages) * 100))
      : 0;
  const activePlan = plans.find((plan) => plan.key === entitlements.plan);
  const renewal = current?.periodEnd
    ? current.periodEnd.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, payment details and usage limits.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-white/5 bg-white/[0.02] ring-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>
              {activePlan
                ? `${activePlan.name} · ${current?.status ?? "inactive"}${
                    renewal ? ` · renews ${renewal}` : ""
                  }`
                : billingConfigured
                  ? "No active subscription."
                  : "Billing is not configured on this deployment."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Organizations</dt>
                <dd className="font-medium">
                  {organizations.length} /{" "}
                  {entitlements.organizations === null
                    ? "∞"
                    : entitlements.organizations}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">
                  Pages remaining
                </dt>
                <dd className="font-medium">
                  {pagesRemaining}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    of {entitlements.pages}
                  </span>
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">OCR</dt>
                <dd className="font-medium">
                  {entitlements.ocr ? "Included" : "—"}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Processing</dt>
                <dd className="font-medium capitalize">
                  {entitlements.processing}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Pages this month</span>
                <span>
                  {pagesUsed} of {entitlements.pages} used · {pagesRemaining}{" "}
                  remaining · resets monthly
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                  style={{ width: `${pagesPercent}%` }}
                />
              </div>
            </div>

            {current ? (
              <SubscriptionActions
                cancelAtPeriodEnd={Boolean(current.cancelAtPeriodEnd)}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Plans</h2>
        <p className="text-sm text-muted-foreground">
          Prices are per month. Yearly billing is charged once per year.
        </p>
      </div>

      <PlanCards
        plans={plans}
        currentPlan={entitlements.plan}
        billingConfigured={billingConfigured}
      />
    </>
  );
}

function BillingSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 w-full lg:col-span-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </>
  );
}
