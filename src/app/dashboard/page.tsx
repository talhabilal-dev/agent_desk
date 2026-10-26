import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Dashboard",
};

const stats = [
  {
    label: "Total agents",
    value: "24",
    delta: "+12%",
    trend: "up" as const,
    icon: Cpu,
    accent: "from-indigo-500/20 to-indigo-500/5 text-indigo-400",
  },
  {
    label: "Active runs",
    value: "138",
    delta: "+8.2%",
    trend: "up" as const,
    icon: Activity,
    accent: "from-cyan-500/20 to-cyan-500/5 text-cyan-400",
  },
  {
    label: "Success rate",
    value: "97.4%",
    delta: "+1.1%",
    trend: "up" as const,
    icon: CheckCircle2,
    accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
  },
  {
    label: "Avg. latency",
    value: "1.8s",
    delta: "-0.3s",
    trend: "down" as const,
    icon: Clock,
    accent: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-400",
  },
];

const usage = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 55 },
  { day: "Wed", value: 38 },
  { day: "Thu", value: 70 },
  { day: "Fri", value: 62 },
  { day: "Sat", value: 88 },
  { day: "Sun", value: 74 },
];

const activity = [
  {
    title: "Research agent completed",
    meta: "12 sources summarised",
    time: "2m ago",
    tone: "text-emerald-400",
  },
  {
    title: "Support triage run started",
    meta: "Queue · 48 tickets",
    time: "18m ago",
    tone: "text-cyan-400",
  },
  {
    title: "Code review agent failed",
    meta: "Timeout after 30s",
    time: "1h ago",
    tone: "text-destructive",
  },
  {
    title: "Weekly digest generated",
    meta: "Sent to 6 recipients",
    time: "3h ago",
    tone: "text-indigo-400",
  },
];

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

  const firstName = session.user.name?.split(" ")[0] || "there";
  const maxUsage = Math.max(...usage.map((point) => point.value));

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what your agents have been up to this week.
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
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">
                  {stat.value}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    stat.trend === "up" ? "text-emerald-400" : "text-cyan-400"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {stat.delta}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-white/5 bg-white/[0.02] ring-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Agent runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end justify-between gap-2 sm:gap-4">
              {usage.map((point) => (
                <div
                  key={point.day}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-40 w-full items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-indigo-500/40 to-fuchsia-500/80 transition-all"
                      style={{
                        height: `${Math.round((point.value / maxUsage) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {point.day}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/5 bg-white/[0.02] ring-0">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {activity.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full bg-current ${item.tone}`}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.meta}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.time}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
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
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 w-full lg:col-span-2" />
        <Skeleton className="h-72 w-full" />
      </div>
    </>
  );
}
