import Link from "next/link";

import { retryForgeAction } from "./actions";
import {
  primaryForgeActionClassName,
  secondaryForgeActionClassName,
} from "./forge-actions-style";

type ForgeFailureProps = {
  adventureId: string;
  message?: string;
};

export function ForgeFailure({ adventureId, message }: ForgeFailureProps) {
  const safeMessage = message?.trim() || "Your interview is safe. Try again when you’re ready.";

  return (
    <main className="min-h-screen bg-[#07030d] px-5 py-10 text-stone-100 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col justify-center text-center">
        <div className="mx-auto mb-8 flex size-28 items-center justify-center rounded-full border border-red-200/20 bg-red-500/10 shadow-[0_0_60px_rgba(248,113,113,0.14)]">
          <span className="text-4xl" aria-hidden="true">
            ✧
          </span>
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-200">
          The forge sputtered
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-amber-100 sm:text-5xl">
          Couldn’t finish the forge.
        </h1>
        <p className="mt-5 text-base leading-7 text-stone-300">{safeMessage}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <form action={retryForgeAction}>
            <input type="hidden" name="adventureId" value={adventureId} />
            <button type="submit" className={primaryForgeActionClassName}>
              Try Again
            </button>
          </form>
          <Link href="/dashboard" className={secondaryForgeActionClassName}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
