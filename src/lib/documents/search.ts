import { and, eq, sql } from "drizzle-orm";

import { db, document, embedding } from "@/db";
import { embedText } from "@/lib/ai/embeddings";

export type RetrievedChunk = {
  documentId: string;
  fileName: string | null;
  chunkIndex: number;
  content: string;
  /** Cosine distance: 0 is identical, 2 is opposite. */
  distance: number;
};

/** Human-readable citation label, e.g. `policy.pdf #2`. */
export function chunkLabel(chunk: {
  fileName: string | null;
  chunkIndex: number;
}) {
  return `${chunk.fileName ?? "document"} #${chunk.chunkIndex + 1}`;
}

/**
 * Nearest-neighbour search over one organization's vectors. Scoped by
 * `organizationId` so a widget can never read another workspace's documents.
 */
export async function searchChunks(input: {
  organizationId: string;
  question: string;
  limit?: number;
  /** Drop weak matches before they reach the model. */
  maxDistance?: number;
}): Promise<RetrievedChunk[]> {
  const limit = input.limit ?? 5;
  const maxDistance = input.maxDistance ?? Number.POSITIVE_INFINITY;
  const vector = await embedText(input.question);
  const distance = sql<number>`${embedding.embedding} <=> ${JSON.stringify(vector)}::vector`;

  const rows = await db
    .select({
      documentId: embedding.documentId,
      fileName: document.fileName,
      chunkIndex: embedding.chunkIndex,
      content: embedding.content,
      distance,
    })
    .from(embedding)
    .innerJoin(document, eq(embedding.documentId, document.id))
    .where(eq(embedding.organizationId, input.organizationId))
    // Ordered by the index so pgvector can use the HNSW scan. Over-fetch before
    // filtering: the distance cut below would otherwise discard weak matches at
    // the expense of relevant ones that ranked just behind them.
    .orderBy(distance)
    .limit(limit * 4);

  return rows.filter((row) => row.distance <= maxDistance).slice(0, limit);
}

/** Indexed document names, used to explain what the assistant can help with. */
export async function listIndexedDocumentNames(
  organizationId: string,
  limit = 10,
) {
  return (await listIndexedDocuments(organizationId, limit)).map(
    (entry) => entry.fileName,
  );
}

/**
 * Indexed documents with a short opening excerpt. Used to answer "what can you
 * do?" from what the workspace actually contains rather than from the model.
 */
export async function listIndexedDocuments(
  organizationId: string,
  limit = 8,
): Promise<{ fileName: string; excerpt: string }[]> {
  const rows = await db
    .select({
      fileName: document.fileName,
      excerpt: sql<string>`left(${document.content}, 400)`,
    })
    .from(document)
    .where(
      and(
        eq(document.organizationId, organizationId),
        eq(document.status, "ready"),
      ),
    )
    .limit(limit);

  return rows.map((row) => ({
    fileName: row.fileName ?? "document",
    excerpt: (row.excerpt ?? "").replace(/\s+/g, " ").trim(),
  }));
}
