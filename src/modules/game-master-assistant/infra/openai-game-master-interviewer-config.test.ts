import { describe, expect, it } from "vitest";

import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";
import {
  loadOpenAIAdventureContentConfig,
  loadOpenAIAdventureDependencyLinkerConfig,
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
      OPENAI_ADVENTURE_CONTENT_MODEL: "gpt-content",
      OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL: "gpt-linker",
    };

    expect(loadOpenAIGameMasterInterviewerConfig(environment).model).toBe("gpt-interview");
    expect(loadOpenAIInterviewSummaryConfig(environment).model).toBe("gpt-summary");
    expect(loadOpenAIAdventureGenerationConfig(environment).model).toBe("gpt-adventure");
    expect(loadOpenAIAdventureContentConfig(environment).model).toBe("gpt-content");
    expect(loadOpenAIAdventureDependencyLinkerConfig(environment).model).toBe("gpt-linker");
  });

  it("keeps Adventure content model defaults aligned with Adventure generation", () => {
    expect(
      loadOpenAIAdventureContentConfig({
        OPENAI_API_KEY: "sk-test",
        OPENAI_ADVENTURE_GENERATION_MODEL: "gpt-adventure",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-adventure" });

    expect(
      loadOpenAIAdventureContentConfig({
        OPENAI_API_KEY: "sk-test",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-5.4-mini" });
  });
  it("keeps Adventure dependency linker model defaults aligned with Adventure generation", () => {
    expect(
      loadOpenAIAdventureDependencyLinkerConfig({
        OPENAI_API_KEY: "sk-test",
        OPENAI_ADVENTURE_GENERATION_MODEL: "gpt-adventure",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-adventure" });

    expect(
      loadOpenAIAdventureDependencyLinkerConfig({
        OPENAI_API_KEY: "sk-test",
      }),
    ).toEqual({ apiKey: "sk-test", model: "gpt-5.4-mini" });
  });

});
