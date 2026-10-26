"use client";

import { Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useSession } from "@/lib/auth-client";

function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon-sm"
      aria-label="Sign out"
      disabled={pending}
      className="group-data-[collapsible=icon]:hidden"
    >
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
    </Button>
  );
}

export function NavUser() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <Skeleton className="h-12 w-full" />;
  }

  const user = session?.user;
  const label = user?.name || user?.email || "Guest";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 rounded-md p-1 ring-sidebar-ring transition-colors hover:bg-sidebar-accent/50">
          <UserAvatar name={label} image={user?.image} />
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{label}</span>
            {user?.email ? (
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </div>
          <form action={signOutAction}>
            <SignOutButton />
          </form>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
