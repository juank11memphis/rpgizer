"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useState } from "react";

import {
  FORGE_SSE_EVENT_NAMES,
  type ForgeCompletePayload,
  type ForgeErrorPayload,
  type ForgeSseEnvelope,
} from "./events/forge-sse";
import {
  applyForgeProgressEvent,
  buildForgeRoadStageViews,
  createInitialForgeProgressSnapshot,
} from "./forge-progress-model";
import { ForgeProgressScreen } from "./forge-progress-screen";
import type { ForgeConnectionViewState, ForgeProgressSnapshot } from "./forge-progress-types";

type ForgeProgressClientProps = {
  adventureId: string;
  eventsUrl: string;
  travelerTestMode?: boolean;
};

type ForgeClientStatus = ForgeConnectionViewState | "complete";

const STALL_THRESHOLD_MS = 75_000;

const FORGE_TEST_INTERVAL_MS = 2_000;

const FORGE_TEST_PROGRESS_EVENTS = [
  { stage: "quest_lore", status: "started" },
  { stage: "adventure_roadmap", status: "started" },
  { stage: "connections", status: "started" },
  { stage: "xp_rewards", status: "started" },
  { stage: "opening_adventure", status: "started" },
] as const;

export function ForgeProgressClient({
  adventureId,
  eventsUrl,
  travelerTestMode = false,
}: ForgeProgressClientProps) {
  const { push } = useRouter();
  const [retryKey, restartConnection] = useReducer((value: number) => value + 1, 0);
  const [snapshot, setSnapshot] = useState<ForgeProgressSnapshot>(() =>
    createInitialForgeProgressSnapshot(),
  );
  const [status, setStatus] = useState<ForgeClientStatus>("progress");
  const stages = useMemo(() => buildForgeRoadStageViews(snapshot), [snapshot]);

  useEffect(() => {
    if (travelerTestMode) {
      let stageIndex = 0;
      const interval = window.setInterval(() => {
        stageIndex = (stageIndex + 1) % FORGE_TEST_PROGRESS_EVENTS.length;
        setSnapshot((currentSnapshot) =>
          applyForgeProgressEvent(currentSnapshot, FORGE_TEST_PROGRESS_EVENTS[stageIndex]),
        );
      }, FORGE_TEST_INTERVAL_MS);

      return () => {
        window.clearInterval(interval);
      };
    }

    let terminal = false;
    let stallTimer: number | undefined;
    const source = new EventSource(buildEventSourceUrl(eventsUrl, retryKey));

    const clearStallTimer = () => {
      if (stallTimer !== undefined) {
        window.clearTimeout(stallTimer);
        stallTimer = undefined;
      }
    };

    const startStallTimer = () => {
      clearStallTimer();
      stallTimer = window.setTimeout(() => {
        if (!terminal) {
          terminal = true;
          source.close();
          setStatus("paused");
        }
      }, STALL_THRESHOLD_MS);
    };

    const closeTerminalStream = () => {
      terminal = true;
      clearStallTimer();
      source.close();
    };

    startStallTimer();

    source.addEventListener(FORGE_SSE_EVENT_NAMES.connected, () => {
      if (!terminal) {
        startStallTimer();
        setStatus("progress");
      }
    });

    source.addEventListener(FORGE_SSE_EVENT_NAMES.progress, (event) => {
      if (terminal) return;
      const envelope = parseSseEnvelope(event.data);
      if (!envelope) return;

      startStallTimer();
      setSnapshot((currentSnapshot) => applyForgeProgressEvent(currentSnapshot, envelope.data));
      setStatus("progress");
    });

    source.addEventListener(FORGE_SSE_EVENT_NAMES.complete, (event) => {
      if (terminal) return;
      closeTerminalStream();
      setStatus("complete");

      const envelope = parseSseEnvelope<ForgeCompletePayload>(event.data);
      push(buildForgedDestination(envelope?.data.destination ?? `/adventures/${adventureId}`));
    });

    source.addEventListener(FORGE_SSE_EVENT_NAMES.error, (event) => {
      if (terminal) return;

      const eventData = readMessageEventData(event);
      if (!eventData) {
        return;
      }

      closeTerminalStream();
      parseSseEnvelope<ForgeErrorPayload>(eventData);
      setStatus("paused");
    });

    source.onerror = () => {
      if (!terminal) {
        setStatus("reconnecting");
      }
    };

    return () => {
      closeTerminalStream();
    };
  }, [adventureId, eventsUrl, retryKey, push, travelerTestMode]);

  function tryAgain() {
    setSnapshot(createInitialForgeProgressSnapshot());
    setStatus("progress");
    restartConnection();
  }

  return (
    <ForgeProgressScreen
      adventureId={adventureId}
      stages={stages}
      connectionState={status === "complete" ? "progress" : status}
      onTryAgain={tryAgain}
    />
  );
}

function buildEventSourceUrl(eventsUrl: string, retryKey: number): string {
  if (retryKey === 0) {
    return eventsUrl;
  }

  const separator = eventsUrl.includes("?") ? "&" : "?";
  return `${eventsUrl}${separator}retry=${retryKey}`;
}

function buildForgedDestination(destination: string): string {
  const separator = destination.includes("?") ? "&" : "?";
  return `${destination}${separator}forged=1`;
}

function readMessageEventData(event: Event): string {
  return event instanceof MessageEvent && typeof event.data === "string" ? event.data : "";
}

function parseSseEnvelope<TData = unknown>(data: string): ForgeSseEnvelope<TData> | null {
  try {
    const parsed: unknown = JSON.parse(data);

    if (!isRecord(parsed) || !("data" in parsed)) {
      return null;
    }

    return parsed as ForgeSseEnvelope<TData>;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
