import type { ForgeRoadStageView } from "./forge-progress-types";

type ForgeStageListProps = {
  stages: readonly ForgeRoadStageView[];
};

const stateMarkers: Record<ForgeRoadStageView["state"], string> = {
  completed: "✓",
  current: "●",
  future: "○",
};

const stateLabels: Record<ForgeRoadStageView["state"], string> = {
  completed: "Complete",
  current: "Now",
  future: "Next",
};

export function ForgeStageList({ stages }: ForgeStageListProps) {
  return (
    <ol className="grid gap-3 text-left md:grid-cols-2 lg:grid-cols-5" aria-label="Forge Road stages">
      {stages.map((stage) => (
        <li
          key={stage.key}
          className={[
            "flex items-start gap-3 rounded-2xl border px-4 py-3",
            stage.state === "completed" ? "border-emerald-200/20 bg-emerald-300/10" : "",
            stage.state === "current" ? "border-amber-200/40 bg-amber-300/15" : "",
            stage.state === "future" ? "border-stone-200/10 bg-stone-950/30 opacity-75" : "",
          ].join(" ")}
        >
          <span className="mt-0.5 font-bold text-amber-100" aria-hidden="true">
            {stateMarkers[stage.state]}
          </span>
          <span>
            <span className="block text-sm font-semibold text-stone-100">{stage.label}</span>
            <span className="block text-xs font-medium text-stone-400">{stateLabels[stage.state]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
