import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { and, eq } from "drizzle-orm";

import { db, document, embedding } from "@/db";
import {
  embedTexts,
  isEmbeddingsConfigured,
  storeDocumentChunks,
} from "@/lib/ai/embeddings";

import { DocumentError } from "./errors";
import { failDocument } from "./process";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

/** Idempotency: only a document that finished extraction can be claimed. */
export async function claimForEmbedding(documentId: string) {
  const [row] = await db
    .update(document)
    .set({ status: "embedding" })
    .where(and(eq(document.id, documentId), eq(document.status, "extracted")))
    .returning({ id: document.id });

  return Boolean(row);
}

/**
 * Embedding stage: reads the text an earlier extraction stored and turns it
 * into vectors. It never touches the uploaded file, so it can run long after
 * the upload has been deleted.
 */
export async function embedExtractedDocument(documentId: string) {
  const [doc] = await db
    .select({
      id: document.id,
      content: document.content,
      organizationId: document.organizationId,
    })
    .from(document)
    .where(eq(document.id, documentId))
    .limit(1);

  if (!doc) {
    throw new DocumentError("PROCESSING_FAILED", "Document not found.");
  }

  try {
    const text = doc.content.trim();

    if (!text) {
      throw new DocumentError(
        "EMPTY_DOCUMENT",
        "This document has no extracted text to embed.",
      );
    }

    if (!isEmbeddingsConfigured()) {
      // The text stays in place; adding the key and retrying indexes it.
      const message =
        "Text was extracted and saved, but embeddings are unavailable (OPENAI_API_KEY is missing). Add the key, then retry to index this document.";

      await db
        .update(document)
        .set({ status: "failed", errorText: message })
        .where(eq(document.id, doc.id));

      return {
        documentId: doc.id,
        failed: true,
        code: "EMBEDDINGS_NOT_CONFIGURED",
        message,
      };
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });
    const chunks = (await splitter.splitText(text)).filter(
      (chunk) => chunk.trim().length > 0,
    );

    const vectors = await embedTexts(chunks);

    if (vectors.length !== chunks.length) {
      throw new Error(
        `Expected ${chunks.length} vectors but got ${vectors.length}.`,
      );
    }

    // Delete, re-insert and the status change commit together. Previously a
    // failure between the delete and the insert left the document with no
    // vectors at all while claiming to be fine.
    const stored = await db.transaction(async (tx) => {
      await tx.delete(embedding).where(eq(embedding.documentId, doc.id));

      const rows = await storeDocumentChunks(
        {
          organizationId: doc.organizationId,
          documentId: doc.id,
          chunks,
          vectors,
        },
        tx,
      );

      await tx
        .update(document)
        .set({ status: "ready", errorText: null, processedAt: new Date() })
        .where(eq(document.id, doc.id));

      return rows;
    });

    return { documentId: doc.id, chunks: stored.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (error instanceof DocumentError && !error.retryable) {
      await failDocument(doc.id, message);

      return {
        documentId: doc.id,
        failed: true,
        code: error.code,
        message,
      };
    }

    // Transient: surface the message while Inngest retries.
    await db
      .update(document)
      .set({ errorText: message.slice(0, 500) })
      .where(eq(document.id, doc.id));

    throw error;
  }
}
