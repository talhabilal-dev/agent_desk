import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DocumentsList } from "@/components/documents/documents-list";
import { Pagination } from "@/components/documents/pagination";
import { UploadForm } from "@/components/documents/upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  countDocumentsForOwner,
  listDocumentsForOwner,
} from "@/lib/documents/service";
import { listOrganizations } from "@/lib/organizations/service";
import { getSession } from "@/lib/session";

const PAGE_SIZE = 10;

export const metadata = {
  title: "Documents",
};

export default function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <Suspense fallback={<DocumentsSkeleton />}>
      <DocumentsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DocumentsContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const requested = Number.parseInt((await searchParams).page ?? "1", 10);
  const total = await countDocumentsForOwner(session.user.id);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(
    Math.max(1, Number.isFinite(requested) ? requested : 1),
    totalPages,
  );

  const [organizations, documents] = await Promise.all([
    listOrganizations(session.user.id),
    listDocumentsForOwner(session.user.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload a PDF or image. Text is extracted, OCR&apos;d when there is no
          text layer, then chunked and embedded.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-white/5 bg-white/[0.02] ring-0">
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <CardDescription>
              PDF, PNG, JPEG or WebP up to 20 MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm
              organizations={organizations.map(({ id, name }) => ({
                id,
                name,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="border border-white/5 bg-white/[0.02] ring-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Your documents</CardTitle>
            <CardDescription>
              {total === 0
                ? "Nothing processed yet."
                : `${total} document${total === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentsList
              documents={documents.map((doc) => ({
                id: doc.id,
                fileName: doc.fileName,
                status: doc.status,
                type: doc.type,
                pageCount: doc.pageCount,
                errorText: doc.errorText,
                sizeBytes: doc.sizeBytes,
                updatedAt: doc.updatedAt,
              }))}
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              basePath="/dashboard/documents"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DocumentsSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full lg:col-span-2" />
      </div>
    </>
  );
}
