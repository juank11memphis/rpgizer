import { describe, expect, it } from "vitest";

import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";
import { loadOpenAIGameMasterInterviewerConfig } from "./openai-game-master-interviewer-config";

describe("loadOpenAIGameMasterInterviewerConfig", () => {
  it("fails clearly when the OpenAI API key is missing", () => {
    expect(() =>
      loadOpenAIGameMasterInterviewerConfig({
        OPENAI_GAME_MASTER_MODEL: "gpt-5.4-mini",
      }),
    ).toThrow(GameMasterInterviewerError);

    expect(() =>
      loadOpenAIGameMasterInterviewerConfig({
        OPENAI_GAME_MASTER_MODEL: "gpt-5.4-mini",
      }),
    ).toThrow("OPENAI_API_KEY is required");
  });

  it("fails clearly when the Game Master model is missing", () => {
    expect(() =>
      loadOpenAIGameMasterInterviewerConfig({
        OPENAI_API_KEY: "sk-test",
      }),
    ).toThrow("OPENAI_GAME_MASTER_MODEL is required");
  });

  it("returns trimmed OpenAI interviewer config", () => {
    expect(
      loadOpenAIGameMasterInterviewerConfig({
        OPENAI_API_KEY: "  sk-test  ",
        OPENAI_GAME_MASTER_MODEL: "  gpt-5.4-mini  ",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-5.4-mini" });
  });
});
