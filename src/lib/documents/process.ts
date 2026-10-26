import { and, eq } from "drizzle-orm";

import { db, document, organization } from "@/db";
import { type Entitlements, getEntitlements } from "@/lib/billing/entitlements";

import { DocumentError } from "./errors";
import { ocrImages, validateImage } from "./image";
import { hasTextLayer, readPdf, renderPages } from "./pdf";
import { reservePages } from "./quota";
import { getFile, removeFile } from "./storage";

const MAX_OCR_PAGES = 20;

export type ClaimedDocument = typeof document.$inferSelect;

/**
 * Idempotency layer 2: only a `pending` document can be claimed, so a duplicate
 * or concurrent run updates zero rows and exits. Inngest memoizes completed
 * steps, so a retry of the same run resumes after this point rather than
 * re-claiming.
 */
export async function claimDocument(documentId: string) {
  const [row] = await db
    .update(document)
    .set({ status: "processing", errorText: null })
    .where(and(eq(document.id, documentId), eq(document.status, "pending")))
    .returning();

  return row ?? null;
}

/** Marks the document failed and drops the temp file (no retries remain). */
export async function failDocument(documentId: string, message: string) {
  // Read the key before clearing it: RETURNING yields the *new* row, so the
  // delete below would have nothing to work with.
  const [existing] = await db
    .select({ sourceKey: document.sourceKey })
    .from(document)
    .where(eq(document.id, documentId))
    .limit(1);

  await db
    .update(document)
    .set({
      status: "failed",
      errorText: message.slice(0, 500),
      sourceKey: null,
    })
    .where(eq(document.id, documentId));

  if (existing?.sourceKey) {
    await removeFile(existing.sourceKey);
  }
}

async function getOwnerId(organizationId: string) {
  const [row] = await db
    .select({ ownerId: organization.ownerId })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!row) {
    throw new DocumentError("PROCESSING_FAILED", "Organization not found.");
  }

  return row.ownerId;
}

async function extract(doc: ClaimedDocument): Promise<Extracted> {
  if (!doc.sourceKey) {
    throw new DocumentError(
      "FILE_MISSING",
      "The uploaded file is no longer available.",
    );
  }

  if (!doc.mimeType) {
    throw new DocumentError("UNSUPPORTED_TYPE", "Unknown file type.");
  }

  const ownerId = await getOwnerId(doc.organizationId);
  const entitlements = await getEntitlements(ownerId);

  let bytes: Buffer;

  try {
    bytes = await getFile(doc.sourceKey);
  } catch {
    // A raw ENOENT would be treated as transient and retried; the file is
    // genuinely gone (ephemeral storage), so fail fast with a clear message.
    throw new DocumentError(
      "FILE_MISSING",
      "The uploaded file is no longer available. Upload it again.",
    );
  }

  function requireOcr() {
    if (!entitlements.ocr) {
      throw new DocumentError(
        "OCR_NOT_IN_PLAN",
        "This file has no readable text layer, and OCR is only available on the Pro and Scale plans.",
      );
    }
  }

  if (doc.mimeType === "application/pdf") {
    const { totalPages, text } = await readPdf(bytes);

    if (hasTextLayer(text)) {
      return {
        ownerId,
        text,
        pageCount: totalPages,
        type: "structured_text" as const,
        entitlements,
      };
    }

    requireOcr();

    if (totalPages > MAX_OCR_PAGES) {
      throw new DocumentError(
        "PROCESSING_FAILED",
        `Scanned PDFs are limited to ${MAX_OCR_PAGES} pages (this one has ${totalPages}).`,
      );
    }

    const images = await renderPages(bytes, totalPages, MAX_OCR_PAGES);

    for (const image of images) {
      await validateImage(image);
    }

    const pages = await ocrImages(images);

    return {
      ownerId,
      text: pages.join("\n\n"),
      pageCount: images.length,
      type: "raw_text" as const,
      entitlements,
    };
  }

  if (doc.mimeType.startsWith("image/")) {
    await validateImage(bytes);
    requireOcr();

    const [text] = await ocrImages([bytes]);

    return {
      ownerId,
      text: text ?? "",
      pageCount: 1,
      type: "raw_text" as const,
      entitlements,
    };
  }

  throw new DocumentError(
    "UNSUPPORTED_TYPE",
    `Unsupported file type: ${doc.mimeType}.`,
  );
}

type Extracted = {
  ownerId: string;
  text: string;
  pageCount: number;
  type: "raw_text" | "structured_text";
  entitlements: Entitlements;
};

/** Extraction stage: produces the text, stores it, and marks the row `extracted`. */
export async function processClaimedDocument(documentId: string) {
  // Re-read rather than accepting the claimed row: Inngest serializes step
  // results (Dates become strings), so the row must be fetched fresh.
  const [doc] = await db
    .select()
    .from(document)
    .where(eq(document.id, documentId))
    .limit(1);

  if (!doc) {
    throw new DocumentError("PROCESSING_FAILED", "Document not found.");
  }

  try {
    // Extraction already done (e.g. a duplicate ingest event): nothing to do
    // but hand off to the embedding stage.
    if (doc.content.trim().length > 0) {
      await db
        .update(document)
        .set({ status: "extracted" })
        .where(eq(document.id, doc.id));

      return {
        documentId: doc.id,
        pageCount: doc.pageCount ?? 0,
        status: "extracted" as const,
      };
    }

    const extracted = await extract(doc);
    const text = extracted.text.trim();

    if (!text) {
      throw new DocumentError(
        "EMPTY_DOCUMENT",
        "No text could be extracted from this document.",
      );
    }

    // Reserve once per document: a retried run sees `pageCount` already set,
    // so pages are never double-charged.
    if (doc.pageCount === null) {
      await reservePages(
        extracted.ownerId,
        extracted.pageCount,
        extracted.entitlements.pages,
      );
    }

    // Persist the text and drop the source file before handing off: the
    // embedding stage reads from the database, never from the upload.
    await db
      .update(document)
      .set({
        content: text,
        type: extracted.type,
        pageCount: extracted.pageCount,
        processedAt: new Date(),
        status: "extracted",
        errorText: null,
        sourceKey: null,
      })
      .where(eq(document.id, doc.id));

    if (doc.sourceKey) {
      await removeFile(doc.sourceKey);
    }

    return {
      documentId: doc.id,
      pageCount: extracted.pageCount,
      status: "extracted" as const,
    };
  } catch (error) {
    // Permanent rejections are recorded once; transient ones bubble up so
    // Inngest retries and `onFailure` records the final message.
    if (error instanceof DocumentError && !error.retryable) {
      await failDocument(doc.id, error.message);

      return {
        documentId: doc.id,
        failed: true,
        code: error.code,
        message: error.message,
      };
    }

    throw error;
  }
}
