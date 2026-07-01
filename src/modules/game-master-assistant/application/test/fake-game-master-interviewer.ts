import type {
  GameMasterInterviewer,
  InterviewTurnRequest,
  InterviewTurnResult,
} from "../start-adventure-interview/ports";

export class FakeGameMasterInterviewer implements GameMasterInterviewer {
  readonly requests: InterviewTurnRequest[] = [];

  private queuedResults: InterviewTurnResult[] = [];

  queueResult(result: InterviewTurnResult): void {
    this.queuedResults.push(result);
  }

  async askNextQuestion(input: InterviewTurnRequest): Promise<InterviewTurnResult> {
    this.requests.push(input);

    return (
      this.queuedResults.shift() ?? {
        messageToUser: "What would success look like for this Adventure?",
        readinessStatus: "not_ready",
      }
    );
  }
}
