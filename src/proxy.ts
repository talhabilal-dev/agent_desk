import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/session";

const AUTH_ROUTES = ["/sign-in", "/sign-up"];
const API_ROUTE_PREFIXES = ["/api/organizations", "/api/documents"];

/**
 * Two-tier guard.
 *
 * API routes get a cheap cookie-presence check here — enough to reject obvious
 * anonymous traffic — and answer with JSON, never a redirect to a login page.
 * The authoritative session validation lives in the route handlers via
 * `requireApiSession`, so an API call costs one session read, not two.
 *
 * Page routes still validate the real session here, because the redirect
 * decision (signed in -> dashboard, signed out -> sign-in) has to be correct,
 * not merely optimistic.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (API_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!getSessionCookie(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  const session = await getSession(request.headers);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!session && !isAuthRoute) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sign-in",
    "/sign-up",
    "/api/organizations/:path*",
    "/api/documents/:path*",
  ],
};
