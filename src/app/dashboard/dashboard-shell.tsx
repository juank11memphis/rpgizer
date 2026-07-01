import Link from "next/link";
import type { ReactNode } from "react";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07030d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-10%,rgba(127,29,29,0.58)_0%,rgba(49,18,12,0.52)_28%,rgba(7,3,13,0.98)_72%)]" />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_12%_20%,rgba(180,83,9,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(90deg,rgba(250,204,21,0.06)_1px,transparent_1px),linear-gradient(rgba(250,204,21,0.04)_1px,transparent_1px)] bg-[length:auto,auto,72px_72px,72px_72px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-amber-500/10 to-transparent" />
      <div className="pointer-events-none fixed inset-0 -z-10 shadow-[inset_0_0_180px_rgba(0,0,0,0.92)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 sm:px-8 lg:px-10">
        <header className="flex min-h-16 items-center justify-between border-b border-amber-400/15 py-4">
          <Link
            href="/dashboard"
            className="rounded-sm font-serif text-xl font-bold tracking-[0.24em] text-amber-100 outline-none [text-shadow:0_0_18px_rgba(245,158,11,0.45)] transition hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12070c]"
          >
            RPGizer
          </Link>
          <span
            aria-hidden="true"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-amber-400/20 bg-black/25 text-lg font-semibold text-amber-100 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.25)]"
          >
            ☰
          </span>
        </header>

        <div className="flex flex-1 items-start justify-center py-10 sm:items-center sm:py-14 lg:py-20">
          <div className="w-full max-w-xl lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </main>
  );
}
