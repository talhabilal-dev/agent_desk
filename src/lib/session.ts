import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];

/**
 * Resolve the current session.
 *
 * Pass `request.headers` when calling from Proxy (there is no ambient request
 * scope there). In Server Components, Server Actions and Route Handlers omit
 * the argument and the incoming request headers are read for you.
 */
export async function getSession(requestHeaders?: Headers) {
  return auth.api.getSession({
    headers: requestHeaders ?? (await headers()),
  });
}

/** The signed-in user, or `null` when there is no valid session. */
export async function getCurrentUser(
  requestHeaders?: Headers,
): Promise<SessionUser | null> {
  const session = await getSession(requestHeaders);
  return session?.user ?? null;
}
