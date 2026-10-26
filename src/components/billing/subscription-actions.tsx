"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  cancelMySubscription,
  openBillingPortal,
  restoreMySubscription,
} from "@/lib/billing/client";
import { errorMessage } from "@/utils/error";

type PendingAction = "portal" | "cancel" | "restore" | null;

export function SubscriptionActions({
  cancelAtPeriodEnd,
}: {
  cancelAtPeriodEnd: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [, startTransition] = useTransition();

  function run(
    action: Exclude<PendingAction, null>,
    task: () => Promise<string | undefined>,
  ) {
    setPending(action);

    startTransition(async () => {
      try {
        const url = await task();

        if (url) {
          window.location.assign(url);
          return;
        }

        toast.add({ type: "success", title: "Billing updated." });
        router.refresh();
      } catch (error) {
        toast.add({
          type: "error",
          title: "Billing action failed",
          description: errorMessage(error),
        });
      } finally {
        setPending(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        variant="outline"
        disabled={pending !== null}
        onClick={() =>
          run("portal", () => openBillingPortal("/dashboard/billing"))
        }
      >
        {pending === "portal" ? <Loader2 className="animate-spin" /> : null}
        Manage billing
      </Button>

      {cancelAtPeriodEnd ? (
        <Button
          disabled={pending !== null}
          onClick={() => run("restore", () => restoreMySubscription())}
        >
          {pending === "restore" ? <Loader2 className="animate-spin" /> : null}
          Resume subscription
        </Button>
      ) : (
        <Button
          variant="ghost"
          disabled={pending !== null}
          onClick={() =>
            run("cancel", () => cancelMySubscription("/dashboard/billing"))
          }
        >
          {pending === "cancel" ? <Loader2 className="animate-spin" /> : null}
          Cancel subscription
        </Button>
      )}
    </div>
  );
}
