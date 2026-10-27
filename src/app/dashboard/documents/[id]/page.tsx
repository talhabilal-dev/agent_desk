import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  countEmbeddings,
  type DocumentStatus,
  getDocumentForOwner,
} from "@/lib/documents/service";
import { getSession } from "@/lib/session";
import { formatBytes } from "@/utils/format";

/**
 * Content is driven by a URL param, so there is no meaningful static shell
 * (the dashboard layout also reads `usePathname`). Opt into a blocking route
 * rather than inventing a placeholder document.
 */
export const instant = false;

type StepState = "done" | "active" | "pending" | "failed" | "idle";

const STEP_ICONS: Record<StepState, React.ReactNode> = {
  done: <CheckCircle2 className="size-4 text-emerald-400" />,
  active: <Loader2 className="size-4 animate-spin text-cyan-400" />,
  pending: <CircleDashed className="size-4 text-muted-foreground" />,
  idle: <CircleDashed className="size-4 text-muted-foreground/50" />,
  failed: <XCircle className="size-4 text-destructive" />,
};

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetailContent params={params} />
    </Suspense>
  );
}

async function DetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const doc = await getDocumentForOwner(session.user.id, id);

  if (!doc) {
    notFound();
  }

  const embeddings = await countEmbeddings(doc.id);
  const hasText = doc.content.trim().length > 0;
  const isFailed = doc.status === "failed";

  const extractionState: StepState = hasText
    ? "done"
    : isFailed
      ? "failed"
      : doc.status === "processing"
        ? "active"
        : "pending";

  const embeddingState: StepState =
    doc.status === "ready"
      ? "done"
      : doc.status === "embedding"
        ? "active"
        : isFailed && hasText
          ? "failed"
          : hasText
            ? "pending"
            : "idle";

  const steps: { label: string; state: StepState; detail: string }[] = [
    {
      label: "Uploaded",
      state: "done",
      detail: formatDate(doc.createdAt),
    },
    {
      label: "Text extracted",
      state: extractionState,
      detail: hasText
        ? `${doc.pageCount ?? 0} page${doc.pageCount === 1 ? "" : "s"}${
            doc.totalPageCount &&
            doc.pageCount &&
            doc.totalPageCount > doc.pageCount
              ? ` of ${doc.totalPageCount} (10-page limit per document)`
              : ""
          } · ${doc.content.length.toLocaleString()} characters`
        : "Waiting for extraction",
    },
    {
      label: "Embeddings stored",
      state: embeddingState,
      detail:
        embeddings > 0
          ? `${embeddings} vector${embeddings === 1 ? "" : "s"}`
          : hasText
            ? "No vectors yet"
            : "Waiting for text",
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/documents"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} self-start`}
        >
          <ArrowLeft />
          All documents
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight break-all">
            {doc.fileName ?? "Untitled"}
          </h1>
          <StatusBadge status={doc.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {doc.organizationName} · uploaded {formatDate(doc.createdAt)}
        </p>
      </div>

      {doc.errorText ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {doc.errorText}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-white/5 bg-white/[0.02] ring-0">
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
            <CardDescription>
              Each document runs through two stages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-4">
              {steps.map((step) => (
                <li key={step.label} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    {STEP_ICONS[step.state]}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{step.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {step.detail}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="border border-white/5 bg-white/[0.02] ring-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Extracted text is what gets chunked and embedded.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Meta
                label="Pages"
                value={
                  doc.pageCount === null
                    ? "—"
                    : doc.totalPageCount &&
                        doc.pageCount &&
                        doc.totalPageCount > doc.pageCount
                      ? `${doc.pageCount} of ${doc.totalPageCount}`
                      : doc.pageCount
                }
              />
              <Meta
                label="Size"
                value={doc.sizeBytes ? formatBytes(doc.sizeBytes) : "—"}
              />
              <Meta label="Source" value={doc.mimeType ?? "—"} />
              <Meta
                label="Text type"
                value={doc.type === "structured_text" ? "text layer" : "OCR"}
              />
              <Meta label="Vectors" value={embeddings} />
              <Meta
                label="Processed"
                value={doc.processedAt ? formatDate(doc.processedAt) : "—"}
              />
            </dl>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Extracted text</span>
              {hasText ? (
                <pre className="max-h-96 overflow-auto rounded-lg border border-white/5 bg-black/20 p-3 font-mono text-xs whitespace-pre-wrap">
                  {doc.content}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing extracted yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles: Record<DocumentStatus, string> = {
    pending: "border-white/10 bg-white/5 text-muted-foreground",
    processing: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    extracted: "border-indigo-400/20 bg-indigo-400/10 text-indigo-300",
    embedding: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    ready: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    failed: "border-destructive/30 bg-destructive/10 text-destructive",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function formatDate(value: Date) {
  return value.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="h-6 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full lg:col-span-2" />
      </div>
    </>
  );
}
