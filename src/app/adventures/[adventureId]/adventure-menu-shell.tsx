import Link from "next/link";
import type { ReactNode } from "react";

import type { AdventureDetailHeaderView } from "./adventure-detail-menu-types";
import { AdventurePlanLimits } from "./adventure-plan-limits";

type AdventureMenuShellProps = {
  header: AdventureDetailHeaderView;
  children: ReactNode;
};

export function AdventureMenuShell({ header, children }: AdventureMenuShellProps) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-amber-300/25 bg-[#100517]/95 shadow-2xl shadow-amber-950/25">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_34%)]" />
      <div className="relative flex flex-1 flex-col gap-5 p-5 sm:p-7 lg:p-8">
        <header className="flex flex-col gap-4 border-b border-amber-200/15 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/80">RPGizer</p>
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold text-amber-100 sm:text-5xl">
                {header.title}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-stone-200">{header.goalSummary}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AdventurePlanLimits safetyNotes={header.safetyNotes} />
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 w-fit items-center rounded-lg border border-amber-300/35 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
            >
              Exit
            </Link>
          </div>
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </section>
  );
}
