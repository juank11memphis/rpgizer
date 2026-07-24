import type { ForgeRoadStageView } from "./forge-progress-types";

type ForgeRoadStationProps = {
  stage: ForgeRoadStageView;
};

const stationSymbols: Record<ForgeRoadStageView["state"], string> = {
  completed: "✓",
  current: "●",
  future: "○",
};

export function ForgeRoadStation({ stage }: ForgeRoadStationProps) {
  return (
    <li
      className="relative flex min-w-[7rem] flex-1 flex-col items-center gap-2 text-center md:min-w-0"
      aria-label={`${stage.label}: ${stage.state}`}
    >
      <span
        className={[
          "flex size-12 items-center justify-center rounded-full border text-lg font-bold shadow-lg transition-colors duration-500 motion-reduce:transition-none",
          stage.state === "completed"
            ? "border-emerald-200/70 bg-emerald-300/20 text-emerald-100 shadow-emerald-500/15"
            : "",
          stage.state === "current"
            ? "border-amber-200 bg-amber-300/20 text-amber-100 shadow-amber-400/25 motion-safe:animate-pulse"
            : "",
          stage.state === "future"
            ? "border-stone-400/25 bg-stone-950/40 text-stone-400"
            : "",
        ].join(" ")}
        aria-hidden="true"
      >
        {stationSymbols[stage.state]}
      </span>
      <span
        className={[
          "rounded-full px-2 py-1 text-xs font-semibold capitalize tracking-wide",
          stage.state === "future" ? "text-stone-400" : "text-amber-100",
        ].join(" ")}
      >
        {stage.stationLabel}
      </span>
    </li>
  );
}
