import { describe, expect, it } from "vitest";

import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";
import {
  loadOpenAIAdventureGenerationConfig,
  loadOpenAIGameMasterInterviewerConfig,
  loadOpenAIInterviewSummaryConfig,
} from "./openai-game-master-interviewer-config";

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

  it("uses the shared default model when a specific model env var is missing", () => {
    expect(
      loadOpenAIGameMasterInterviewerConfig({
        OPENAI_API_KEY: "sk-test",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-5.4-mini" });
  });

  it("returns trimmed OpenAI interviewer config", () => {
    expect(
      loadOpenAIGameMasterInterviewerConfig({
        OPENAI_API_KEY: "  sk-test  ",
        OPENAI_GAME_MASTER_MODEL: "  gpt-5.4-mini  ",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-5.4-mini" });
  });

  it("loads separate model env vars for each OpenAI flow", () => {
    const environment = {
      OPENAI_API_KEY: "sk-test",
      OPENAI_GAME_MASTER_MODEL: "gpt-interview",
      OPENAI_INTERVIEW_SUMMARY_MODEL: "gpt-summary",
      OPENAI_ADVENTURE_GENERATION_MODEL: "gpt-adventure",
    };

    expect(loadOpenAIGameMasterInterviewerConfig(environment).model).toBe("gpt-interview");
    expect(loadOpenAIInterviewSummaryConfig(environment).model).toBe("gpt-summary");
    expect(loadOpenAIAdventureGenerationConfig(environment).model).toBe("gpt-adventure");
  });
});
