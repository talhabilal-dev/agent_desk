"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // TODO: forward to an error reporting service (e.g. Sentry)
    console.error(error);
  }, [error]);

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  const digest =
    error instanceof Error && "digest" in error
      ? (error as Error & { digest?: string }).digest
      : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error occurred while rendering this page. You can try
          again or head back home.
        </p>
      </div>

      {process.env.NODE_ENV === "development" ? (
        <div className="w-full max-w-lg rounded-lg border border-border bg-muted/50 p-4 text-left">
          <p className="break-words font-mono text-xs text-destructive">
            {message}
          </p>
          {digest ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              digest: {digest}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
