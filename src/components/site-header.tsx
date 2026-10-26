"use client";

import { BotMessageSquare, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserBadge } from "@/components/user-badge";
import { useSession } from "@/lib/auth-client";

export function SiteHeader() {
  const { data: session, isPending } = useSession();
  const isSignedIn = Boolean(session?.user);

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg ring-sidebar-ring outline-none focus-visible:ring-2"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
            <BotMessageSquare className="size-4 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            AgentDesk
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-2">
          {isPending ? (
            <Skeleton className="h-8 w-44 rounded-lg" />
          ) : isSignedIn ? (
            <>
              <UserBadge className="mr-1 hidden md:flex" />
              <Link
                href="/dashboard"
                className={buttonVariants({ size: "sm" })}
              >
                <LayoutDashboard />
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
