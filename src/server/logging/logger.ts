import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";

import { loadServerLoggingConfig, type ServerLoggingConfig } from "./config";

export type LogBindings = Record<string, string | number | boolean | null | undefined>;

export type CreateServerLoggerOptions = Readonly<{
  config?: ServerLoggingConfig;
  stdout?: DestinationStream;
}>;

const LOGGER_OPTIONS: LoggerOptions = {
  messageKey: "message",
  timestamp: pino.stdTimeFunctions.isoTime,
};

export const serverLogger = createServerLogger();

export function createServerLogger(options: CreateServerLoggerOptions = {}): Logger {
  const config = options.config ?? loadServerLoggingConfig();

  if (!config.logToFile) {
    return options.stdout
      ? pino(LOGGER_OPTIONS, options.stdout)
      : pino(LOGGER_OPTIONS);
  }

  const fileDestination = pino.destination({
    dest: config.filePath,
    append: true,
    sync: true,
  });

  const streams = [
    { stream: options.stdout ?? process.stdout },
    { stream: fileDestination },
  ];

  return pino(LOGGER_OPTIONS, pino.multistream(streams));
}

export function createServerChildLogger(bindings: LogBindings): Logger {
  return serverLogger.child(bindings);
}
