import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_AI_PAYLOAD_LOG_MAX_CHARS,
  DEFAULT_LOG_FILE_NAME,
  loadServerLoggingConfig,
  type LoggingEnvironment,
} from "./config";

describe("loadServerLoggingConfig", () => {
  it("uses safe defaults when logging environment values are missing", () => {
    const config = loadServerLoggingConfig({});

    expect(config).toEqual({
      logToFile: false,
      filePath: path.join(process.cwd(), DEFAULT_LOG_FILE_NAME),
      aiPayloadLoggingEnabled: false,
      aiPayloadLogMaxChars: DEFAULT_AI_PAYLOAD_LOG_MAX_CHARS,
    });
  });

  it.each<LoggingEnvironment>([
    { LOG_TO_FILE: "" },
    { LOG_TO_FILE: "true" },
    { LOG_TO_FILE: "0" },
    { LOG_TO_FILE: " 1 " },
  ])("treats LOG_TO_FILE=$LOG_TO_FILE as disabled", (environment) => {
    expect(loadServerLoggingConfig(environment).logToFile).toBe(false);
  });

  it("enables file logging only when LOG_TO_FILE is exactly 1", () => {
    expect(loadServerLoggingConfig({ LOG_TO_FILE: "1" }).logToFile).toBe(true);
  });

  it("uses a trimmed LOG_FILE_PATH override", () => {
    const config = loadServerLoggingConfig({
      LOG_TO_FILE: "1",
      LOG_FILE_PATH: "  /tmp/rpgizer-test.log  ",
    });

    expect(config.filePath).toBe("/tmp/rpgizer-test.log");
  });

  it.each<LoggingEnvironment>([
    { LOG_FILE_PATH: "" },
    { LOG_FILE_PATH: "   " },
  ])("falls back to the default file path for blank LOG_FILE_PATH values", (environment) => {
    expect(loadServerLoggingConfig(environment).filePath).toBe(
      path.join(process.cwd(), DEFAULT_LOG_FILE_NAME),
    );
  });

  it("enables AI payload logging only when AI_PAYLOAD_LOGGING_ENABLED is exactly 1", () => {
    expect(
      loadServerLoggingConfig({ AI_PAYLOAD_LOGGING_ENABLED: "1" }).aiPayloadLoggingEnabled,
    ).toBe(true);
  });

  it.each<LoggingEnvironment>([
    {},
    { AI_PAYLOAD_LOGGING_ENABLED: "" },
    { AI_PAYLOAD_LOGGING_ENABLED: "true" },
    { AI_PAYLOAD_LOGGING_ENABLED: "0" },
    { AI_PAYLOAD_LOGGING_ENABLED: "false" },
    { AI_PAYLOAD_LOGGING_ENABLED: " 1 " },
  ])(
    "treats AI_PAYLOAD_LOGGING_ENABLED=$AI_PAYLOAD_LOGGING_ENABLED as disabled",
    (environment) => {
      expect(loadServerLoggingConfig(environment).aiPayloadLoggingEnabled).toBe(false);
    },
  );

  it("uses a positive integer AI payload max character override", () => {
    expect(
      loadServerLoggingConfig({ AI_PAYLOAD_LOG_MAX_CHARS: " 512 " }).aiPayloadLogMaxChars,
    ).toBe(512);
  });

  it.each<LoggingEnvironment>([
    {},
    { AI_PAYLOAD_LOG_MAX_CHARS: "" },
    { AI_PAYLOAD_LOG_MAX_CHARS: "   " },
    { AI_PAYLOAD_LOG_MAX_CHARS: "0" },
    { AI_PAYLOAD_LOG_MAX_CHARS: "-1" },
    { AI_PAYLOAD_LOG_MAX_CHARS: "10.5" },
    { AI_PAYLOAD_LOG_MAX_CHARS: "not-a-number" },
  ])("falls back for invalid AI_PAYLOAD_LOG_MAX_CHARS values", (environment) => {
    expect(loadServerLoggingConfig(environment).aiPayloadLogMaxChars).toBe(
      DEFAULT_AI_PAYLOAD_LOG_MAX_CHARS,
    );
  });
});
