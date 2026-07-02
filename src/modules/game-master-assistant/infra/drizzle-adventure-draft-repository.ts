import { and, desc, eq, max, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import {
  adventureInterviewMessages,
  adventures,
} from "@/db/schema";

import { ADVENTURE_DRAFT_STATE } from "../domain/adventure-draft-state";
import type { InterviewMessage, InterviewMessageRole } from "../domain/interview-message";
import { normalizeRequiredInterviewText } from "../domain/interview-message";
import type { InterviewReadinessStatus } from "../domain/interview-readiness";
import { isInterviewReadinessStatus } from "../domain/interview-readiness";
import type { InterviewStatus } from "../domain/interview-status";
import { isInterviewStatus } from "../domain/interview-status";
import type { DashboardAdventureDraftRepository } from "../application/get-dashboard-adventure-draft/ports";
import type { DashboardAdventureDraft } from "../application/get-dashboard-adventure-draft/output";
import type { AdventureInterview } from "../application/get-adventure-interview/output";
import type { AdventureInterviewRepository } from "../application/get-adventure-interview/ports";
import type { AnswerInterviewQuestionRepository } from "../application/answer-interview-question/ports";
import type {
  CreatedAdventureDraft,
  CreateAdventureDraftInput,
  StartAdventureInterviewRepository,
} from "../application/start-adventure-interview/ports";

export type GameMasterAssistantDb = ReturnType<typeof drizzle<typeof schema>>;

type AdventureDraftRow = Pick<
  typeof adventures.$inferSelect,
  "id" | "goalText" | "state" | "readinessStatus" | "interviewStatus" | "updatedAt"
>;

type CreatedAdventureDraftRow = Pick<
  typeof adventures.$inferSelect,
  "id" | "goalText" | "state" | "readinessStatus" | "interviewStatus"
>;

type InterviewMessageRow = Pick<
  typeof adventureInterviewMessages.$inferSelect,
  "id" | "role" | "content" | "sequenceNumber" | "createdAt"
>;

export class DrizzleAdventureDraftRepository
  implements
    DashboardAdventureDraftRepository,
    StartAdventureInterviewRepository,
    AdventureInterviewRepository,
    AnswerInterviewQuestionRepository
{
  constructor(private readonly db: GameMasterAssistantDb) {}

  async findActiveDraftForUser(userId: string): Promise<DashboardAdventureDraft | null> {
    const rows = await this.db
      .select({
        id: adventures.id,
        goalText: adventures.goalText,
        state: adventures.state,
        readinessStatus: adventures.readinessStatus,
        interviewStatus: adventures.interviewStatus,
        updatedAt: adventures.updatedAt,
      })
      .from(adventures)
      .where(and(eq(adventures.userId, userId), eq(adventures.state, ADVENTURE_DRAFT_STATE)))
      .orderBy(desc(adventures.updatedAt))
      .limit(1);

    const row = rows[0];
    return row ? mapDashboardDraft(row) : null;
  }

  async createDraft(input: CreateAdventureDraftInput): Promise<CreatedAdventureDraft> {
    const rows = await this.db
      .insert(adventures)
      .values({
        userId: input.userId,
        goalText: input.goalText,
        state: input.state,
        readinessStatus: input.readinessStatus,
        interviewStatus: input.interviewStatus,
      })
      .returning({
        id: adventures.id,
        goalText: adventures.goalText,
        state: adventures.state,
        readinessStatus: adventures.readinessStatus,
        interviewStatus: adventures.interviewStatus,
      });

    const row = rows[0];
    if (!row) {
      throw new Error("Adventure draft could not be created.");
    }

    return mapCreatedDraft(row);
  }

  async appendInterviewMessage(input: {
    userId: string;
    adventureId: string;
    role: InterviewMessageRole;
    content: string;
  }): Promise<InterviewMessage> {
    const content = normalizeRequiredInterviewText("Interview message", input.content);

    return this.db.transaction(async (tx) => {
      const authorizedDrafts = await tx
        .select({ id: adventures.id })
        .from(adventures)
        .where(
          and(
            eq(adventures.id, input.adventureId),
            eq(adventures.userId, input.userId),
            eq(adventures.state, ADVENTURE_DRAFT_STATE),
          ),
        )
        .limit(1);

      const authorizedDraft = authorizedDrafts[0];
      if (!authorizedDraft) {
        throw new Error("Adventure draft was not found.");
      }

      const sequenceRows = await tx
        .select({
          lastSequenceNumber: max(adventureInterviewMessages.sequenceNumber),
        })
        .from(adventureInterviewMessages)
        .where(eq(adventureInterviewMessages.adventureId, authorizedDraft.id));
      const lastSequenceNumber = sequenceRows[0]?.lastSequenceNumber;
      const nextSequenceNumber = lastSequenceNumber === null || lastSequenceNumber === undefined
        ? 1
        : lastSequenceNumber + 1;

      const messageRows = await tx
        .insert(adventureInterviewMessages)
        .values({
          adventureId: authorizedDraft.id,
          role: input.role,
          content,
          sequenceNumber: nextSequenceNumber,
        })
        .returning({
          id: adventureInterviewMessages.id,
          role: adventureInterviewMessages.role,
          content: adventureInterviewMessages.content,
          sequenceNumber: adventureInterviewMessages.sequenceNumber,
          createdAt: adventureInterviewMessages.createdAt,
        });

      const message = messageRows[0];
      if (!message) {
        throw new Error("Interview message could not be created.");
      }

      await tx
        .update(adventures)
        .set({ updatedAt: message.createdAt })
        .where(eq(adventures.id, authorizedDraft.id));

      return mapInterviewMessage(message);
    });
  }

  async getDraftWithTranscript(input: {
    userId: string;
    adventureId: string;
  }): Promise<AdventureInterview | null> {
    const draftRows = await this.db
      .select({
        id: adventures.id,
        goalText: adventures.goalText,
        state: adventures.state,
        readinessStatus: adventures.readinessStatus,
        interviewStatus: adventures.interviewStatus,
        updatedAt: adventures.updatedAt,
      })
      .from(adventures)
      .where(
        and(
          eq(adventures.id, input.adventureId),
          eq(adventures.userId, input.userId),
          eq(adventures.state, ADVENTURE_DRAFT_STATE),
        ),
      )
      .limit(1);

    const draftRow = draftRows[0];
    if (!draftRow) {
      return null;
    }

    const messageRows = await this.db
      .select({
        id: adventureInterviewMessages.id,
        role: adventureInterviewMessages.role,
        content: adventureInterviewMessages.content,
        sequenceNumber: adventureInterviewMessages.sequenceNumber,
        createdAt: adventureInterviewMessages.createdAt,
      })
      .from(adventureInterviewMessages)
      .where(eq(adventureInterviewMessages.adventureId, input.adventureId))
      .orderBy(adventureInterviewMessages.sequenceNumber);

    return {
      draft: mapInterviewDraft(draftRow),
      transcript: messageRows.map(mapInterviewMessage),
    };
  }

  async updateReadiness(input: {
    userId: string;
    adventureId: string;
    readinessStatus: InterviewReadinessStatus;
    interviewStatus: InterviewStatus;
  }): Promise<void> {
    const rows = await this.db
      .update(adventures)
      .set({
        readinessStatus: input.readinessStatus,
        interviewStatus: input.interviewStatus,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(adventures.id, input.adventureId),
          eq(adventures.userId, input.userId),
          eq(adventures.state, ADVENTURE_DRAFT_STATE),
        ),
      )
      .returning({ id: adventures.id });

    if (!rows[0]) {
      throw new Error("Adventure draft was not found.");
    }
  }
}

function mapCreatedDraft(row: CreatedAdventureDraftRow): CreatedAdventureDraft {
  return {
    id: row.id,
    goalText: row.goalText,
    state: readDraftState(row.state),
    readinessStatus: readReadinessStatus(row.readinessStatus),
    interviewStatus: readInterviewStatus(row.interviewStatus),
  };
}

function mapDashboardDraft(row: AdventureDraftRow): DashboardAdventureDraft {
  return {
    id: row.id,
    goalText: row.goalText,
    state: readDraftState(row.state),
    readinessStatus: readReadinessStatus(row.readinessStatus),
    interviewStatus: readInterviewStatus(row.interviewStatus),
    updatedAt: row.updatedAt,
  };
}

function mapInterviewDraft(row: AdventureDraftRow): AdventureInterview["draft"] {
  return mapDashboardDraft(row);
}

function mapInterviewMessage(row: InterviewMessageRow): InterviewMessage {
  const role = row.role;
  if (role !== "user" && role !== "game_master") {
    throw new Error("Interview message row had an invalid role.");
  }

  return {
    id: row.id,
    role,
    content: row.content,
    sequenceNumber: row.sequenceNumber,
    createdAt: row.createdAt,
  };
}

function readDraftState(value: string): typeof ADVENTURE_DRAFT_STATE {
  if (value !== ADVENTURE_DRAFT_STATE) {
    throw new Error("Adventure draft row had an invalid state.");
  }

  return value;
}

function readReadinessStatus(value: string): InterviewReadinessStatus {
  if (!isInterviewReadinessStatus(value)) {
    throw new Error("Adventure draft row had an invalid readiness status.");
  }

  return value;
}

function readInterviewStatus(value: string): InterviewStatus {
  if (!isInterviewStatus(value)) {
    throw new Error("Adventure draft row had an invalid interview status.");
  }

  return value;
}
