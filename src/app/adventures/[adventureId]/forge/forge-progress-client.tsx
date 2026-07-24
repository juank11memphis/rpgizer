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
};

type ForgeClientStatus = ForgeConnectionViewState | "complete";

const STALL_THRESHOLD_MS = 75_000;

export function ForgeProgressClient({ adventureId, eventsUrl }: ForgeProgressClientProps) {
  const { push } = useRouter();
  const [retryKey, restartConnection] = useReducer((value: number) => value + 1, 0);
  const [snapshot, setSnapshot] = useState<ForgeProgressSnapshot>(() =>
    createInitialForgeProgressSnapshot(),
  );
  const [status, setStatus] = useState<ForgeClientStatus>("progress");
  const stages = useMemo(() => buildForgeRoadStageViews(snapshot), [snapshot]);

  useEffect(() => {
    let terminal = false;
    const source = new EventSource(buildEventSourceUrl(eventsUrl, retryKey));
    const stallTimer = window.setTimeout(() => {
      if (!terminal) {
        terminal = true;
        source.close();
        setStatus("paused");
      }
    }, STALL_THRESHOLD_MS);

    source.addEventListener(FORGE_SSE_EVENT_NAMES.connected, () => {
      if (!terminal) {
        setStatus("progress");
      }
    });

    source.addEventListener(FORGE_SSE_EVENT_NAMES.progress, (event) => {
      if (terminal) return;
      const envelope = parseSseEnvelope(event.data);
      setSnapshot((currentSnapshot) =>
        envelope ? applyForgeProgressEvent(currentSnapshot, envelope.data) : currentSnapshot,
      );
      setStatus("progress");
    });

    source.addEventListener(FORGE_SSE_EVENT_NAMES.complete, (event) => {
      if (terminal) return;
      terminal = true;
      window.clearTimeout(stallTimer);
      source.close();
      setStatus("complete");

      const envelope = parseSseEnvelope<ForgeCompletePayload>(event.data);
      push(envelope?.data.destination ?? `/adventures/${adventureId}`);
    });

    source.addEventListener(FORGE_SSE_EVENT_NAMES.error, (event) => {
      if (terminal) return;

      const eventData = readMessageEventData(event);
      if (!eventData) {
        return;
      }

      terminal = true;
      window.clearTimeout(stallTimer);
      source.close();

      const envelope = parseSseEnvelope<ForgeErrorPayload>(eventData);
      if (envelope?.data.canRetry) {
        setStatus("paused");
        return;
      }

      setStatus("paused");
    });

    source.onerror = () => {
      if (!terminal) {
        setStatus("reconnecting");
      }
    };

    return () => {
      terminal = true;
      window.clearTimeout(stallTimer);
      source.close();
    };
  }, [adventureId, eventsUrl, retryKey, push]);

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
