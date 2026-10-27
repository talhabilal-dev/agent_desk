"use client";

import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { OriginsField } from "@/components/widgets/origins-field";
import { ThemeFields, WidgetPreview } from "@/components/widgets/theme-fields";
import type { WidgetThemeInput } from "@/lib/validations/widget";
import {
  deleteWidget,
  rotateWidgetKey,
  updateWidget,
} from "@/lib/widgets/client";
import { errorMessage } from "@/utils/error";
import { parseOriginLines } from "@/utils/origins";

export type WidgetItem = WidgetThemeInput & {
  id: string;
  name: string;
  publicKey: string;
  organizationName: string;
  allowedOrigins: string[];
};

function maskKey(publicKey: string) {
  return `${publicKey.slice(0, 8)}${"•".repeat(8)}${publicKey.slice(-4)}`;
}

function swatch(color: string) {
  return (
    <span
      key={color}
      className="size-3 rounded-full border border-white/10"
      style={{ backgroundColor: color }}
    />
  );
}

export function WidgetList({ widgets }: { widgets: WidgetItem[] }) {
  if (widgets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No widgets yet — create one to get an embed key.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {widgets.map((widget) => (
        <WidgetRow key={widget.id} widget={widget} />
      ))}
    </ul>
  );
}

function WidgetRow({ widget }: { widget: WidgetItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [confirming, setConfirming] = useState<"rotate" | "delete" | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<
    "save" | "rotate" | "delete" | null
  >(null);
  const [, startTransition] = useTransition();
  const [theme, setTheme] = useState<WidgetThemeInput>({
    primaryColor: widget.primaryColor,
    backgroundColor: widget.backgroundColor,
    textColor: widget.textColor,
    position: widget.position,
    panelWidth: widget.panelWidth,
    panelHeight: widget.panelHeight,
    title: widget.title,
    welcomeMessage: widget.welcomeMessage,
  });
  const [originsText, setOriginsText] = useState(
    widget.allowedOrigins.join("\n"),
  );
  const [origin, setOrigin] = useState("");

  // The embedding host is only known once mounted.
  useEffect(() => setOrigin(window.location.origin), []);

  const configUrl = `/api/widget/${widget.publicKey}/config`;
  const snippet = `<script src="${origin || "https://your-agentdesk-host"}/embed.js"\n        data-agentdesk-key="${widget.publicKey}"\n        async></script>`;

  function run(
    action: "save" | "rotate" | "delete",
    task: () => Promise<void>,
  ) {
    setPendingAction(action);

    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (error) {
        toast.add({
          type: "error",
          title:
            action === "rotate"
              ? "Could not rotate key"
              : action === "delete"
                ? "Could not delete widget"
                : "Could not save widget",
          description: errorMessage(error),
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.add({ type: "success", title: `${label} copied.` });
    } catch {
      toast.add({
        type: "error",
        title: "Clipboard unavailable",
        description: "Select and copy it manually.",
      });
    }
  }

  if (isEditing) {
    return (
      <li className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Editing &ldquo;{widget.name}&rdquo;
            </span>
            <span className="text-xs text-muted-foreground">
              Changes apply everywhere this widget is embedded.
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel editing"
            disabled={pendingAction === "save"}
            onClick={() => setIsEditing(false)}
          >
            <X />
          </Button>
        </div>

        {/* Form on the left, live preview pinned beside it on the right. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex flex-col gap-6">
            <ThemeFields
              theme={theme}
              disabled={pendingAction === "save"}
              onChange={setTheme}
            />

            <OriginsField
              value={originsText}
              disabled={pendingAction === "save"}
              onChange={setOriginsText}
            />
          </div>

          <div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Preview
            </span>
            <WidgetPreview theme={theme} />

            <Button
              type="button"
              className="w-full"
              disabled={pendingAction === "save"}
              onClick={() =>
                run("save", async () => {
                  await updateWidget(widget.id, {
                    ...theme,
                    allowedOrigins: parseOriginLines(originsText),
                  });
                  toast.add({ type: "success", title: "Widget updated." });
                  setIsEditing(false);
                })
              }
            >
              {pendingAction === "save" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              Save changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={pendingAction === "save"}
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{widget.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {widget.organizationName} · {widget.position}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {[widget.primaryColor, widget.backgroundColor, widget.textColor].map(
            swatch,
          )}
        </div>

        {confirming === null ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${widget.name}`}
              onClick={() => setIsEditing(true)}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Rotate key for ${widget.name}`}
              onClick={() => setConfirming("rotate")}
            >
              <RefreshCw />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${widget.name}`}
              onClick={() => setConfirming("delete")}
            >
              <Trash2 />
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-destructive">
              {confirming === "rotate"
                ? "Old key stops working?"
                : "Delete for good?"}
            </span>
            <Button
              variant={confirming === "delete" ? "destructive" : "secondary"}
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => {
                if (confirming === "delete") {
                  run("delete", async () => {
                    await deleteWidget(widget.id);
                    toast.add({ type: "success", title: "Widget deleted." });
                    setConfirming(null);
                  });

                  return;
                }

                run("rotate", async () => {
                  const { publicKey } = await rotateWidgetKey(widget.id);
                  setIsRevealed(true);
                  toast.add({
                    type: "success",
                    title: "New key issued.",
                    description: publicKey,
                  });
                  setConfirming(null);
                });
              }}
            >
              {pendingAction === confirming ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel"
              disabled={pendingAction !== null}
              onClick={() => setConfirming(null)}
            >
              <X />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 font-mono text-xs">
          {isRevealed ? widget.publicKey : maskKey(widget.publicKey)}
        </code>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isRevealed ? "Hide key" : "Reveal key"}
          onClick={() => setIsRevealed((value) => !value)}
        >
          {isRevealed ? <EyeOff /> : <Eye />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy key"
          onClick={() => copy(widget.publicKey, "Widget key")}
        >
          <Copy />
        </Button>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Embed in any web app
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Paste this before <code>&lt;/body&gt;</code> on any site — plain
            HTML, React, Next.js or Vue. The key is publishable: it can only
            read this widget&apos;s theme and start chats.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] p-3 font-mono text-xs">
            {snippet}
          </pre>
          <p className="text-xs text-muted-foreground">
            {widget.allowedOrigins.length === 0
              ? "Allowed origins: any site. Add domains above once you know them."
              : `Allowed origins: ${widget.allowedOrigins.join(", ")}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-fit"
              onClick={() => copy(snippet, "Embed snippet")}
            >
              <Copy />
              Copy snippet
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => copy(configUrl, "Config URL")}
            >
              <Copy />
              Copy config URL
            </Button>
          </div>
        </div>
      </details>
    </li>
  );
}
