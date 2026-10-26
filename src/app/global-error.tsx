"use client";

import { TriangleAlert } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function GlobalError({
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
    // global-error must include html and body tags
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              A critical error occurred and the application could not recover.
              Try again, or reload the page.
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

          <Button onClick={() => retry()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
