"use client";

import { useState } from "react";

import { startGoogleSignIn } from "@/modules/user-identity/infra/auth/sign-in";

type GoogleSignInButtonProps = {
  callbackUrl: string;
};

export function GoogleSignInButton({ callbackUrl }: GoogleSignInButtonProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleSignIn() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      await startGoogleSignIn(callbackUrl);
    } catch {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleSignIn}
      className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-sm border border-amber-200 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 px-5 font-bold uppercase tracking-[0.12em] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_34px_rgba(245,158,11,0.35)] outline-none transition hover:-translate-y-0.5 hover:from-amber-100 hover:to-amber-600 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12070c] active:translate-y-0 disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0 motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {isPending ? "…" : "G"}
      </span>
      <span>{isPending ? "Opening Google" : "Continue with Google"}</span>
    </button>
  );
}
