import { ArrowRight, Gauge, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";

const features = [
  {
    title: "Live runs",
    description: "Watch every agent run stream in as it happens.",
    icon: Zap,
  },
  {
    title: "Observability",
    description: "Latency, spend and success rate in one view.",
    icon: Gauge,
  },
  {
    title: "Secure by default",
    description: "Sessions handled by Better Auth on Postgres.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/4 size-[36rem] rounded-full bg-indigo-600/25 blur-[130px]" />
        <div className="absolute -right-32 bottom-0 size-[32rem] rounded-full bg-fuchsia-600/20 blur-[130px]" />
        <div className="absolute top-1/4 -left-32 size-[24rem] rounded-full bg-cyan-500/15 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <SiteHeader />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span className="text-muted-foreground">
              Secure email &amp; password auth on PostgreSQL
            </span>
          </span>

          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Orchestrate your AI agents{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              from one desk
            </span>
          </h1>

          <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            One dashboard for runs, latency and spend — with secure email and
            password authentication wired to PostgreSQL out of the box.
          </p>

          <div className="flex w-full flex-col justify-center gap-3 pt-2 sm:w-auto sm:flex-row">
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              Open dashboard
              <ArrowRight />
            </Link>
            <Link
              href="/sign-up"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Create account
            </Link>
          </div>

          <div id="features" className="grid w-full gap-3 pt-10 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left backdrop-blur-sm"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 text-indigo-300">
                  <feature.icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{feature.title}</span>
                <span className="text-xs text-muted-foreground">
                  {feature.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
