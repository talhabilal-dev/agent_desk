"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { createOrganization } from "@/lib/organizations/client";
import { errorMessage } from "@/utils/error";
import { toSlug } from "@/utils/slug";

export function CreateOrganizationForm({
  used,
  limit,
}: {
  used: number;
  /** null = no cap (unlimited plan or billing not configured). */
  limit: number | null;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugIsManual, setSlugIsManual] = useState(false);

  const atLimit = limit !== null && used >= limit;

  async function submit(formData: FormData) {
    setIsPending(true);

    try {
      const created = await createOrganization({
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
      });

      toast.add({ type: "success", title: `"${created.name}" is ready.` });
      setName("");
      setSlug("");
      setSlugIsManual(false);
      router.refresh();
    } catch (error) {
      toast.add({
        type: "error",
        title: "Could not create organization",
        description: errorMessage(error),
      });
    } finally {
      setIsPending(false);
    }
  }

  if (atLimit) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          You&apos;ve used all {limit} organization{limit === 1 ? "" : "s"} on
          your current plan.
        </p>
        <Link
          href="/dashboard/billing"
          className={buttonVariants({ className: "w-full" })}
        >
          Upgrade plan
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="org-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="org-name"
          name="name"
          placeholder="Acme Inc."
          required
          disabled={isPending}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugIsManual) {
              setSlug(toSlug(event.target.value));
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="org-slug" className="text-sm font-medium">
          Slug
        </label>
        <Input
          id="org-slug"
          name="slug"
          placeholder="acme-inc"
          required
          disabled={isPending}
          value={slug}
          onChange={(event) => {
            setSlugIsManual(true);
            setSlug(event.target.value);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers and single dashes.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="animate-spin" /> : null}
        {isPending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
