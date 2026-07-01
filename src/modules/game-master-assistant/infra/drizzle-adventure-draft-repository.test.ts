import { describe, expect, it } from "vitest";
import type { SQL } from "drizzle-orm";

import { DrizzleAdventureDraftRepository, type GameMasterAssistantDb } from "./drizzle-adventure-draft-repository";

type Row = Record<string, unknown>;

class QueuedDb implements GameMasterAssistantDb {
  readonly queries: SQL[] = [];
  private readonly rowBatches: Row[][];

  constructor(rowBatches: Row[][]) {
    this.rowBatches = [...rowBatches];
  }

  async execute(query: SQL): Promise<Iterable<Row>> {
    this.queries.push(query);
    return this.rowBatches.shift() ?? [];
  }
}

const draftRow = {
  id: "adventure-1",
  goalText: "Become a chef",
  state: "drafting",
  readinessStatus: "not_ready",
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
    const db = new QueuedDb([[draftRow]]);
    const repository = new DrizzleAdventureDraftRepository(db);

    await expect(repository.findActiveDraftForUser("user-1")).resolves.toEqual({
      id: "adventure-1",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    expect(db.queries).toHaveLength(1);
  });

  it("returns an authorized draft transcript in database sequence order", async () => {
    const db = new QueuedDb([[draftRow], [[userMessageRow, gameMasterMessageRow]].flat()]);
    const repository = new DrizzleAdventureDraftRepository(db);

    const result = await repository.getDraftWithTranscript({
      userId: "user-1",
      adventureId: "adventure-1",
    });

    expect(result?.draft).toMatchObject({
      id: "adventure-1",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
    });
    expect(result?.transcript.map((message) => [message.role, message.sequenceNumber])).toEqual([
      ["user", 1],
      ["game_master", 2],
    ]);
    expect(db.queries).toHaveLength(2);
  });

  it("returns null when a user-owned draft is not found", async () => {
    const db = new QueuedDb([[]]);
    const repository = new DrizzleAdventureDraftRepository(db);

    await expect(
      repository.getDraftWithTranscript({ userId: "other-user", adventureId: "adventure-1" }),
    ).resolves.toBeNull();
    expect(db.queries).toHaveLength(1);
  });

  it("creates drafts and appends messages through scoped writes", async () => {
    const db = new QueuedDb([
      [draftRow],
      [{ ...gameMasterMessageRow, sequenceNumber: 3 }],
      [{ id: "adventure-1" }],
    ]);
    const repository = new DrizzleAdventureDraftRepository(db);

    await expect(
      repository.createDraft({
        userId: "user-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "not_ready",
      }),
    ).resolves.toEqual({
      id: "adventure-1",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
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
      }),
    ).resolves.toBeUndefined();
    expect(db.queries).toHaveLength(3);
  });

  it("rejects unauthorized scoped writes", async () => {
    const db = new QueuedDb([[], []]);
    const repository = new DrizzleAdventureDraftRepository(db);

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
      }),
    ).rejects.toThrow("Adventure draft was not found.");
  });
});
