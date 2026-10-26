export type ChatTurn = { role: "user" | "assistant"; content: string };

export const MAX_HISTORY_TURNS = 20;

/**
 * Placeholder answer.
 *
 * This is deliberately the only place a model is called: swapping this body for
 * retrieval (embed the question, search the organization's vectors, prompt a
 * model) is the remaining work. Everything around it — the publishable key,
 * origin allowlist, validation, rate limiting — is already the real thing.
 */
export async function generateReply(input: {
  widgetName: string;
  message: string;
  history: ChatTurn[];
}) {
  const turn = input.history.length + 1;

  return [
    `Thanks — I received: "${input.message}".`,
    `I'm the "${input.widgetName}" assistant and I'm not connected to a knowledge base yet, so this is a placeholder reply.`,
    `(Turn ${turn}.)`,
  ].join(" ");
}
