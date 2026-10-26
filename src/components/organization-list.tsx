"use client";

import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  deleteOrganization,
  renameOrganization,
} from "@/lib/organizations/client";
import { errorMessage } from "@/utils/error";

export type OrganizationItem = {
  id: string;
  name: string;
  slug: string;
};

export function OrganizationList({
  organizations,
}: {
  organizations: OrganizationItem[];
}) {
  if (organizations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You don&apos;t own any organization yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {organizations.map((organization) => (
        <OrganizationRow key={organization.id} organization={organization} />
      ))}
    </ul>
  );
}

function OrganizationRow({ organization }: { organization: OrganizationItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "rename" | "delete" | null
  >(null);
  const [, startTransition] = useTransition();

  function run(action: "rename" | "delete", task: () => Promise<void>) {
    setPendingAction(action);

    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (error) {
        toast.add({
          type: "error",
          title:
            action === "rename"
              ? "Could not rename organization"
              : "Could not delete organization",
          description: errorMessage(error),
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleRename(formData: FormData) {
    run("rename", async () => {
      await renameOrganization(organization.id, {
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
      });

      toast.add({ type: "success", title: "Organization updated." });
      setIsEditing(false);
    });
  }

  function handleDelete() {
    run("delete", async () => {
      await deleteOrganization(organization.id);
      toast.add({ type: "success", title: "Organization deleted." });
      setIsConfirming(false);
    });
  }

  if (isEditing) {
    return (
      <li className="py-3 first:pt-0 last:pb-0">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleRename(new FormData(event.currentTarget));
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor={`org-name-${organization.id}`}
              className="text-sm font-medium"
            >
              Name
            </label>
            <Input
              id={`org-name-${organization.id}`}
              name="name"
              defaultValue={organization.name}
              required
              disabled={pendingAction === "rename"}
            />
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor={`org-slug-${organization.id}`}
              className="text-sm font-medium"
            >
              Slug
            </label>
            <Input
              id={`org-slug-${organization.id}`}
              name="slug"
              defaultValue={organization.slug}
              required
              disabled={pendingAction === "rename"}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button type="submit" disabled={pendingAction === "rename"}>
              {pendingAction === "rename" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel rename"
              disabled={pendingAction === "rename"}
              onClick={() => setIsEditing(false)}
            >
              <X />
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {organization.name}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {organization.slug}
        </span>
      </div>

      {isConfirming ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-destructive sm:inline">
            Delete for good?
          </span>
          <Button
            variant="destructive"
            size="sm"
            disabled={pendingAction === "delete"}
            onClick={handleDelete}
          >
            {pendingAction === "delete" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check />
            )}
            Confirm
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel delete"
            disabled={pendingAction === "delete"}
            onClick={() => setIsConfirming(false)}
          >
            <X />
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil />
            Rename
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${organization.name}`}
            onClick={() => setIsConfirming(true)}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </li>
  );
}
