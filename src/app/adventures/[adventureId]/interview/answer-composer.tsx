type AnswerComposerProps = {
  answerText: string;
  fieldError: string | null;
  formError: string | null;
  isPending: boolean;
  canRetry: boolean;
  onAnswerTextChange: (answerText: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
};

export function AnswerComposer({
  answerText,
  fieldError,
  formError,
  isPending,
  canRetry,
  onAnswerTextChange,
  onSubmit,
  onRetry,
}: AnswerComposerProps) {
  const trimmedAnswer = answerText.trim();
  const sendDisabled = isPending || (!trimmedAnswer && !canRetry);

  return (
    <form
      className="space-y-4"
      aria-label="Answer the Game Master"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label
          htmlFor="interview-answer"
          className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200/75"
        >
          Your answer
        </label>
        <textarea
          id="interview-answer"
          name="answerText"
          rows={4}
          value={answerText}
          aria-invalid={Boolean(fieldError || formError)}
          aria-describedby="answer-composer-status"
          disabled={isPending}
          onChange={(event) => onAnswerTextChange(event.target.value)}
          placeholder="Type your answer..."
          className="mt-3 min-h-32 w-full resize-y rounded-sm border border-amber-300/25 bg-black/35 p-4 text-base leading-7 text-stone-100 outline-none shadow-[inset_0_0_0_1px_rgba(120,53,15,0.22)] placeholder:text-stone-500 focus:border-amber-200 focus:ring-2 focus:ring-amber-200/70 focus:ring-offset-2 focus:ring-offset-[#07030d]"
        />
      </div>
      <div id="answer-composer-status" aria-live="polite">
        {fieldError ? (
          <p className="text-sm font-semibold leading-6 text-amber-100">
            {fieldError}
          </p>
        ) : null}
        {formError ? (
          <p className="text-sm font-semibold leading-6 text-amber-100">
            {formError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {canRetry ? (
          <button
            type="button"
            disabled={isPending}
            onClick={onRetry}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-amber-300/45 bg-black/35 px-6 text-center font-bold uppercase tracking-[0.12em] text-amber-100 outline-none transition hover:border-amber-200 hover:bg-amber-950/30 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry Save
          </button>
        ) : null}
      <button
        type="submit"
        disabled={sendDisabled}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-amber-200 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 px-6 text-center font-bold uppercase tracking-[0.12em] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_34px_rgba(245,158,11,0.22)] outline-none transition hover:-translate-y-0.5 hover:from-amber-100 hover:to-amber-600 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isPending ? "Saving…" : "Send"}
      </button>
      </div>
      <p className="text-sm leading-6 text-stone-400">
        Saved for later. Return from the dashboard whenever you need to pause.
      </p>
    </form>
  );
}
