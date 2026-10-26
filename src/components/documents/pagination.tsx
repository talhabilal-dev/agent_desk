import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {total} total
      </span>

      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={`${basePath}?page=${page - 1}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={`${basePath}?page=${page + 1}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
