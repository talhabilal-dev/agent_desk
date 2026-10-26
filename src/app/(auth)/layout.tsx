import { BotMessageSquare } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 size-[36rem] rounded-full bg-indigo-600/30 blur-[130px]" />
        <div className="absolute -right-40 -bottom-40 size-[36rem] rounded-full bg-fuchsia-600/25 blur-[130px]" />
        <div className="absolute top-1/3 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>

      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pr-4 pl-1.5 backdrop-blur-sm transition-colors hover:bg-white/10"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/40">
            <BotMessageSquare className="size-4 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            AgentDesk
          </span>
        </Link>

        {children}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secured by Better Auth
        </p>
      </div>
    </div>
  );
}
