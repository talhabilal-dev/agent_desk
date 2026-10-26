"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { OriginsField } from "@/components/widgets/origins-field";
import {
  DEFAULT_THEME,
  ThemeFields,
  WidgetPreview,
} from "@/components/widgets/theme-fields";
import type { WidgetThemeInput } from "@/lib/validations/widget";
import { createWidget } from "@/lib/widgets/client";
import { errorMessage } from "@/utils/error";
import { parseOriginLines } from "@/utils/origins";

export function CreateWidgetForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [theme, setTheme] = useState<WidgetThemeInput>(DEFAULT_THEME);
  const [origins, setOrigins] = useState("");

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          A widget belongs to an organization, and you don&apos;t own one yet.
        </p>
        <Link
          href="/dashboard/organization"
          className={buttonVariants({ className: "w-full" })}
        >
          Create organization
        </Link>
      </div>
    );
  }

  async function submit() {
    setIsPending(true);

    try {
      await createWidget({
        organizationId,
        name,
        allowedOrigins: parseOriginLines(origins),
        ...theme,
      });

      toast.add({ type: "success", title: `"${name}" is ready to embed.` });
      setName("");
      setOrigins("");
      setTheme(DEFAULT_THEME);
      router.refresh();
    } catch (error) {
      toast.add({
        type: "error",
        title: "Could not create widget",
        description: errorMessage(error),
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="widget-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="widget-name"
          placeholder="Support bot"
          required
          minLength={2}
          maxLength={60}
          disabled={isPending}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="widget-organization" className="text-sm font-medium">
          Organization
        </label>
        <Select
          id="widget-organization"
          value={organizationId}
          disabled={isPending}
          onChange={(event) => setOrganizationId(event.target.value)}
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </Select>
      </div>

      <ThemeFields theme={theme} disabled={isPending} onChange={setTheme} />

      <OriginsField
        value={origins}
        disabled={isPending}
        onChange={setOrigins}
      />

      <WidgetPreview theme={theme} />

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="animate-spin" /> : null}
        {isPending ? "Creating…" : "Create widget"}
      </Button>
    </form>
  );
}
