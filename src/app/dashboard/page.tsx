import { Building2, FileText, MessagesSquare, Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageByOrganization } from "@/components/usage-by-organization";
import { countDocumentsForOwner } from "@/lib/documents/service";
import { listOrganizations } from "@/lib/organizations/service";
import { getSession } from "@/lib/session";
import { getOrganizationUsage } from "@/lib/usage/service";
import { listWidgets } from "@/lib/widgets/service";
import { formatUsd } from "@/utils/format";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  // Everything below is queried. The previous version rendered hardcoded
  // numbers ("97.4% success rate", a fake activity feed), which read as real
  // telemetry and was simply invented.
  const [usage, widgets, organizations, documents] = await Promise.all([
    getOrganizationUsage(session.user.id),
    listWidgets(session.user.id),
    listOrganizations(session.user.id),
    countDocumentsForOwner(session.user.id),
  ]);

  const replies = usage.reduce((sum, row) => sum + row.requests, 0);
  const spendUsd = usage.reduce((sum, row) => sum + row.costUsd, 0);
  const firstName = session.user.name?.split(" ")[0] || "there";

  const stats = [
    {
      label: "Documents",
      value: documents.toLocaleString(),
      icon: FileText,
      accent: "from-indigo-500/20 to-indigo-500/5 text-indigo-400",
    },
    {
      label: "Widgets",
      value: widgets.length.toLocaleString(),
      icon: MessagesSquare,
      accent: "from-cyan-500/20 to-cyan-500/5 text-cyan-400",
    },
    {
      label: "Organizations",
      value: organizations.length.toLocaleString(),
      icon: Building2,
      accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
    },
    {
      label: "Model spend",
      value: formatUsd(Math.round(spendUsd * 100)),
      icon: Receipt,
      accent: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-400",
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {replies === 0
            ? "Upload a document and embed a widget to get started."
            : `${replies.toLocaleString()} widget ${
                replies === 1 ? "reply" : "replies"
              } answered so far.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border border-white/5 bg-white/[0.02] ring-0 transition-colors hover:border-white/10"
          >
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <span
                  className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.accent}`}
                >
                  <stat.icon className="size-4" />
                </span>
              </div>
              <span className="text-2xl font-semibold tracking-tight">
                {stat.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-white/5 bg-white/[0.02] ring-0">
        <CardHeader>
          <CardTitle>Usage by organization</CardTitle>
          <CardDescription>
            Model tokens and cost attributed to each workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageByOrganization usage={usage} />
        </CardContent>
      </Card>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </>
  );
}
