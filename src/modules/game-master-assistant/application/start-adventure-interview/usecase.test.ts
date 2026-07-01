import { describe, expect, it } from "vitest";

import { startAdventureInterview } from "./usecase";
import { FakeAdventureDraftRepository } from "../test/fake-adventure-draft-repository";
import { FakeGameMasterInterviewer } from "../test/fake-game-master-interviewer";

describe("startAdventureInterview", () => {
  it("rejects a blank Goal", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();

    await expect(
      startAdventureInterview(
        { userId: "user-1", goalText: "   " },
        { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
      ),
    ).rejects.toThrow("Goal must not be blank.");
  });

  it("creates a drafting Adventure with the initial User goal and Game Master question", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "What makes becoming a chef meaningful right now?",
      readinessStatus: "not_ready",
    });

    const result = await startAdventureInterview(
      { userId: "user-1", goalText: "  Become a chef  " },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(result.draft).toEqual({
      id: "adventure-1",
      goalText: "Become a chef",
      readinessStatus: "not_ready",
    });
    expect(result.transcript.map((message) => [message.role, message.content])).toEqual([
      ["user", "Become a chef"],
      ["game_master", "What makes becoming a chef meaningful right now?"],
    ]);
    expect(interviewer.requests[0]).toMatchObject({
      userId: "user-1",
      adventureId: "adventure-1",
      goalText: "Become a chef",
      readinessStatus: "not_ready",
    });
    expect(interviewer.requests[0]?.transcript.map((message) => message.content)).toEqual([
      "Become a chef",
    ]);
  });
});
