"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/user-avatar";
import { updateProfile } from "@/lib/profile/client";
import { errorMessage } from "@/utils/error";

export function ProfileForm({
  defaultName,
  defaultImage,
  email,
}: {
  defaultName: string;
  defaultImage: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [image, setImage] = useState(defaultImage);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setIsPending(true);

    try {
      await updateProfile({ name, image });
      toast.add({ type: "success", title: "Profile updated." });
      router.refresh();
    } catch (error) {
      toast.add({
        type: "error",
        title: "Could not update profile",
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
      className="flex flex-col gap-5"
    >
      <div className="flex items-center gap-4">
        <UserAvatar
          name={name || email}
          image={image || null}
          className="size-14 text-base"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">
            {name || "Your name"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {email}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="profile-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={64}
          required
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="profile-image" className="text-sm font-medium">
          Avatar URL
        </label>
        <Input
          id="profile-image"
          value={image}
          onChange={(event) => setImage(event.target.value)}
          placeholder="https://example.com/avatar.png"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to fall back to your initials.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="profile-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="profile-email"
          value={email}
          readOnly
          className="text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Changing your email requires verification and isn&apos;t available
          here yet.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : null}
        Save changes
      </Button>
    </form>
  );
}
