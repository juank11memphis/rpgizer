import path from "node:path";

export const DEFAULT_LOG_FILE_NAME = "rpgizer.log";
export const DEFAULT_AI_PAYLOAD_LOG_MAX_CHARS = 2_000;

export type LoggingEnvironment = Readonly<Record<string, string | undefined>>;

export type ServerLoggingConfig = Readonly<{
  logToFile: boolean;
  filePath: string;
  aiPayloadLoggingEnabled: boolean;
  aiPayloadLogMaxChars: number;
}>;

export function loadServerLoggingConfig(
  environment: LoggingEnvironment = process.env,
): ServerLoggingConfig {
  const logToFile = environment.LOG_TO_FILE === "1";
  const configuredFilePath = environment.LOG_FILE_PATH?.trim();

  return {
    logToFile,
    filePath:
      configuredFilePath && configuredFilePath.length > 0
        ? configuredFilePath
        : path.join(process.cwd(), DEFAULT_LOG_FILE_NAME),
    aiPayloadLoggingEnabled: environment.AI_PAYLOAD_LOGGING_ENABLED === "1",
    aiPayloadLogMaxChars: parsePositiveInteger(
      environment.AI_PAYLOAD_LOG_MAX_CHARS,
      DEFAULT_AI_PAYLOAD_LOG_MAX_CHARS,
    ),
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return fallback;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}
