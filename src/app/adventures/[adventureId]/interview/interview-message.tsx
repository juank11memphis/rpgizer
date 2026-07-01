import type { InterviewMessage as InterviewMessageModel } from "@/modules/game-master-assistant/domain/interview-message";

type InterviewMessageProps = {
  message: InterviewMessageModel;
};

export function InterviewMessage({ message }: InterviewMessageProps) {
  const label = message.role === "game_master" ? "GM" : "You";
  const alignmentClass = message.role === "game_master" ? "pr-8" : "pl-8";

  return (
    <article className={alignmentClass}>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200/70">
        {label}
      </p>
      <p className="mt-2 rounded-sm border border-amber-300/12 bg-black/20 p-4 text-base leading-7 text-stone-300 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.12)]">
        {message.content}
      </p>
    </article>
  );
}
