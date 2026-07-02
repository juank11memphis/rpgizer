import type {
  GameMasterInterviewer,
  InterviewTurnRequest,
  InterviewTurnResult,
} from "../start-adventure-interview/ports";

export class FakeGameMasterInterviewer implements GameMasterInterviewer {
  readonly requests: InterviewTurnRequest[] = [];

  private queuedResults: Array<InterviewTurnResult | Error> = [];

  queueResult(result: InterviewTurnResult): void {
    this.queuedResults.push(result);
  }

  queueError(error: Error): void {
    this.queuedResults.push(error);
  }

  async askNextQuestion(input: InterviewTurnRequest): Promise<InterviewTurnResult> {
    this.requests.push(input);

    const result = this.queuedResults.shift() ?? {
      messageToUser: "What would success look like for this Adventure?",
      readinessStatus: "not_ready",
      readinessConfirmation: "not_confirmed",
    };

    if (result instanceof Error) {
      throw result;
    }

    return result;
  }
}
