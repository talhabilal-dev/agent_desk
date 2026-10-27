import { ChatOpenAI } from "@langchain/openai";
import type { z } from "zod";

/**
 * `gpt-5.4-mini` is treated as a reasoning model by `@langchain/openai`, so
 * `maxTokens` is sent as `max_completion_tokens` — the API rejects the legacy
 * `max_tokens` parameter outright.
 */
export const DEFAULT_CHAT_MODEL = "gpt-5.4-mini";
/** Answers must be reproducible, so the default is fully deterministic. */
export const DEFAULT_TEMPERATURE = 0;
/** Cap per call so one runaway answer can't burn the budget. */
export const DEFAULT_MAX_TOKENS = 800;

export type LlmUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type StructuredResult<T> = { parsed: T; usage: LlmUsage };

export function isLlmConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export type StructuredRequest<T extends z.ZodType> = {
  system: string;
  prompt: string;
  schema: T;
  /** Name of the JSON schema sent to the model. */
  schemaName?: string;
  /** Defaults to `DEFAULT_TEMPERATURE`. Passed straight through. */
  temperature?: number;
  /** Defaults to `DEFAULT_MAX_TOKENS`. Sent as `max_completion_tokens`. */
  maxTokens?: number;
  model?: string;
  /** Token-by-token generation on the wire. Defaults to true. */
  streaming?: boolean;
};

type UsageMeta = {
  usage_metadata?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  response_metadata?: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
};

/** Token counts come from the API; never estimated locally. */
function extractUsage(message: UsageMeta, model: string): LlmUsage {
  const meta = message.usage_metadata;

  if (meta) {
    const inputTokens = meta.input_tokens ?? 0;
    const outputTokens = meta.output_tokens ?? 0;

    return {
      model,
      inputTokens,
      outputTokens,
      totalTokens: meta.total_tokens ?? inputTokens + outputTokens,
    };
  }

  const usage = message.response_metadata?.usage;
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;

  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens: usage?.total_tokens ?? inputTokens + outputTokens,
  };
}

/**
 * Single entry point for model calls: structured output only, validated against
 * a zod schema, returning the token usage so it can be billed per workspace.
 * Token ceiling, temperature and streaming are per call.
 */
export async function generateStructured<T extends z.ZodType>({
  system,
  prompt,
  schema,
  schemaName = "response",
  temperature = DEFAULT_TEMPERATURE,
  maxTokens = DEFAULT_MAX_TOKENS,
  model,
  streaming = true,
}: StructuredRequest<T>): Promise<StructuredResult<z.infer<T>>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const modelId = model ?? process.env.OPENAI_CHAT_MODEL ?? DEFAULT_CHAT_MODEL;
  const chat = new ChatOpenAI({
    model: modelId,
    temperature,
    maxTokens,
    streaming,
  });

  const structured = chat.withStructuredOutput(schema, {
    name: schemaName,
    // OpenAI structured outputs: the model physically cannot return a shape
    // that violates the schema, which is what stops invented fields.
    strict: true,
    // Keep the raw message so the API-reported token counts are available.
    includeRaw: true,
  });

  const result = await structured.invoke([
    { role: "system", content: system },
    { role: "user", content: prompt },
  ]);

  // `withStructuredOutput` can only infer `Record<string, any>` from a generic
  // zod schema, so this restores what the schema already guarantees at runtime
  // (enforced server-side by strict structured outputs).
  const { raw, parsed } = result as unknown as {
    raw: UsageMeta;
    parsed: z.infer<T>;
  };

  return { parsed, usage: extractUsage(raw, modelId) };
}
