import { Compass } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/3 size-[34rem] rounded-full bg-indigo-600/25 blur-[130px]" />
        <div className="absolute -right-32 bottom-0 size-[30rem] rounded-full bg-fuchsia-600/20 blur-[130px]" />
        <div className="absolute -left-32 bottom-1/4 size-[24rem] rounded-full bg-cyan-500/15 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <div className="flex flex-col items-center gap-6">
        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pr-4 pl-1.5 text-sm backdrop-blur-sm">
          <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            <Compass className="size-3.5 text-white" />
          </span>
          <span className="font-medium">404</span>
          <span className="text-muted-foreground">page not found</span>
        </span>

        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          This page drifted off course
        </h1>

        <p className="max-w-md text-pretty text-sm text-muted-foreground sm:text-base">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        <div className="flex w-full flex-col justify-center gap-3 pt-2 sm:w-auto sm:flex-row">
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            Back to home
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
