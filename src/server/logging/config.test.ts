import path from "node:path";

import { describe, expect, it } from "vitest";

import {
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
});
