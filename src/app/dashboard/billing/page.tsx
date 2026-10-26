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

  const [plans, current, entitlements, organizations] = await Promise.all([
    listPlans(),
    getCurrentSubscription(session.user.id),
    getEntitlements(session.user.id),
    listOrganizations(session.user.id),
  ]);

  const billingConfigured = isBillingConfigured();
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
                <dt className="text-xs text-muted-foreground">Pages / month</dt>
                <dd className="font-medium">{entitlements.pages}</dd>
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
