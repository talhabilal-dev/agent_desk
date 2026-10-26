import { getSession } from "@/lib/session";

export type ApiSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/**
 * Server-side auth middleware for route handlers.
 *
 * Proxy already rejects unauthenticated API calls, but Proxy is only a first
 * gate — it can be bypassed by a matcher change — so every handler re-checks
 * the real session here before touching the database.
 */
export async function requireApiSession(
  request: Request,
): Promise<
  { ok: true; session: ApiSession } | { ok: false; response: Response }
> {
  const session = await getSession(request.headers);

  if (!session) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, session };
}
