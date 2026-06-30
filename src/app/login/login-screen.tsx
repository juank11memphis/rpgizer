import Link from "next/link";

import { GoogleSignInButton } from "./google-sign-in-button";

type LoginScreenProps = {
  callbackUrl: string;
  showSignInError: boolean;
};

export function LoginScreen({ callbackUrl, showSignInError }: LoginScreenProps) {
  return (
    <main className="login-canvas relative flex min-h-screen overflow-hidden bg-[#07030d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-10%,rgba(127,29,29,0.56)_0%,rgba(49,18,12,0.5)_30%,rgba(7,3,13,0.98)_72%)]" />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_14%_18%,rgba(180,83,9,0.2),transparent_28%),radial-gradient(circle_at_86%_20%,rgba(16,185,129,0.1),transparent_24%),linear-gradient(90deg,rgba(250,204,21,0.055)_1px,transparent_1px),linear-gradient(rgba(250,204,21,0.04)_1px,transparent_1px)] bg-[length:auto,auto,72px_72px,72px_72px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-amber-500/10 to-transparent" />
      <div className="pointer-events-none fixed inset-0 -z-10 shadow-[inset_0_0_180px_rgba(0,0,0,0.92)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 sm:px-8 lg:px-10">
        <header className="flex min-h-16 items-center justify-between border-b border-amber-400/15 py-4">
          <Link
            href="/"
            className="rounded-sm font-serif text-xl font-bold tracking-[0.24em] text-amber-100 outline-none [text-shadow:0_0_18px_rgba(245,158,11,0.45)] transition hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12070c]"
          >
            RPGizer
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-sm border border-transparent px-3 text-sm font-semibold uppercase tracking-[0.14em] text-stone-300 outline-none transition hover:border-amber-400/30 hover:bg-amber-950/20 hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12070c] sm:px-4"
          >
            Back to home
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-10 sm:py-14 lg:py-20">
          <div className="w-full max-w-md rounded-sm border border-amber-300/25 bg-[#12070c]/86 p-6 shadow-[0_26px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur sm:p-8">
            <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-stone-50 [text-shadow:0_6px_30px_rgba(0,0,0,0.85),0_0_18px_rgba(217,119,6,0.2)] sm:text-4xl">
              Sign in and start your next big adventure.
            </h1>

            <div className="mt-7">
              <GoogleSignInButton callbackUrl={callbackUrl} />
            </div>

            {showSignInError ? (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 rounded-sm border border-red-300/30 bg-red-950/25 px-4 py-3 text-sm font-semibold leading-6 text-red-100"
              >
                Sign-in didn’t work. Try again.
              </p>
            ) : null}

            <p className="mt-5 text-base leading-7 text-stone-300">
              Your adventures stay tied to your account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
