import { describe, expect, it } from "vitest";

import { DrizzleAdventureDraftRepository, type GameMasterAssistantDb } from "./drizzle-adventure-draft-repository";

type Row = Record<string, unknown>;

type Operation =
  | "select"
  | "insert"
  | "update"
  | "transaction";

class QueuedDrizzleDb {
  readonly operations: Operation[] = [];
  private readonly rowBatches: Row[][];

  constructor(rowBatches: Row[][]) {
    this.rowBatches = [...rowBatches];
  }

  select(): QueryBuilder {
    this.operations.push("select");
    return new QueryBuilder(() => this.shiftRows());
  }

  insert(): MutationBuilder {
    this.operations.push("insert");
    return new MutationBuilder(() => this.shiftRows());
  }

  update(): MutationBuilder {
    this.operations.push("update");
    return new MutationBuilder(() => this.shiftRows());
  }

  transaction<T>(callback: (tx: QueuedDrizzleDb) => Promise<T>): Promise<T> {
    this.operations.push("transaction");
    return callback(this);
  }

  asRepositoryDb(): GameMasterAssistantDb {
    return this as unknown as GameMasterAssistantDb;
  }

  private shiftRows(): Row[] {
    return this.rowBatches.shift() ?? [];
  }
}

class QueryBuilder implements PromiseLike<Row[]> {
  constructor(private readonly executeQuery: () => Row[]) {}

  from(): this {
    return this;
  }

  where(): this {
    return this;
  }

  orderBy(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((value: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.executeQuery()).then(onfulfilled, onrejected);
  }
}

class MutationBuilder implements PromiseLike<Row[]> {
  constructor(private readonly executeMutation: () => Row[]) {}

  values(): this {
    return this;
  }

  set(): this {
    return this;
  }

  where(): this {
    return this;
  }

  returning(): QueryBuilder {
    return new QueryBuilder(this.executeMutation);
  }

  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((value: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.executeMutation()).then(onfulfilled, onrejected);
  }
}

const draftRow = {
  id: "adventure-1",
  goalText: "Become a chef",
  state: "drafting",
  readinessStatus: "not_ready",
  interviewStatus: "interviewing",
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

const userMessageRow = {
  id: "message-1",
  role: "user",
  content: "Become a chef",
  sequenceNumber: 1,
  createdAt: new Date("2026-01-01T00:00:01.000Z"),
};

const gameMasterMessageRow = {
  id: "message-2",
  role: "game_master",
  content: "What is your current cooking level?",
  sequenceNumber: 2,
  createdAt: new Date("2026-01-01T00:00:02.000Z"),
};

describe("DrizzleAdventureDraftRepository", () => {
  it("maps the current active draft for a user", async () => {
    const db = new QueuedDrizzleDb([[draftRow]]);
    const repository = new DrizzleAdventureDraftRepository(db.asRepositoryDb());

    await expect(repository.findActiveDraftForUser("user-1")).resolves.toEqual({
      id: "adventure-1",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
      interviewStatus: "interviewing",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    expect(db.operations).toEqual(["select"]);
  });

  it("returns an authorized draft transcript in database sequence order", async () => {
    const db = new QueuedDrizzleDb([[draftRow], [userMessageRow, gameMasterMessageRow]]);
    const repository = new DrizzleAdventureDraftRepository(db.asRepositoryDb());

    const result = await repository.getDraftWithTranscript({
      userId: "user-1",
      adventureId: "adventure-1",
    });

    expect(result?.draft).toMatchObject({
      id: "adventure-1",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
      interviewStatus: "interviewing",
    });
    expect(result?.transcript.map((message) => [message.role, message.sequenceNumber])).toEqual([
      ["user", 1],
      ["game_master", 2],
    ]);
    expect(db.operations).toEqual(["select", "select"]);
  });

  it("returns null when a user-owned draft is not found", async () => {
    const db = new QueuedDrizzleDb([[]]);
    const repository = new DrizzleAdventureDraftRepository(db.asRepositoryDb());

    await expect(
      repository.getDraftWithTranscript({ userId: "other-user", adventureId: "adventure-1" }),
    ).resolves.toBeNull();
    expect(db.operations).toEqual(["select"]);
  });

  it("creates drafts and appends messages through scoped Drizzle writes", async () => {
    const db = new QueuedDrizzleDb([
      [draftRow],
      [{ id: "adventure-1" }],
      [{ lastSequenceNumber: 2 }],
      [{ ...gameMasterMessageRow, sequenceNumber: 3 }],
      [],
      [{ id: "adventure-1" }],
      [{ id: "adventure-1" }],
    ]);
    const repository = new DrizzleAdventureDraftRepository(db.asRepositoryDb());

    await expect(
      repository.createDraft({
        userId: "user-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "not_ready",
        interviewStatus: "interviewing",
      }),
    ).resolves.toEqual({
      id: "adventure-1",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
      interviewStatus: "interviewing",
    });

    await expect(
      repository.appendInterviewMessage({
        userId: "user-1",
        adventureId: "adventure-1",
        role: "game_master",
        content: " What tools do you already have? ",
      }),
    ).resolves.toMatchObject({
      id: "message-2",
      role: "game_master",
      sequenceNumber: 3,
    });

    await expect(
      repository.updateReadiness({
        userId: "user-1",
        adventureId: "adventure-1",
        readinessStatus: "ready_to_generate",
        interviewStatus: "awaiting_confirmation",
      }),
    ).resolves.toBeUndefined();

    await expect(
      repository.confirmReadiness({
        userId: "user-1",
        adventureId: "adventure-1",
      }),
    ).resolves.toBeUndefined();
    expect(db.operations).toEqual([
      "insert",
      "transaction",
      "select",
      "select",
      "insert",
      "update",
      "update",
      "update",
    ]);
  });

  it("rejects unauthorized scoped writes", async () => {
    const db = new QueuedDrizzleDb([[], [], []]);
    const repository = new DrizzleAdventureDraftRepository(db.asRepositoryDb());

    await expect(
      repository.appendInterviewMessage({
        userId: "other-user",
        adventureId: "adventure-1",
        role: "user",
        content: "I can cook eggs and pasta.",
      }),
    ).rejects.toThrow("Adventure draft was not found.");

    await expect(
      repository.updateReadiness({
        userId: "other-user",
        adventureId: "adventure-1",
        readinessStatus: "ready_to_generate",
        interviewStatus: "awaiting_confirmation",
      }),
    ).rejects.toThrow("Adventure draft was not found.");

    await expect(
      repository.confirmReadiness({
        userId: "other-user",
        adventureId: "adventure-1",
      }),
    ).rejects.toThrow("Adventure draft was not awaiting confirmation.");
  });
});
