import { OpenAIEmbeddings } from "@langchain/openai";

import { db, embedding } from "@/db";
import { EMBEDDING_DIMENSIONS } from "@/db/app-schema";

/**
 * `text-embedding-3-small` is 1536 dimensions, which matches the pgvector
 * column. `dimensions` is pinned explicitly so swapping the model can never
 * silently produce vectors the column would reject.
 */
const EMBEDDING_MODEL = "text-embedding-3-small";

let client: OpenAIEmbeddings | null = null;

export function isEmbeddingsConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  client ??= new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    batchSize: 96,
  });

  return client;
}

function assertDimensions(vector: number[]) {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding has ${vector.length} dimensions but the vector column expects ${EMBEDDING_DIMENSIONS}.`,
    );
  }

  return vector;
}

/** Embeds a single piece of text (e.g. a search query). */
export async function embedText(text: string) {
  const value = text.trim();

  if (!value) {
    throw new Error("Cannot embed empty text.");
  }

  return assertDimensions(await getClient().embedQuery(value));
}

/** Embeds many texts in batched requests. Blank entries are dropped. */
export async function embedTexts(texts: string[]) {
  const values = texts.map((text) => text.trim()).filter(Boolean);

  if (values.length === 0) {
    return [];
  }

  return (await getClient().embedDocuments(values)).map(assertDimensions);
}

/**
 * Embeds pre-chunked text and stores one vector per chunk, all linked to the
 * document and its organization.
 *
 * Chunking is deliberately the caller's job — the right chunk size depends on
 * the document type and the retrieval strategy, not on the embedding model.
 */
export async function embedDocumentChunks(input: {
  organizationId: string;
  documentId: string;
  chunks: string[];
}) {
  const vectors = await embedTexts(input.chunks);

  if (vectors.length === 0) {
    return [];
  }

  return db
    .insert(embedding)
    .values(
      vectors.map((vector) => ({
        organizationId: input.organizationId,
        documentId: input.documentId,
        embedding: vector,
      })),
    )
    .returning({ id: embedding.id });
}
