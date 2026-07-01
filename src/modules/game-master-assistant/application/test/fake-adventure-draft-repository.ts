import { ADVENTURE_DRAFT_STATE } from "../../domain/adventure-draft-state";
import type { InterviewMessage, InterviewMessageRole } from "../../domain/interview-message";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";
import type { DashboardAdventureDraftRepository } from "../get-dashboard-adventure-draft/ports";
import type { AdventureInterview } from "../get-adventure-interview/output";
import type { AdventureInterviewRepository } from "../get-adventure-interview/ports";
import type { AnswerInterviewQuestionRepository } from "../answer-interview-question/ports";
import type { StartAdventureInterviewRepository } from "../start-adventure-interview/ports";

type StoredDraft = {
  id: string;
  userId: string;
  goalText: string;
  state: typeof ADVENTURE_DRAFT_STATE;
  readinessStatus: InterviewReadinessStatus;
  createdAt: Date;
  updatedAt: Date;
};

type AppendMessageInput = {
  userId: string;
  adventureId: string;
  role: InterviewMessageRole;
  content: string;
};

export class FakeAdventureDraftRepository
  implements
    DashboardAdventureDraftRepository,
    StartAdventureInterviewRepository,
    AdventureInterviewRepository,
    AnswerInterviewQuestionRepository
{
  readonly appendedMessages: InterviewMessage[] = [];

  private readonly drafts = new Map<string, StoredDraft>();
  private readonly messagesByDraft = new Map<string, InterviewMessage[]>();
  private nextDraftNumber = 1;
  private nextMessageNumber = 1;

  seedDraft(input: {
    id: string;
    userId: string;
    goalText: string;
    readinessStatus?: InterviewReadinessStatus;
    updatedAt?: Date;
  }): void {
    this.drafts.set(input.id, {
      id: input.id,
      userId: input.userId,
      goalText: input.goalText,
      state: ADVENTURE_DRAFT_STATE,
      readinessStatus: input.readinessStatus ?? "not_ready",
      createdAt: input.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: input.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    });
    this.messagesByDraft.set(input.id, []);
  }

  seedMessage(input: {
    adventureId: string;
    role: InterviewMessageRole;
    content: string;
    sequenceNumber: number;
  }): InterviewMessage {
    const message: InterviewMessage = {
      id: `seed-message-${input.sequenceNumber}`,
      role: input.role,
      content: input.content,
      sequenceNumber: input.sequenceNumber,
      createdAt: new Date(`2026-01-01T00:00:0${input.sequenceNumber}.000Z`),
    };
    const messages = this.messagesByDraft.get(input.adventureId) ?? [];
    messages.push(message);
    this.messagesByDraft.set(input.adventureId, messages);
    return message;
  }

  getStoredDraftReadiness(adventureId: string): InterviewReadinessStatus | null {
    return this.drafts.get(adventureId)?.readinessStatus ?? null;
  }

  getStoredTranscript(adventureId: string): InterviewMessage[] {
    return [...(this.messagesByDraft.get(adventureId) ?? [])].sort(
      (left, right) => left.sequenceNumber - right.sequenceNumber,
    );
  }

  async findActiveDraftForUser(userId: string) {
    const userDrafts = [...this.drafts.values()]
      .filter((draft) => draft.userId === userId && draft.state === ADVENTURE_DRAFT_STATE)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
    const draft = userDrafts[0];

    if (!draft) {
      return null;
    }

    return {
      id: draft.id,
      goalText: draft.goalText,
      state: draft.state,
      readinessStatus: draft.readinessStatus,
      updatedAt: draft.updatedAt,
    };
  }

  async createDraft(input: {
    userId: string;
    goalText: string;
    state: typeof ADVENTURE_DRAFT_STATE;
    readinessStatus: InterviewReadinessStatus;
  }) {
    const draft: StoredDraft = {
      id: `adventure-${this.nextDraftNumber}`,
      userId: input.userId,
      goalText: input.goalText,
      state: input.state,
      readinessStatus: input.readinessStatus,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    this.nextDraftNumber += 1;
    this.drafts.set(draft.id, draft);
    this.messagesByDraft.set(draft.id, []);

    return {
      id: draft.id,
      goalText: draft.goalText,
      state: draft.state,
      readinessStatus: draft.readinessStatus,
    };
  }

  async appendInterviewMessage(input: AppendMessageInput): Promise<InterviewMessage> {
    const draft = this.drafts.get(input.adventureId);

    if (!draft || draft.userId !== input.userId) {
      throw new Error("Adventure draft was not found.");
    }

    const messages = this.messagesByDraft.get(input.adventureId) ?? [];
    const message: InterviewMessage = {
      id: `message-${this.nextMessageNumber}`,
      role: input.role,
      content: input.content,
      sequenceNumber: messages.length + 1,
      createdAt: new Date(`2026-01-01T00:00:${String(this.nextMessageNumber).padStart(2, "0")}.000Z`),
    };
    this.nextMessageNumber += 1;

    messages.push(message);
    this.messagesByDraft.set(input.adventureId, messages);
    this.appendedMessages.push(message);
    draft.updatedAt = message.createdAt;

    return message;
  }

  async getDraftWithTranscript(input: {
    userId: string;
    adventureId: string;
  }): Promise<AdventureInterview | null> {
    const draft = this.drafts.get(input.adventureId);

    if (!draft || draft.userId !== input.userId) {
      return null;
    }

    const transcript = this.getStoredTranscript(input.adventureId);

    return {
      draft: {
        id: draft.id,
        goalText: draft.goalText,
        state: draft.state,
        readinessStatus: draft.readinessStatus,
        updatedAt: draft.updatedAt,
      },
      transcript,
    };
  }

  async updateReadiness(input: {
    userId: string;
    adventureId: string;
    readinessStatus: InterviewReadinessStatus;
  }): Promise<void> {
    const draft = this.drafts.get(input.adventureId);

    if (!draft || draft.userId !== input.userId) {
      throw new Error("Adventure draft was not found.");
    }

    draft.readinessStatus = input.readinessStatus;
  }
}
