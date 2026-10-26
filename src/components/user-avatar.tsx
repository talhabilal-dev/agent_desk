import { cn } from "cn";

import { getInitials } from "@/utils/user";

/** Avatar image when the user has one, otherwise their initials. */
export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30",
        className,
      )}
    >
      {image ? (
        // biome-ignore lint/performance/noImgElement: avatar URLs are user-supplied, so the remote hosts can't be enumerated for next/image
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
