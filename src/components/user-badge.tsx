"use client";

import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useSession } from "@/lib/auth-client";

export function UserBadge({ className }: { className?: string }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <Skeleton className="h-8 w-28 rounded-lg" />;
  }

  const user = session?.user;

  if (!user) {
    return null;
  }

  const label = user.name || user.email;

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <UserAvatar name={label} image={user.image} />
      <span className="hidden min-w-0 flex-col leading-none sm:flex">
        <span className="truncate text-sm font-medium">{label}</span>
        {user.email ? (
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        ) : null}
      </span>
    </span>
  );
}
