import {
  type Answer,
  answerCapabilities,
  answerQuestion,
} from "@/lib/ai/answer";
import { isEmbeddingsConfigured } from "@/lib/ai/embeddings";
import { isLlmConfigured, type LlmUsage } from "@/lib/ai/llm";
import {
  chunkLabel,
  listIndexedDocumentNames,
  listIndexedDocuments,
  searchChunks,
} from "@/lib/documents/search";
import { recordLlmUsage } from "@/lib/usage/service";

import { detectMessageIntent, type MessageIntent } from "./intent";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** The reply plus the intent it was routed to. */
export type WidgetReply = Answer & { kind: MessageIntent };

export const MAX_HISTORY_TURNS = 20;
/** Passages fed to the model per question. */
export const RETRIEVAL_LIMIT = 5;
export const ANSWER_TEMPERATURE = 0;
export const ANSWER_MAX_TOKENS = 800;

/** No model call, so a greeting is instant, free and can't hallucinate. */
function greetingReply(fileNames: string[]) {
  if (fileNames.length === 0) {
    return "Hi! I can answer questions about the documents in this workspace, but nothing is indexed yet — add a document and ask me anything.";
  }

  return `Hi! I can help with ${fileNames.join(", ")}. What would you like to know?`;
}

export async function generateReply(input: {
  organizationId: string;
  widgetId: string;
  message: string;
  history: ChatTurn[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<WidgetReply> {
  const kind = detectMessageIntent(input.message);

  if (!isEmbeddingsConfigured() || !isLlmConfigured()) {
    return {
      kind,
      status: "unknown",
      answer:
        "I don't know. This assistant has no model configured yet (OPENAI_API_KEY is missing).",
      citations: [],
      topics: [],
    };
  }

  if (kind === "greeting") {
    const documents = await listIndexedDocuments(input.organizationId, 3);

    return {
      kind,
      status: "answered",
      answer: greetingReply(documents.map((document) => document.fileName)),
      citations: [],
      topics: documents.map((document) => document.fileName),
    };
  }

  if (kind === "capabilities") {
    const documents = await listIndexedDocuments(input.organizationId);
    const { answer, usage } = await answerCapabilities({
      documents,
      temperature: input.temperature ?? ANSWER_TEMPERATURE,
      maxTokens: input.maxTokens ?? ANSWER_MAX_TOKENS,
      model: input.model,
    });

    await recordUsage(input, usage);

    return { ...answer, kind };
  }

  const chunks = await searchChunks({
    organizationId: input.organizationId,
    question: input.message,
    limit: RETRIEVAL_LIMIT,
  });

  const { answer, usage } = await answerQuestion({
    question: input.message,
    sources: chunks.map((chunk) => ({
      label: chunkLabel(chunk),
      content: chunk.content,
    })),
    history: input.history,
    // Only needed when nothing matched, so it can still say what it covers.
    availableTopics:
      chunks.length === 0
        ? await listIndexedDocumentNames(input.organizationId)
        : [],
    temperature: input.temperature ?? ANSWER_TEMPERATURE,
    maxTokens: input.maxTokens ?? ANSWER_MAX_TOKENS,
    model: input.model,
  });

  await recordUsage(input, usage);

  return { ...answer, kind };
}

/**
 * Billing is attribution, not the answer: a failure here must not lose the
 * reply the user already waited for.
 */
async function recordUsage(
  input: { organizationId: string; widgetId: string },
  usage: LlmUsage,
) {
  try {
    await recordLlmUsage({
      organizationId: input.organizationId,
      widgetId: input.widgetId,
      usage,
    });
  } catch (error) {
    console.error("[widget] failed to record llm usage", error);
  }
}
