import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateOrganizationForm } from "@/components/create-organization-form";
import { OrganizationList } from "@/components/organization-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getEntitlements,
  isBillingConfigured,
} from "@/lib/billing/entitlements";
import { listOrganizations } from "@/lib/organizations/service";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Organization",
};

export default function OrganizationPage() {
  return (
    <Suspense fallback={<OrganizationSkeleton />}>
      <OrganizationContent />
    </Suspense>
  );
}

async function OrganizationContent() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const [organizations, entitlements] = await Promise.all([
    listOrganizations(session.user.id),
    getEntitlements(session.user.id),
  ]);

  // null = no cap shown. Billing unconfigured means the server skips enforcement.
  const organizationLimit = isBillingConfigured()
    ? entitlements.organizations
    : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground">
          Create, rename and delete organizations.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-white/5 bg-white/[0.02] ring-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Your organizations</CardTitle>
            <CardDescription>
              {organizations.length === 0
                ? "Nothing here yet — create your first organization."
                : `${organizations.length}${
                    organizationLimit === null ? "" : ` of ${organizationLimit}`
                  } ${
                    organizations.length === 1
                      ? "organization"
                      : "organizations"
                  }`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationList
              organizations={organizations.map(({ id, name, slug }) => ({
                id,
                name,
                slug,
              }))}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border border-white/5 bg-white/[0.02] ring-0">
            <CardHeader>
              <CardTitle>Create organization</CardTitle>
              <CardDescription>You&apos;ll be its owner.</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateOrganizationForm
                used={organizations.length}
                limit={organizationLimit}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function OrganizationSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 w-full lg:col-span-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    </>
  );
}
