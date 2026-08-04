"use client";

import { useId, useState } from "react";

import type { JournalQuestStepView } from "./adventure-detail-menu-types";

type JournalQuestStepsProps = {
  steps: JournalQuestStepView[];
};

export function JournalQuestSteps({ steps }: JournalQuestStepsProps) {
  const contentId = useId();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section aria-label="Steps" className="rounded-lg border border-emerald-200/15 bg-emerald-950/10 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span>Steps</span>
        <span aria-hidden="true" className="text-emerald-100/80">
          {isExpanded ? "▾" : "▸"}
        </span>
      </button>
      {isExpanded ? (
        <div id={contentId} className="mt-3 space-y-3">
          <p className="text-xs leading-5 text-stone-400">Tracking comes later.</p>
          <ul className="space-y-2 text-sm leading-6 text-stone-300">
            {steps.map((step) => (
              <li key={step.id} className="flex gap-3">
                <input
                  type="checkbox"
                  disabled
                  aria-label={step.description}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-emerald-200/40 bg-black/20 opacity-60 accent-emerald-500"
                />
                <span>{step.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
