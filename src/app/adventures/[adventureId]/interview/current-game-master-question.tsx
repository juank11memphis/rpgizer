import type { InterviewMessage } from "@/modules/game-master-assistant/domain/interview-message";

type CurrentGameMasterQuestionProps = {
  message: InterviewMessage | null;
};

export function CurrentGameMasterQuestion({
  message,
}: CurrentGameMasterQuestionProps) {
  if (!message) {
    return (
      <section
        aria-labelledby="current-game-master-question-heading"
        className="rounded-sm border border-amber-300/20 bg-black/25 p-5 text-stone-300 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.18)] sm:p-6"
      >
        <h2
          id="current-game-master-question-heading"
          className="font-serif text-xl font-bold tracking-[0.08em] text-amber-100"
        >
          Game Master
        </h2>
        <p className="mt-4 text-base leading-7">
          Your Game Master is gathering the next question. Return soon to continue
          the Adventure.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="current-game-master-question-heading"
      aria-describedby="current-game-master-question-content"
      className="rounded-sm border border-amber-200/45 bg-[#180b10]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.48),0_0_44px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(255,255,255,0.07)] sm:p-8"
    >
      <h2
        id="current-game-master-question-heading"
        className="font-serif text-xl font-bold tracking-[0.08em] text-amber-100 [text-shadow:0_0_18px_rgba(245,158,11,0.35)]"
      >
        Game Master
      </h2>
      <p
        id="current-game-master-question-content"
        className="mt-5 text-xl font-semibold leading-8 text-stone-50 sm:text-2xl sm:leading-9"
      >
        {message.content}
      </p>
    </section>
  );
}
