import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db, document, organization } from "@/db";
import { inngest } from "@/inngest/client";
import { getEntitlements } from "@/lib/billing/entitlements";
import { failDocument } from "@/lib/documents/process";
import { getUsedPages } from "@/lib/documents/quota";
import {
  DOCUMENT_SUMMARY_COLUMNS,
  listDocumentsForOwner,
} from "@/lib/documents/service";
import { putFile, removeFile } from "@/lib/documents/storage";
import { requireApiSession } from "@/lib/organizations/guard";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
} from "@/lib/validations/document";
import { organizationIdSchema } from "@/lib/validations/organization";
import { postgresErrorCode } from "@/utils/error";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  return Response.json(await listDocumentsForOwner(auth.session.user.id));
}

export async function POST(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const organizationId = String(form?.get("organizationId") ?? "");

  if (!(file instanceof File)) {
    return Response.json({ error: "Attach a file." }, { status: 400 });
  }

  if (!organizationIdSchema.safeParse(organizationId).success) {
    return Response.json({ error: "Choose an organization." }, { status: 400 });
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as never)) {
    return Response.json(
      { error: `Unsupported file type: ${file.type || "unknown"}.` },
      { status: 415 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `File is larger than ${MAX_UPLOAD_MB} MB.` },
      { status: 413 },
    );
  }

  const [owned] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(
      and(
        eq(organization.id, organizationId),
        eq(organization.ownerId, auth.session.user.id),
      ),
    )
    .limit(1);

  if (!owned) {
    return Response.json({ error: "Organization not found." }, { status: 404 });
  }

  // Reject before reading the file when the allowance is already spent.
  // Extraction is the expensive part — doing it only to fail on quota wastes a
  // worker slot and burns OCR/embedding time for nothing.
  const [entitlements, usedPages] = await Promise.all([
    getEntitlements(auth.session.user.id),
    getUsedPages(auth.session.user.id),
  ]);

  if (entitlements.pages - usedPages <= 0) {
    return Response.json(
      {
        error:
          "Your monthly page allowance is used up. Upgrade your plan to process more documents.",
        code: "PLAN_LIMIT_REACHED",
        limit: entitlements.pages,
      },
      { status: 402 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // Idempotency layer 1: identical bytes in the same org reuse the row, so the
  // same file is never scanned twice.
  const contentHash = createHash("sha256").update(bytes).digest("hex");

  const [existing] = await db
    .select(DOCUMENT_SUMMARY_COLUMNS)
    .from(document)
    .where(
      and(
        eq(document.organizationId, organizationId),
        eq(document.contentHash, contentHash),
      ),
    )
    .limit(1);

  if (existing && existing.status !== "failed") {
    return Response.json({ document: existing, reused: true });
  }

  // A failed document is re-processable. Reset it fully and re-queue rather
  // than returning a "reused" row that can never make progress (its temp file
  // is already gone).
  if (existing) {
    const retryKey = randomUUID();
    await putFile(retryKey, bytes);

    const [reset] = await db
      .update(document)
      .set({
        status: "pending",
        errorText: null,
        content: "",
        sourceKey: retryKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        pageCount: null,
        processedAt: null,
      })
      .where(eq(document.id, existing.id))
      .returning(DOCUMENT_SUMMARY_COLUMNS);

    try {
      await inngest.send({
        id: `document-${reset.id}-${Date.now()}`,
        name: "document/ingest.requested",
        data: { documentId: reset.id },
      });
    } catch (error) {
      const message =
        "Could not queue processing. Is the Inngest dev server running?";
      await failDocument(reset.id, message);
      console.error("[documents] failed to re-enqueue ingest", error);

      return Response.json({ error: message }, { status: 503 });
    }

    return Response.json({ document: reset, reused: false });
  }

  const sourceKey = randomUUID();
  await putFile(sourceKey, bytes);

  /**
   * Insert, or adopt the row a concurrent identical upload just created.
   *
   * The (organization_id, content_hash) unique index is the real guarantee; this
   * turns the resulting 23505 into an idempotent response instead of a 500, and
   * cleans up the object this request wrote so it does not leak.
   */
  const rows = await (async () => {
    try {
      return await db
        .insert(document)
        .values({
          organizationId,
          content: "",
          type: "raw_text",
          action: "ingest",
          status: "pending",
          sourceKey,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          contentHash,
        })
        .returning(DOCUMENT_SUMMARY_COLUMNS);
    } catch (error) {
      if (postgresErrorCode(error) !== "23505") {
        throw error;
      }

      await removeFile(sourceKey);

      return db
        .select(DOCUMENT_SUMMARY_COLUMNS)
        .from(document)
        .where(
          and(
            eq(document.organizationId, organizationId),
            eq(document.contentHash, contentHash),
          ),
        )
        .limit(1);
    }
  })();

  const created = rows[0];

  if (!created) {
    return Response.json(
      { error: "Could not store the document." },
      { status: 500 },
    );
  }

  try {
    await inngest.send({
      id: `document-${created.id}`,
      name: "document/ingest.requested",
      data: { documentId: created.id },
    });
  } catch (error) {
    const message =
      "Could not queue processing. Is the Inngest dev server running?";
    await failDocument(created.id, message);
    console.error("[documents] failed to enqueue ingest", error);

    return Response.json({ error: message }, { status: 503 });
  }

  return Response.json({ document: created, reused: false }, { status: 201 });
}
