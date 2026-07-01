"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  initialStartAdventureFormState,
  type StartAdventureFormAction,
  type StartAdventureFormState,
} from "./actions-core";
import { startAdventureFromGoalAction } from "./actions";

type GoalPromptFormProps = {
  initialState?: StartAdventureFormState;
  action?: StartAdventureFormAction;
};

export function GoalPromptForm({
  initialState = initialStartAdventureFormState,
  action = startAdventureFromGoalAction,
}: GoalPromptFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const goalInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.fieldError) {
      goalInputRef.current?.focus();
    }
  }, [state.fieldError]);

  const errorMessage = state.fieldError ?? state.formError;

  return (
    <form action={formAction} className="mx-auto w-full max-w-xl text-left">
      <label
        htmlFor="goalText"
        className="sr-only"
      >
        Goal for this Adventure
      </label>
      <textarea
        ref={goalInputRef}
        id="goalText"
        name="goalText"
        rows={6}
        defaultValue={state.goalText}
        placeholder="I want to..."
        aria-describedby={errorMessage ? "goal-prompt-error" : undefined}
        aria-invalid={Boolean(state.fieldError)}
        className="min-h-44 w-full resize-y rounded-sm border border-amber-300/30 bg-[#12070c]/88 px-5 py-4 text-lg leading-8 text-stone-50 shadow-[0_26px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] outline-none placeholder:text-stone-500 focus:border-amber-200 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#07030d] disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-48"
        disabled={isPending}
        onKeyDown={(event) => {
          if (!shouldSubmitGoalFromKeyDown(event) || isPending) {
            return;
          }

          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }}
      />
      {errorMessage ? (
        <p
          id="goal-prompt-error"
          className="mt-3 text-sm font-semibold leading-6 text-amber-100"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-amber-200 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 px-6 text-center font-bold uppercase tracking-[0.12em] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_34px_rgba(245,158,11,0.28)] outline-none transition hover:-translate-y-0.5 hover:from-amber-100 hover:to-amber-600 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d] active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Opening the gate…" : "Begin the Interview"}
      </button>
    </form>
  );
}


export type GoalPromptKeyDownInput = {
  key: string;
  shiftKey: boolean;
  nativeEvent?: {
    isComposing?: boolean;
  };
};

export function shouldSubmitGoalFromKeyDown(
  event: GoalPromptKeyDownInput,
): boolean {
  return event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing;
}
