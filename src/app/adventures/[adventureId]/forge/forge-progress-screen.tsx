"use client";

import type { ForgeConnectionViewState, ForgeRoadStageView } from "./forge-progress-types";
import { ForgePausedPanel } from "./forge-paused-panel";
import { ForgeRoadScene } from "./forge-road-scene";
import { ForgeStageList } from "./forge-stage-list";

type ForgeProgressScreenProps = {
  adventureId: string;
  stages: readonly ForgeRoadStageView[];
  connectionState: ForgeConnectionViewState;
  onTryAgain?: () => void;
};

export function ForgeProgressScreen({
  adventureId,
  stages,
  connectionState,
  onTryAgain,
}: ForgeProgressScreenProps) {
  const currentStage = stages.find((stage) => stage.state === "current") ?? stages[stages.length - 1];
  const isPaused = connectionState === "paused";
  const helperCopy = connectionState === "reconnecting"
    ? "Still forging…"
    : "The Game Master is forging your Adventure. This can take a moment. Keep this window open while your Adventure is forged.";

  return (
    <main className="min-h-screen overflow-hidden bg-[#07030d] px-5 py-6 text-stone-100 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center">
        <header className="mb-8 flex items-center justify-between border-b border-amber-100/10 pb-4">
          <p className="font-serif text-xl font-bold text-amber-100">RPGizer</p>
        </header>

        <section className="text-center" aria-labelledby="forge-progress-heading">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">
            {isPaused ? "Forge paused" : "Forging Adventure"}
          </p>
          <h1
            id="forge-progress-heading"
            className="mx-auto mt-4 max-w-3xl font-serif text-4xl font-bold tracking-tight text-amber-100 sm:text-5xl lg:text-6xl"
          >
            {isPaused ? "The forge needs another spark." : currentStage.label}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-300" aria-live="polite">
            {isPaused ? "Your interview is safe. Try again, or return to adjust your answers." : helperCopy}
          </p>
        </section>

        <div className="mt-8 space-y-6">
          <ForgeRoadScene stages={stages} isPaused={isPaused} />
          {!isPaused ? <ForgeStageList stages={stages} /> : null}
          {isPaused && onTryAgain ? <ForgePausedPanel adventureId={adventureId} onTryAgain={onTryAgain} /> : null}
        </div>
      </div>
    </main>
  );
}
