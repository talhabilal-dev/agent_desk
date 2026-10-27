import { and, eq } from "drizzle-orm";

import { db, document, organization } from "@/db";
import { type Entitlements, getEntitlements } from "@/lib/billing/entitlements";

import { DocumentError } from "./errors";
import { ocrImages, validateImage } from "./image";
import {
  hasTextLayer,
  MAX_PAGES_PER_DOCUMENT,
  readPdf,
  renderPages,
} from "./pdf";
import { reservePages } from "./quota";
import { getFile, removeFile, StorageObjectMissingError } from "./storage";

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

/** Marks the document failed. The uploaded object is kept so Retry can use it. */
export async function failDocument(documentId: string, message: string) {
  await db
    .update(document)
    .set({
      status: "failed",
      errorText: message.slice(0, 500),
    })
    .where(eq(document.id, documentId));
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

  let fileBuffer: Buffer;

  try {
    fileBuffer = await getFile(doc.sourceKey);
  } catch (error) {
    // Only a genuinely missing object is permanent. Throttling and transient
    // storage errors must stay retryable, or a `503 SlowDown` from the bucket
    // would fail a perfectly good document.
    if (error instanceof StorageObjectMissingError) {
      throw new DocumentError(
        "FILE_MISSING",
        "The uploaded file is no longer available. Upload it again.",
      );
    }

    throw error;
  }

  // pdf.js rejects Node Buffers outright ("Please provide binary data as
  // `Uint8Array`, rather than `Buffer`"), and a Buffer's ArrayBuffer comes from
  // a shared pool that pdf.js may transfer. So copy into a plain Uint8Array for
  // everything routed through unpdf; sharp/tesseract keep the Buffer.
  const bytes = new Uint8Array(fileBuffer);

  function requireOcr() {
    if (!entitlements.ocr) {
      throw new DocumentError(
        "OCR_NOT_IN_PLAN",
        "This file has no readable text layer, and OCR is only available on the Pro and Scale plans.",
      );
    }
  }

  if (doc.mimeType === "application/pdf") {
    // Only the first pages are processed; long documents are truncated rather
    // than rejected, and `totalPageCount` records what was skipped.
    const { totalPages, processedPages, text } = await readPdf(
      bytes,
      MAX_PAGES_PER_DOCUMENT,
    );

    if (hasTextLayer(text, processedPages)) {
      return {
        ownerId,
        text,
        pageCount: processedPages,
        totalPageCount: totalPages,
        type: "structured_text" as const,
        entitlements,
      };
    }

    requireOcr();

    let images: Buffer[];

    try {
      // A fresh copy: pdf.js detaches the buffer it is given, and `bytes` was
      // already consumed by readPdf above. Reusing it is what made scanned
      // PDFs fail with "Cannot transfer object of unsupported type".
      images = await renderPages(
        new Uint8Array(fileBuffer),
        totalPages,
        MAX_PAGES_PER_DOCUMENT,
      );
    } catch (error) {
      // pdf.js renders through a fake worker that transfers buffers, which Node
      // rejects in some runtimes. Surface it as an actionable message instead of
      // a bare DataCloneError.
      throw new DocumentError(
        "PROCESSING_FAILED",
        `This PDF has no text layer and its pages could not be rendered for OCR (${(error as Error).message}). Upload the pages as images instead.`,
      );
    }

    for (const image of images) {
      await validateImage(image);
    }

    const pages = await ocrImages(images);

    return {
      ownerId,
      text: pages.join("\n\n"),
      pageCount: images.length,
      totalPageCount: totalPages,
      type: "raw_text" as const,
      entitlements,
    };
  }

  if (doc.mimeType.startsWith("image/")) {
    await validateImage(fileBuffer);
    requireOcr();

    const [text] = await ocrImages([fileBuffer]);

    return {
      ownerId,
      text: text ?? "",
      pageCount: 1,
      totalPageCount: 1,
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
  /** Pages actually processed (capped at `MAX_PAGES_PER_DOCUMENT`). */
  pageCount: number;
  /** Pages the document really has. */
  totalPageCount: number;
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

    // Reserve and persist in one transaction. These used to be separate
    // statements, so a failure after the reservation left `pageCount` null and
    // the next retry passed the guard below and charged the pages a second time.
    await db.transaction(async (tx) => {
      if (doc.pageCount === null) {
        await reservePages(
          tx,
          extracted.ownerId,
          extracted.pageCount,
          extracted.entitlements.pages,
        );
      }

      await tx
        .update(document)
        .set({
          content: text,
          type: extracted.type,
          pageCount: extracted.pageCount,
          totalPageCount: extracted.totalPageCount,
          processedAt: new Date(),
          status: "extracted",
          errorText: null,
          sourceKey: null,
        })
        .where(eq(document.id, doc.id));
    });

    if (doc.sourceKey) {
      await removeFile(doc.sourceKey);
    }

    return {
      documentId: doc.id,
      pageCount: extracted.pageCount,
      status: "extracted" as const,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Permanent rejections are recorded once.
    if (error instanceof DocumentError && !error.retryable) {
      await failDocument(doc.id, message);

      return {
        documentId: doc.id,
        failed: true,
        code: error.code,
        message,
      };
    }

    // Transient: record the message so the UI can show it while Inngest
    // retries, then rethrow.
    await db
      .update(document)
      .set({ errorText: message.slice(0, 500) })
      .where(eq(document.id, doc.id));

    throw error;
  }
}
