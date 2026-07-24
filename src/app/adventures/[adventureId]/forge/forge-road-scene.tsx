import type { ForgeProgressStage, ForgeRoadStageView } from "./forge-progress-types";
import { ForgeRoadStation } from "./forge-road-station";

const travelerStops: Readonly<Record<ForgeProgressStage, string>> = {
  quest_lore: "8%",
  adventure_roadmap: "29%",
  connections: "50%",
  xp_rewards: "71%",
  opening_adventure: "92%",
};

type ForgeRoadSceneProps = {
  stages: readonly ForgeRoadStageView[];
  isPaused?: boolean;
};

export function ForgeRoadScene({ stages, isPaused = false }: ForgeRoadSceneProps) {
  const currentStage = stages.find((stage) => stage.state === "current") ?? stages[stages.length - 1];

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[2rem] border border-amber-100/15 bg-[radial-gradient(circle_at_50%_0%,rgba(120,53,15,0.45),transparent_42%),linear-gradient(180deg,#17102a_0%,#10091a_45%,#07030d_100%)] p-5 shadow-2xl shadow-black/40",
        isPaused ? "grayscale-[0.35]" : "",
      ].join(" ")}
      aria-label="Forge Road progress scene"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_20%_40%,rgba(251,191,36,0.2),transparent_16%),radial-gradient(circle_at_78%_28%,rgba(167,139,250,0.18),transparent_14%)] motion-safe:animate-pulse motion-reduce:animate-none" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-amber-950/40 to-transparent" />
      <div className="relative min-h-64 md:min-h-72">
        <div className="absolute inset-x-8 top-28 h-1 rounded-full bg-gradient-to-r from-amber-700/40 via-amber-200/50 to-violet-200/35" aria-hidden="true" />
        <ol className="relative z-20 flex snap-x gap-4 overflow-x-auto pb-8 pt-16 md:overflow-visible">
          {stages.map((stage) => (
            <ForgeRoadStation key={stage.key} stage={stage} />
          ))}
        </ol>
        <div
          className="absolute top-36 z-10 -translate-x-1/2 text-center motion-safe:transition-all motion-safe:duration-1000 motion-safe:ease-in-out motion-reduce:transition-none md:top-40"
          style={{ left: travelerStops[currentStage.key] }}
          aria-hidden="true"
          data-testid="cloaked-traveler"
          data-stage={currentStage.key}
        >
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-amber-100/25 bg-stone-950/80 text-2xl shadow-[0_0_30px_rgba(251,191,36,0.22)]">
            🧙
          </div>
          <p className="mt-2 rounded-full bg-stone-950/70 px-3 py-1 text-xs font-semibold text-amber-100">
            cloaked traveler
          </p>
        </div>
      </div>
    </section>
  );
}
