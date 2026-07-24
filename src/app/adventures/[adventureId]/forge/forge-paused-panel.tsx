"use client";

import Link from "next/link";

type ForgePausedPanelProps = {
  adventureId: string;
  onTryAgain: () => void;
};

export function ForgePausedPanel({ adventureId, onTryAgain }: ForgePausedPanelProps) {
  return (
    <div
      className="mt-6 flex flex-col items-stretch justify-center gap-3 rounded-3xl border border-red-200/20 bg-red-950/20 p-5 text-center shadow-xl shadow-black/20 sm:flex-row sm:items-center"
      aria-label="Forge recovery actions"
    >
      <button
        type="button"
        onClick={onTryAgain}
        className="rounded-full bg-amber-200 px-5 py-3 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/20 outline-none transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
      >
        Try again
      </button>
      <Link
        href={`/adventures/${adventureId}/interview`}
        className="rounded-full border border-amber-100/25 px-5 py-3 text-sm font-bold text-amber-100 outline-none transition hover:bg-amber-100/10 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
      >
        Back to interview
      </Link>
    </div>
  );
}
