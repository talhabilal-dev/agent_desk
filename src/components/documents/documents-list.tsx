"use client";

import { ChevronRight, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { RefreshWhileProcessing } from "@/components/refresh-while-processing";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { retryDocument } from "@/lib/documents/client";
import type { DocumentStatus } from "@/lib/documents/service";
import { isStalled, isTerminal } from "@/utils/documents";
import { errorMessage } from "@/utils/error";
import { formatBytes } from "@/utils/format";

export type DocumentRow = {
  id: string;
  fileName: string | null;
  status: DocumentStatus;
  type: "raw_text" | "structured_text";
  pageCount: number | null;
  errorText: string | null;
  sizeBytes: number | null;
  updatedAt: Date | string;
};

const STATUS_STYLES: Record<DocumentStatus, string> = {
  pending: "border-white/10 bg-white/5 text-muted-foreground",
  processing: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  extracted: "border-indigo-400/20 bg-indigo-400/10 text-indigo-300",
  embedding: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  ready: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function DocumentsList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet — upload one to get started.
      </p>
    );
  }

  const active = documents.some((document) => !isTerminal(document.status));

  return (
    <>
      {/* Refreshes while anything is still being processed, so a finished
          document never keeps showing "processing" until a manual reload. */}
      <RefreshWhileProcessing active={active} />
      <ul className="flex flex-col divide-y divide-white/5">
        {documents.map((document) => (
          <DocumentItem key={document.id} document={document} />
        ))}
      </ul>
    </>
  );
}

function DocumentItem({ document }: { document: DocumentRow }) {
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  // Computed after mount: calling Date.now() during render made the server and
  // client passes disagree near the staleness boundary, and never re-evaluated.
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    setCanRetry(
      document.status === "failed" ||
        document.status === "extracted" ||
        isStalled(document.status, document.updatedAt),
    );
  }, [document.status, document.updatedAt]);

  function retry() {
    startRetry(async () => {
      try {
        await retryDocument(document.id);
        toast.add({ type: "success", title: "Queued for another attempt." });
        router.refresh();
      } catch (error) {
        toast.add({
          type: "error",
          title: "Retry failed",
          description: errorMessage(error),
        });
      }
    });
  }

  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <FileText className="size-4 shrink-0 text-muted-foreground" />

        <Link
          href={`/dashboard/documents/${document.id}`}
          className="flex min-w-0 flex-1 items-center gap-1 text-sm font-medium hover:underline"
        >
          <span className="truncate">{document.fileName ?? "Untitled"}</span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        </Link>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[document.status]}`}
        >
          {document.status}
        </span>

        {canRetry ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isRetrying}
            // Every row had the same accessible name, so a screen reader listed
            // N identical "Retry" buttons with no way to tell them apart.
            aria-label={`Retry ${document.fileName ?? "document"}`}
            onClick={retry}
          >
            {isRetrying ? <Loader2 className="animate-spin" /> : null}
            Retry
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 pl-7 text-xs text-muted-foreground">
        {document.sizeBytes ? (
          <span>{formatBytes(document.sizeBytes)}</span>
        ) : null}
        {document.pageCount ? (
          <span>
            {document.pageCount} page{document.pageCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {document.status === "ready" ? (
          <span>
            {document.type === "structured_text" ? "text layer" : "OCR"}
          </span>
        ) : null}
      </div>

      {document.errorText ? (
        <p className="pl-7 text-xs break-words text-destructive">
          {document.errorText}
        </p>
      ) : null}
    </li>
  );
}
