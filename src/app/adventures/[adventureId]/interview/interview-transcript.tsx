import type { InterviewMessage as InterviewMessageModel } from "@/modules/game-master-assistant/domain/interview-message";

import { CurrentGameMasterQuestion } from "./current-game-master-question";
import { InterviewMessage } from "./interview-message";

type InterviewTranscriptProps = {
  transcript: InterviewMessageModel[];
};

export function InterviewTranscript({ transcript }: InterviewTranscriptProps) {
  const currentQuestionIndex = findLatestGameMasterMessageIndex(transcript);
  const currentQuestion =
    currentQuestionIndex === -1 ? null : transcript[currentQuestionIndex];
  const contextMessages = transcript.filter(
    (_message, index) => index !== currentQuestionIndex,
  );

  return (
    <div className="space-y-6" aria-label="Adventure interview transcript">
      {contextMessages.length > 0 ? (
        <div className="space-y-5">
          {contextMessages.map((message) => (
            <InterviewMessage key={message.id} message={message} />
          ))}
        </div>
      ) : null}
      <CurrentGameMasterQuestion message={currentQuestion ?? null} />
    </div>
  );
}

function findLatestGameMasterMessageIndex(
  transcript: InterviewMessageModel[],
): number {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    if (transcript[index]?.role === "game_master") {
      return index;
    }
  }

  return -1;
}
