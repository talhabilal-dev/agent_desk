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
import { CreateWidgetForm } from "@/components/widgets/create-widget-form";
import { WidgetList } from "@/components/widgets/widget-list";
import { listOrganizations } from "@/lib/organizations/service";
import { getSession } from "@/lib/session";
import { listWidgets } from "@/lib/widgets/service";

export const metadata = {
  title: "Widgets",
};

export default function WidgetsPage() {
  return (
    <Suspense fallback={<WidgetsSkeleton />}>
      <WidgetsContent />
    </Suspense>
  );
}

async function WidgetsContent() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const [widgets, organizations] = await Promise.all([
    listWidgets(session.user.id),
    listOrganizations(session.user.id),
  ]);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Widgets</h1>
        <p className="text-sm text-muted-foreground">
          Embed a chat widget in any web app and theme it to match your brand.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-white/5 bg-white/[0.02] ring-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Your widgets</CardTitle>
            <CardDescription>
              {widgets.length === 0
                ? "Nothing here yet — create your first widget."
                : `${widgets.length} ${
                    widgets.length === 1 ? "widget" : "widgets"
                  } · each has its own publishable key`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WidgetList
              widgets={widgets.map((widget) => ({
                id: widget.id,
                name: widget.name,
                publicKey: widget.publicKey,
                organizationName: widget.organizationName,
                allowedOrigins: widget.allowedOrigins,
                primaryColor: widget.primaryColor,
                backgroundColor: widget.backgroundColor,
                textColor: widget.textColor,
                position: widget.position,
                title: widget.title,
                welcomeMessage: widget.welcomeMessage,
              }))}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border border-white/5 bg-white/[0.02] ring-0">
            <CardHeader>
              <CardTitle>Create widget</CardTitle>
              <CardDescription>
                Pick a theme now — you can change it any time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateWidgetForm
                organizations={organizations.map(({ id, name }) => ({
                  id,
                  name,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function WidgetsSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 w-full lg:col-span-2" />
        <Skeleton className="h-[34rem] w-full" />
      </div>
    </>
  );
}
