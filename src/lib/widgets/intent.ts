/**
 * Cheap, deterministic intent classification, run before any retrieval or
 * model call. A greeting must not pay for an embedding request, and must never
 * come back as "I don't know" just because it isn't in the documents.
 */
export type MessageIntent = "greeting" | "capabilities" | "question";

const GREETINGS =
  /^(hi|hey+|hello+|yo|hiya|howdy|sup|greetings|good (morning|afternoon|evening|day)|thanks|thank you|ty|cheers|ta|bye|goodbye|see ya|see you|nice to meet you)\b/i;

const CAPABILITIES =
  /\b(what|which|how)\b[^?]*\b(can|could|do|does|are|is)\b[^?]*\b(you|u|this (bot|assistant|widget))\b|\bwho are you\b|\bwhat are you\b|\bwhat can (you|i) (do|ask|help)|how can you help|\byour capabilit|\bwhat do you (do|know|support)|\bare you (a )?(bot|human|ai)\b|\bwhat (topics|documents)\b/i;

/** Greetings only count on their own — "hi, what's the refund window?" is a question. */
export function detectMessageIntent(message: string): MessageIntent {
  const normalised = message.trim().toLowerCase().replace(/\s+/g, " ");

  if (!normalised) {
    return "question";
  }

  if (CAPABILITIES.test(normalised)) {
    return "capabilities";
  }

  const words = normalised.split(" ").filter(Boolean).length;
  const looksLikeGreeting =
    GREETINGS.test(normalised) || /\b(hi|hello|hey)\b/.test(normalised);

  if (looksLikeGreeting && words <= 6 && !normalised.includes("?")) {
    return "greeting";
  }

  return "question";
}
