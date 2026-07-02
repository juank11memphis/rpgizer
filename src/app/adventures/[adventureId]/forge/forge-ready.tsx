import Link from "next/link";

import { primaryForgeActionClassName } from "./forge-actions-style";

export function ForgeReady() {
  return (
    <main className="min-h-screen bg-[#07030d] px-5 py-10 text-stone-100 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col justify-center text-center">
        <div className="mx-auto mb-8 flex size-28 items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-500/10 shadow-[0_0_60px_rgba(16,185,129,0.16)]">
          <span className="text-4xl" aria-hidden="true">
            ✦
          </span>
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-200">
          Forge complete
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-amber-100 sm:text-5xl">
          Interview output ready.
        </h1>
        <p className="mt-5 text-base leading-7 text-stone-300">
          Your Adventure foundation is prepared. More to come soon.
        </p>
        <div className="mt-8">
          <Link href="/dashboard" className={primaryForgeActionClassName}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
