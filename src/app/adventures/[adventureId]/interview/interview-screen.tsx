"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { AdventureInterview } from "@/modules/game-master-assistant/application/get-adventure-interview/output";
import type { InterviewMessage } from "@/modules/game-master-assistant/domain/interview-message";

import { AnswerComposer } from "./answer-composer";
import {
  initialInterviewAnswerFormState,
  type InterviewAnswerFormState,
  type SubmitInterviewAnswerAction,
} from "./actions-core";
import { submitInterviewAnswerAction } from "./actions";
import { InterviewTranscript } from "./interview-transcript";
import { deriveInterviewDraftTitle } from "./interview-title";

type InterviewScreenProps = {
  interview: AdventureInterview;
  submitAnswer?: SubmitInterviewAnswerAction;
  initialSubmissionState?: InterviewAnswerFormState;
};

type SaveStatus = "saved" | "saving" | "not_saved";

export function InterviewScreen({
  interview,
  submitAnswer = submitInterviewAnswerAction,
  initialSubmissionState = initialInterviewAnswerFormState,
}: InterviewScreenProps) {
  const draftTitle = deriveInterviewDraftTitle(interview.draft.goalText);
  const [isPending, startTransition] = useTransition();
  const [answerText, setAnswerText] = useState(initialSubmissionState.answerText);
  const [submissionState, setSubmissionState] = useState(initialSubmissionState);
  const [transcript, setTranscript] = useState<InterviewMessage[]>(
    initialSubmissionState.transcript ?? interview.transcript,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() =>
    initialSubmissionState.status === "recoverable_failure" ? "not_saved" : "saved",
  );

  const submitForm = (input: {
    answerText?: string;
    retryUserMessageId?: string;
  }) => {
    if (isPending) {
      return;
    }

    const formData = new FormData();
    formData.set("adventureId", interview.draft.id);

    if (input.answerText !== undefined) {
      formData.set("answerText", input.answerText);
    }

    if (input.retryUserMessageId !== undefined) {
      formData.set("retryUserMessageId", input.retryUserMessageId);
    }

    setSaveStatus("saving");
    startTransition(async () => {
      const nextState = await submitAnswer(submissionState, formData);
      setSubmissionState(nextState);

      if (nextState.transcript) {
        setTranscript(nextState.transcript);
      }

      if (nextState.status === "success") {
        setAnswerText("");
        setSaveStatus("saved");
        return;
      }

      if (nextState.status === "recoverable_failure") {
        setAnswerText(nextState.answerText);
        setSaveStatus("not_saved");
        return;
      }

      setSaveStatus("saved");
    });
  };

  const handleSubmit = () => {
    submitForm({ answerText });
  };

  const handleRetry = () => {
    if (!submissionState.retryUserMessageId) {
      return;
    }

    submitForm({ retryUserMessageId: submissionState.retryUserMessageId });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07030d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-10%,rgba(127,29,29,0.58)_0%,rgba(49,18,12,0.52)_28%,rgba(7,3,13,0.98)_72%)]" />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_12%_20%,rgba(180,83,9,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(90deg,rgba(250,204,21,0.06)_1px,transparent_1px),linear-gradient(rgba(250,204,21,0.04)_1px,transparent_1px)] bg-[length:auto,auto,72px_72px,72px_72px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-amber-500/10 to-transparent" />
      <div className="pointer-events-none fixed inset-0 -z-10 shadow-[inset_0_0_180px_rgba(0,0,0,0.92)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 sm:px-8 lg:px-10">
        <header className="flex min-h-16 items-center justify-between border-b border-amber-400/15 py-4">
          <Link
            href="/dashboard"
            className="rounded-sm font-serif text-xl font-bold tracking-[0.24em] text-amber-100 outline-none [text-shadow:0_0_18px_rgba(245,158,11,0.45)] transition hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12070c]"
          >
            RPGizer
          </Link>
          <span
            className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200"
            aria-live="polite"
          >
            {saveStatusLabel(saveStatus)}
          </span>
        </header>

        <div className="flex flex-1 justify-center py-8 sm:py-12 lg:py-14">
          <section
            aria-labelledby="adventure-interview-heading"
            className="w-full max-w-2xl"
          >
            <p className="text-base font-semibold leading-7 text-stone-200">
              Draft: <span className="text-amber-100">{draftTitle}</span>
            </p>
            <h1 id="adventure-interview-heading" className="sr-only">
              Continue Adventure draft interview
            </h1>
            <div className="mt-7 space-y-8">
              <InterviewTranscript transcript={transcript} />
              <AnswerComposer
                answerText={answerText}
                fieldError={submissionState.fieldError}
                formError={submissionState.formError}
                isPending={isPending}
                canRetry={Boolean(submissionState.retryUserMessageId)}
                onAnswerTextChange={setAnswerText}
                onSubmit={handleSubmit}
                onRetry={handleRetry}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function saveStatusLabel(status: SaveStatus): string {
  if (status === "saving") {
    return "Saving…";
  }

  if (status === "not_saved") {
    return "Not saved";
  }

  return "Saved";
}
