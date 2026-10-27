import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/**
 * Dashboard-scoped 404. Without this, a missing document id fell through to the
 * marketing 404 ("This page drifted off course"), which describes the wrong app.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-start justify-center gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Not found in this workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          That page or record doesn&apos;t exist, or it belongs to someone else.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        Back to dashboard
      </Link>
    </div>
  );
}
