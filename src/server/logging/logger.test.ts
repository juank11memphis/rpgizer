import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_AI_PAYLOAD_LOG_MAX_CHARS,
  DEFAULT_LOG_FILE_NAME,
  type ServerLoggingConfig,
} from "./config";
import { createServerLogger } from "./logger";

function createTestConfig(overrides: Partial<ServerLoggingConfig> = {}): ServerLoggingConfig {
  return {
    logToFile: false,
    filePath: path.join(process.cwd(), DEFAULT_LOG_FILE_NAME),
    aiPayloadLoggingEnabled: false,
    aiPayloadLogMaxChars: DEFAULT_AI_PAYLOAD_LOG_MAX_CHARS,
    ...overrides,
  };
}

class MemoryLogStream extends Writable {
  private readonly chunks: string[] = [];

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }

  lines(): string[] {
    return this.chunks
      .join("")
      .split("\n")
      .filter((line) => line.length > 0);
  }
}

type ParsedLogLine = Readonly<{
  level: number;
  time: string;
  event?: string;
  flow?: string;
  message?: string;
}>;

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("createServerLogger", () => {
  it("writes parseable JSON log entries to a stdout-compatible stream by default", () => {
    const stdout = new MemoryLogStream();
    const logger = createServerLogger({
      config: createTestConfig(),
      stdout,
    });

    logger.info({ event: "logging.test.default", flow: "adventure_creation" }, "default output");

    const [line] = stdout.lines();
    const parsed = JSON.parse(line) as ParsedLogLine;

    expect(parsed).toMatchObject({
      level: 30,
      event: "logging.test.default",
      flow: "adventure_creation",
      message: "default output",
    });
    expect(new Date(parsed.time).toString()).not.toBe("Invalid Date");
  });

  it("writes JSON log lines to the configured file when file logging is enabled", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rpgizer-logging-"));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, "test-rpgizer.log");
    const stdout = new MemoryLogStream();
    const logger = createServerLogger({
      config: createTestConfig({ logToFile: true, filePath }),
      stdout,
    });

    logger.warn({ event: "logging.test.file" }, "file output");

    const fileContents = await readFile(filePath, "utf8");
    const [fileLine] = fileContents.split("\n").filter((line) => line.length > 0);
    const parsedFileLine = JSON.parse(fileLine) as ParsedLogLine;

    expect(parsedFileLine).toMatchObject({
      level: 40,
      event: "logging.test.file",
      message: "file output",
    });
    expect(stdout.lines()).toHaveLength(1);
  });

  it("surfaces file setup failures when file logging is explicitly enabled", () => {
    const stdout = new MemoryLogStream();

    expect(() =>
      createServerLogger({
        config: createTestConfig({
          logToFile: true,
          filePath: path.join("/tmp", "missing-rpgizer-dir", "test.log"),
        }),
        stdout,
      }),
    ).toThrow();
  });
});
