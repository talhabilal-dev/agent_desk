import {
  ArrowRight,
  Check,
  FileText,
  Gauge,
  MessagesSquare,
  Quote,
  ScanText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listPlans } from "@/lib/billing/plans";
import { formatUsd } from "@/utils/format";

const features = [
  {
    title: "Answers with receipts",
    description:
      "Every reply cites the passage it came from, with the quoted sentence. If the documents don't cover it, it says so instead of guessing.",
    icon: Quote,
  },
  {
    title: "Reads scans, not just PDFs",
    description:
      "Text layers are extracted with layout preserved. Page images and scanned PDFs go through OCR, with blur detection so garbage in doesn't become garbage out.",
    icon: ScanText,
  },
  {
    title: "One script tag to embed",
    description:
      "Drop the loader on any site — React, Next.js, Vue, plain HTML. Shadow DOM keeps your CSS out, the key is publishable, and origins are allowlisted.",
    icon: MessagesSquare,
  },
  {
    title: "Costs you can see",
    description:
      "Every model call records its tokens and cost per workspace, with a monthly ceiling enforced before the request is made.",
    icon: Gauge,
  },
];

const steps = [
  {
    step: "01",
    title: "Upload",
    description:
      "PDFs, PNG, JPEG or WebP up to 4 MB. Identical files are deduplicated by content hash, so nothing is scanned twice.",
  },
  {
    step: "02",
    title: "Process",
    description:
      "Up to 10 pages are extracted (or OCR'd), split into chunks, embedded, and stored in Postgres with pgvector — all in the background.",
  },
  {
    step: "03",
    title: "Answer",
    description:
      "Your widget retrieves the closest passages, answers strictly from them, and shows the source. ",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col">
      {/* Clipped here rather than on the root: the wrapper is inset-0, so this
          bounds the blur circles to the viewport without making an ancestor a
          scroll container (which would break the sticky header). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/4 size-[36rem] rounded-full bg-indigo-600/25 blur-[130px]" />
        <div className="absolute -right-32 top-1/3 size-[32rem] rounded-full bg-fuchsia-600/20 blur-[130px]" />
        <div className="absolute -left-32 bottom-0 size-[24rem] rounded-full bg-cyan-500/15 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-24 px-4 py-16 sm:gap-32 sm:py-24">
        {/* Hero */}
        <section className="flex flex-col items-center gap-8 text-center">
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs backdrop-blur-sm sm:text-sm">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span className="text-muted-foreground">
              Grounded answers, with the quote that proves them
            </span>
          </span>

          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Your documents, answering questions{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              on your own site
            </span>
          </h1>

          <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            Upload policies, manuals or scans. AgentDesk extracts the text,
            indexes it, and serves a chat widget that answers only from what you
            gave it — with a citation for every claim.
          </p>

          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
              Start free
              <ArrowRight />
            </Link>
            <Link
              href="#plans"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              See plans
            </Link>
          </div>

          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {[
              "1 organization free",
              "25 pages a month",
              "10 pages per document",
              "No credit card",
            ].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>

          {/* Product preview: static markup, not live data. */}
          <div className="relative w-full max-w-2xl pt-4">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12] text-left shadow-2xl shadow-indigo-950/40">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <span className="text-xs font-medium text-white/70">
                  Refund policy assistant
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                  Preview
                </span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div className="ml-auto max-w-[80%] rounded-xl bg-indigo-500 px-3 py-2 text-[13px] text-white">
                  How long do I have to ask for a refund, and do you ship
                  internationally?
                </div>
                <div className="flex max-w-[85%] flex-col gap-2">
                  <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-[13px] leading-relaxed text-white/85">
                    Refunds are accepted within 30 days of delivery. Shipping is
                    not covered by the policy I have, so I don&apos;t know this
                    part.
                  </div>
                  <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
                    <span className="text-[10px] tracking-wider text-white/40 uppercase">
                      Answered from
                    </span>
                    <span className="text-[11px] font-semibold text-white/70">
                      refund-policy.pdf #1
                    </span>
                    <span className="text-[11px] text-white/50">
                      &ldquo;Refunds are accepted within 30 days of
                      delivery.&rdquo;
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built to be trusted
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              A support bot is only useful if you can check its work. Everything
              here is built around that.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm transition-colors hover:border-white/10"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/10 text-indigo-300">
                  <feature.icon className="size-4" />
                </span>
                <span className="font-medium">{feature.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Three steps, then it runs itself
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Processing happens in the background, so a slow scan never blocks
              the dashboard.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-5"
              >
                <span className="font-mono text-xs text-indigo-300">
                  {item.step}
                </span>
                <span className="font-medium">{item.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" /> PDF, PNG, JPEG, WebP
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Per-organization isolation
            </span>
            <span className="flex items-center gap-1.5">
              <Gauge className="size-3.5" /> Monthly spend ceilings
            </span>
          </div>
        </section>

        {/* Plans */}
        <Suspense fallback={<PlansSkeleton />}>
          <Plans />
        </Suspense>
      </main>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            AgentDesk — grounded document assistants. Next.js, Postgres +
            pgvector, Inngest.
          </span>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Create account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/**
 * Plans come from the `plan` catalogue, so the landing page cannot drift from
 * what the app actually enforces. Wrapped in Suspense by the caller because it
 * reads the database, and this app runs with `cacheComponents`.
 */
async function Plans() {
  const plans = await listPlans();

  if (plans.length === 0) {
    return null;
  }

  return (
    <section id="plans" className="flex scroll-mt-20 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Plans
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Start free. Upgrade when you need more pages, OCR or workspaces.
          Yearly billing saves about 20%.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan, index) => (
          <div
            key={plan.key}
            className={`flex flex-col gap-5 rounded-xl border p-6 ${
              index === 1
                ? "border-indigo-400/40 bg-indigo-500/[0.07]"
                : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{plan.name}</span>
                {index === 1 ? (
                  <span className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
                    Most popular
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">
                {plan.description}
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                {formatUsd(plan.monthlyPriceCents)}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>

            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                {plan.organizationLimit === null
                  ? "Unlimited organizations"
                  : `${plan.organizationLimit} organization${
                      plan.organizationLimit === 1 ? "" : "s"
                    }`}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                {plan.pageLimit} pages / month
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                {plan.ocrEnabled ? "OCR for scans" : "Text-layer PDFs only"}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                {plan.processingTier === "advanced"
                  ? "Advanced processing"
                  : "Basic processing"}
              </li>
            </ul>

            <Link
              href="/dashboard/billing"
              className={buttonVariants({
                variant: index === 1 ? "default" : "outline",
                className: "mt-auto w-full",
              })}
            >
              Choose {plan.name}
            </Link>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Free includes 1 organization, 25 pages a month and a $1 monthly model
        spend ceiling. Every plan caps documents at 10 pages and uploads at 4
        MB.
      </p>
    </section>
  );
}

function PlansSkeleton() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-80 w-full" />
        ))}
      </div>
    </section>
  );
}
