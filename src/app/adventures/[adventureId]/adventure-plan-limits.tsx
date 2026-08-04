"use client";

import { useState } from "react";

type AdventurePlanLimitsProps = {
  safetyNotes: string[];
};

export function AdventurePlanLimits({ safetyNotes }: AdventurePlanLimitsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (safetyNotes.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 w-fit items-center rounded-lg border border-emerald-300/30 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-200/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200"
        onClick={() => setIsOpen(true)}
      >
        Plan limits
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4"
          role="presentation"
          onClick={() => setIsOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="plan-limits-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-emerald-200/25 bg-[#16091f] p-5 text-stone-200 shadow-2xl shadow-emerald-950/30"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 id="plan-limits-title" className="font-serif text-2xl font-bold text-emerald-100">
                  Plan limits
                </h2>
                <p className="text-sm leading-6 text-stone-300">Important boundaries for this adventure.</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-stone-300/25 px-3 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-200 hover:bg-stone-200/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-200"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>

            <ul className="mt-5 space-y-3 text-sm leading-6 text-stone-200">
              {safetyNotes.map((note) => (
                <li key={note} className="rounded-lg border border-emerald-200/10 bg-emerald-950/20 p-3">
                  {note}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </>
  );
}
