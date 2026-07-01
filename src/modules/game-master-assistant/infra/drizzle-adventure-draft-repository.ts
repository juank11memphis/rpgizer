import { sql, type SQL } from "drizzle-orm";

import { ADVENTURE_DRAFT_STATE } from "../domain/adventure-draft-state";
import type { InterviewMessage, InterviewMessageRole } from "../domain/interview-message";
import { normalizeRequiredInterviewText } from "../domain/interview-message";
import type { InterviewReadinessStatus } from "../domain/interview-readiness";
import { isInterviewReadinessStatus } from "../domain/interview-readiness";
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

export type GameMasterAssistantDb = {
  execute(query: SQL): PromiseLike<Iterable<Record<string, unknown>>>;
};

type AdventureDraftRow = {
  id: unknown;
  goalText: unknown;
  state: unknown;
  readinessStatus: unknown;
  updatedAt: unknown;
};

type CreatedAdventureDraftRow = AdventureDraftRow & {
  createdAt: unknown;
};

type InterviewMessageRow = {
  id: unknown;
  role: unknown;
  content: unknown;
  sequenceNumber: unknown;
  createdAt: unknown;
};

export class DrizzleAdventureDraftRepository
  implements
    DashboardAdventureDraftRepository,
    StartAdventureInterviewRepository,
    AdventureInterviewRepository,
    AnswerInterviewQuestionRepository
{
  constructor(private readonly db: GameMasterAssistantDb) {}

  async findActiveDraftForUser(userId: string): Promise<DashboardAdventureDraft | null> {
    const rows = readRows<AdventureDraftRow>(await this.db.execute(sql`
      select id, "goalText", state, "readinessStatus", "updatedAt"
      from adventures
      where "userId" = ${userId} and state = ${ADVENTURE_DRAFT_STATE}
      order by "updatedAt" desc
      limit 1
    `));

    const row = rows[0];
    return row ? mapDashboardDraft(row) : null;
  }

  async createDraft(input: CreateAdventureDraftInput): Promise<CreatedAdventureDraft> {
    const rows = readRows<CreatedAdventureDraftRow>(await this.db.execute(sql`
      insert into adventures ("userId", "goalText", state, "readinessStatus")
      values (${input.userId}, ${input.goalText}, ${input.state}, ${input.readinessStatus})
      returning id, "goalText", state, "readinessStatus", "createdAt", "updatedAt"
    `));

    const row = rows[0];
    if (!row) {
      throw new Error("Adventure draft could not be created.");
    }

    return {
      id: readString(row.id, "adventure id"),
      goalText: readString(row.goalText, "goal text"),
      state: readDraftState(row.state),
      readinessStatus: readReadinessStatus(row.readinessStatus),
    };
  }

  async appendInterviewMessage(input: {
    userId: string;
    adventureId: string;
    role: InterviewMessageRole;
    content: string;
  }): Promise<InterviewMessage> {
    const content = normalizeRequiredInterviewText("Interview message", input.content);
    const rows = readRows<InterviewMessageRow>(await this.db.execute(sql`
      with authorized_draft as (
        select id
        from adventures
        where id = ${input.adventureId}
          and "userId" = ${input.userId}
          and state = ${ADVENTURE_DRAFT_STATE}
      ), next_message as (
        insert into "adventureInterviewMessages" ("adventureId", role, content, "sequenceNumber")
        select
          authorized_draft.id,
          ${input.role},
          ${content},
          coalesce((
            select max("sequenceNumber") + 1
            from "adventureInterviewMessages"
            where "adventureId" = authorized_draft.id
          ), 1)
        from authorized_draft
        returning id, role, content, "sequenceNumber", "createdAt", "adventureId"
      ), touched_draft as (
        update adventures
        set "updatedAt" = (select max("createdAt") from next_message)
        where id = (select "adventureId" from next_message)
      )
      select id, role, content, "sequenceNumber", "createdAt"
      from next_message
    `));

    const row = rows[0];
    if (!row) {
      throw new Error("Adventure draft was not found.");
    }

    return mapInterviewMessage(row);
  }

  async getDraftWithTranscript(input: {
    userId: string;
    adventureId: string;
  }): Promise<AdventureInterview | null> {
    const draftRows = readRows<AdventureDraftRow>(await this.db.execute(sql`
      select id, "goalText", state, "readinessStatus", "updatedAt"
      from adventures
      where id = ${input.adventureId}
        and "userId" = ${input.userId}
        and state = ${ADVENTURE_DRAFT_STATE}
      limit 1
    `));

    const draftRow = draftRows[0];
    if (!draftRow) {
      return null;
    }

    const messageRows = readRows<InterviewMessageRow>(await this.db.execute(sql`
      select id, role, content, "sequenceNumber", "createdAt"
      from "adventureInterviewMessages"
      where "adventureId" = ${input.adventureId}
      order by "sequenceNumber" asc
    `));

    return {
      draft: mapInterviewDraft(draftRow),
      transcript: messageRows.map(mapInterviewMessage),
    };
  }

  async updateReadiness(input: {
    userId: string;
    adventureId: string;
    readinessStatus: InterviewReadinessStatus;
  }): Promise<void> {
    const rows = readRows<{ id: unknown }>(await this.db.execute(sql`
      update adventures
      set "readinessStatus" = ${input.readinessStatus}, "updatedAt" = now()
      where id = ${input.adventureId}
        and "userId" = ${input.userId}
        and state = ${ADVENTURE_DRAFT_STATE}
      returning id
    `));

    if (!rows[0]) {
      throw new Error("Adventure draft was not found.");
    }
  }
}

function readRows<T extends Record<string, unknown>>(
  rows: Iterable<Record<string, unknown>>,
): T[] {
  return Array.from(rows) as T[];
}

function mapDashboardDraft(row: AdventureDraftRow): DashboardAdventureDraft {
  return {
    id: readString(row.id, "adventure id"),
    goalText: readString(row.goalText, "goal text"),
    state: readDraftState(row.state),
    readinessStatus: readReadinessStatus(row.readinessStatus),
    updatedAt: readDate(row.updatedAt, "updated at"),
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
    id: readString(row.id, "message id"),
    role,
    content: readString(row.content, "message content"),
    sequenceNumber: readNumber(row.sequenceNumber, "sequence number"),
    createdAt: readDate(row.createdAt, "message created at"),
  };
}

function readDraftState(value: unknown): typeof ADVENTURE_DRAFT_STATE {
  if (value !== ADVENTURE_DRAFT_STATE) {
    throw new Error("Adventure draft row had an invalid state.");
  }

  return value;
}

function readReadinessStatus(value: unknown): InterviewReadinessStatus {
  if (typeof value !== "string" || !isInterviewReadinessStatus(value)) {
    throw new Error("Adventure draft row had an invalid readiness status.");
  }

  return value;
}

function readString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`Expected ${name} to be a string.`);
  }

  return value;
}

function readNumber(value: unknown, name: string): number {
  if (typeof value !== "number") {
    throw new Error(`Expected ${name} to be a number.`);
  }

  return value;
}

function readDate(value: unknown, name: string): Date {
  if (!(value instanceof Date)) {
    throw new Error(`Expected ${name} to be a Date.`);
  }

  return value;
}
