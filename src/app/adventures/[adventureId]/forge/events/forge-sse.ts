import type { ForgeProgressEvent } from "@/modules/game-master-assistant/application/forge-adventure/progress";

export const FORGE_SSE_EVENT_NAMES = {
  connected: "connected",
  progress: "progress",
  complete: "complete",
  error: "error",
} as const;

export type ForgeSseEventName =
  (typeof FORGE_SSE_EVENT_NAMES)[keyof typeof FORGE_SSE_EVENT_NAMES];

export type ForgeSseEnvelope<TData> = Readonly<{
  adventureId: string;
  sequence: number;
  timestamp: string;
  data: TData;
}>;

export type ForgeConnectedPayload = Readonly<{
  status: "connected";
}>;

export type ForgeProgressPayload = ForgeProgressEvent;

export type ForgeCompletePayload = Readonly<{
  adventureId: string;
  generatedAdventureId: string;
  destination: string;
}>;

export type ForgeErrorPayload = Readonly<{
  message: string;
  canRetry: true;
}>;

export type ForgeSseFrameOptions = Readonly<{
  id?: string | number;
}>;

export function createForgeSseEnvelope<TData>(input: {
  adventureId: string;
  sequence: number;
  timestamp: string;
  data: TData;
}): ForgeSseEnvelope<TData> {
  return {
    adventureId: input.adventureId,
    sequence: input.sequence,
    timestamp: input.timestamp,
    data: input.data,
  };
}

export function formatForgeSseEvent<TData>(
  event: ForgeSseEventName,
  envelope: ForgeSseEnvelope<TData>,
  options: ForgeSseFrameOptions = {},
): string {
  const lines = [
    options.id !== undefined ? `id: ${String(options.id)}` : undefined,
    `event: ${event}`,
    ...formatDataLines(envelope),
  ].filter((line): line is string => line !== undefined);

  return `${lines.join("\n")}\n\n`;
}

export function formatForgeSseHeartbeat(comment = "heartbeat"): string {
  return `: ${comment}\n\n`;
}

function formatDataLines(data: unknown): string[] {
  return JSON.stringify(data)
    .split("\n")
    .map((line) => `data: ${line}`);
}
