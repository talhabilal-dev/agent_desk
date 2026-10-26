"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { uploadDocument } from "@/lib/documents/client";
import { errorMessage } from "@/utils/error";

export function UploadForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isPending, setIsPending] = useState(false);

  if (organizations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an organization first — documents belong to one.
      </p>
    );
  }

  async function submit() {
    if (!file) {
      return;
    }

    setIsPending(true);

    try {
      const result = await uploadDocument({ organizationId, file });

      toast.add({
        type: result.reused ? "info" : "success",
        title: result.reused
          ? "This file was already uploaded"
          : "Queued for processing",
        description: result.document.fileName ?? undefined,
      });

      setFile(null);
      setResetKey((key) => key + 1);
      router.refresh();
    } catch (error) {
      toast.add({
        type: "error",
        title: "Upload failed",
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
        <label htmlFor="document-org" className="text-sm font-medium">
          Organization
        </label>
        <Select
          id="document-org"
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
          disabled={isPending}
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="document-file" className="text-sm font-medium">
          File
        </label>
        <Input
          key={resetKey}
          id="document-file"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          disabled={isPending}
          className="h-auto py-1.5 file:mr-3"
        />
      </div>

      <Button type="submit" disabled={!file || isPending} className="w-full">
        {isPending ? <Loader2 className="animate-spin" /> : <Upload />}
        {isPending ? "Uploading…" : "Upload document"}
      </Button>
    </form>
  );
}
