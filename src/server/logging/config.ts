import path from "node:path";

export const DEFAULT_LOG_FILE_NAME = "rpgizer.log";

export type LoggingEnvironment = Readonly<Record<string, string | undefined>>;

export type ServerLoggingConfig = Readonly<{
  logToFile: boolean;
  filePath: string;
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
  };
}
