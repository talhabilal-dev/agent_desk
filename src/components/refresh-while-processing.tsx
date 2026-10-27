"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Refreshes the current route while background work is in flight.
 *
 * Without this a document that finishes processing keeps showing "processing"
 * until the user navigates away, because nothing re-fetches the server
 * component.
 */
export function RefreshWhileProcessing({
  active,
  intervalMs = 4000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) {
      return;
    }

    const timer = setInterval(() => router.refresh(), intervalMs);

    return () => clearInterval(timer);
  }, [active, intervalMs, router]);

  return null;
}
