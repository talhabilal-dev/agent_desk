import { OpenAIEmbeddings } from "@langchain/openai";

import { type DbClient, db, embedding } from "@/db";
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
 * Stores one vector per chunk.
 *
 * Vectors are computed by the caller so the embedding request happens *outside*
 * any transaction — only the writes need to be atomic, and holding a
 * transaction open across a network call to OpenAI would be wasteful.
 */
export async function storeDocumentChunks(
  input: {
    organizationId: string;
    documentId: string;
    chunks: string[];
    vectors: number[][];
  },
  client: DbClient = db,
) {
  if (input.chunks.length === 0) {
    return [];
  }

  if (input.vectors.length !== input.chunks.length) {
    throw new Error(
      `Expected ${input.chunks.length} vectors but got ${input.vectors.length}.`,
    );
  }

  return client
    .insert(embedding)
    .values(
      input.vectors.map((vector, index) => ({
        organizationId: input.organizationId,
        documentId: input.documentId,
        content: input.chunks[index],
        chunkIndex: index,
        embedding: vector,
      })),
    )
    .returning({ id: embedding.id });
}
