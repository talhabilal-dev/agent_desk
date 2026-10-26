import { and, count, desc, eq } from "drizzle-orm";

import { db, document, embedding, organization } from "@/db";
import type { DocumentStatus } from "@/utils/documents";

/** Columns safe to expose to the client (never `sourceKey`). */
export const DOCUMENT_SUMMARY_COLUMNS = {
  id: document.id,
  organizationId: document.organizationId,
  fileName: document.fileName,
  status: document.status,
  type: document.type,
  pageCount: document.pageCount,
  errorText: document.errorText,
  mimeType: document.mimeType,
  sizeBytes: document.sizeBytes,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  processedAt: document.processedAt,
};

export type { DocumentStatus } from "@/utils/documents";

export type DocumentSummary = {
  id: string;
  organizationId: string;
  fileName: string | null;
  status: DocumentStatus;
  type: "raw_text" | "structured_text";
  pageCount: number | null;
  errorText: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
};

const OWNED_BY = (ownerId: string) => eq(organization.ownerId, ownerId);

/** One page of documents across every organization owned by `ownerId`. */
export async function listDocumentsForOwner(
  ownerId: string,
  options: { limit?: number; offset?: number } = {},
) {
  return db
    .select(DOCUMENT_SUMMARY_COLUMNS)
    .from(document)
    .innerJoin(organization, eq(document.organizationId, organization.id))
    .where(OWNED_BY(ownerId))
    .orderBy(desc(document.createdAt))
    .limit(options.limit ?? 10)
    .offset(options.offset ?? 0);
}

export async function countDocumentsForOwner(ownerId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(document)
    .innerJoin(organization, eq(document.organizationId, organization.id))
    .where(OWNED_BY(ownerId));

  return row?.value ?? 0;
}

/** A single document with its extracted text, scoped to its owner. */
export async function getDocumentForOwner(ownerId: string, documentId: string) {
  const [row] = await db
    .select({
      ...DOCUMENT_SUMMARY_COLUMNS,
      organizationName: organization.name,
      content: document.content,
      contentHash: document.contentHash,
    })
    .from(document)
    .innerJoin(organization, eq(document.organizationId, organization.id))
    .where(and(eq(document.id, documentId), OWNED_BY(ownerId)))
    .limit(1);

  return row ?? null;
}

export async function countEmbeddings(documentId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(embedding)
    .where(eq(embedding.documentId, documentId));

  return row?.value ?? 0;
}
