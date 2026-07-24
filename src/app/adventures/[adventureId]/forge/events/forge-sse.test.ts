import { describe, expect, it } from "vitest";

import {
  FORGE_SSE_EVENT_NAMES,
  createForgeSseEnvelope,
  formatForgeSseEvent,
  formatForgeSseHeartbeat,
  type ForgeCompletePayload,
} from "./forge-sse";

describe("forge SSE protocol", () => {
  it("formats named connected events with JSON data and a blank line", () => {
    const envelope = createForgeSseEnvelope({
      adventureId: "adventure-1",
      sequence: 1,
      timestamp: "2026-07-24T00:00:00.000Z",
      data: { status: "connected" as const },
    });

    expect(formatForgeSseEvent(FORGE_SSE_EVENT_NAMES.connected, envelope, { id: 1 })).toBe(
      'id: 1\nevent: connected\ndata: {"adventureId":"adventure-1","sequence":1,"timestamp":"2026-07-24T00:00:00.000Z","data":{"status":"connected"}}\n\n',
    );
  });

  it("formats progress, complete, and error as named JSON events", () => {
    const timestamp = "2026-07-24T00:00:00.000Z";
    const progress = createForgeSseEnvelope({
      adventureId: "adventure-1",
      sequence: 2,
      timestamp,
      data: { stage: "quest_lore" as const, status: "started" as const },
    });
    const complete = createForgeSseEnvelope<ForgeCompletePayload>({
      adventureId: "adventure-1",
      sequence: 3,
      timestamp,
      data: {
        adventureId: "adventure-1",
        generatedAdventureId: "generated-adventure-1",
        destination: "/adventures/adventure-1",
      },
    });
    const failure = createForgeSseEnvelope({
      adventureId: "adventure-1",
      sequence: 4,
      timestamp,
      data: { message: "Your interview is safe. Try again when you’re ready.", canRetry: true as const },
    });

    expect(formatForgeSseEvent(FORGE_SSE_EVENT_NAMES.progress, progress)).toContain(
      "event: progress\n",
    );
    expect(formatForgeSseEvent(FORGE_SSE_EVENT_NAMES.complete, complete)).toContain(
      "event: complete\n",
    );
    expect(formatForgeSseEvent(FORGE_SSE_EVENT_NAMES.error, failure)).toContain(
      "event: error\n",
    );
  });

  it("formats heartbeats as SSE comments without visible progress data", () => {
    expect(formatForgeSseHeartbeat()).toBe(": heartbeat\n\n");
    expect(formatForgeSseHeartbeat()).not.toContain("event:");
    expect(formatForgeSseHeartbeat()).not.toContain("data:");
  });
});
