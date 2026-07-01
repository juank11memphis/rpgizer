import type { DashboardAdventureDraft } from "@/modules/game-master-assistant/application/get-dashboard-adventure-draft/output";

import { DashboardAction } from "./dashboard-actions";
import { DashboardPanel } from "./dashboard-panel";
import { DashboardShell } from "./dashboard-shell";

type AdventureDashboardProps = {
  draft: DashboardAdventureDraft | null;
};

export function AdventureDashboard({ draft }: AdventureDashboardProps) {
  if (draft) {
    return (
      <DashboardShell>
        <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-stone-50 [text-shadow:0_6px_30px_rgba(0,0,0,0.85),0_0_18px_rgba(217,119,6,0.2)] sm:text-4xl">
          Welcome back.
        </h1>
        <div className="mt-8 space-y-6">
          <DashboardPanel title="Adventure Draft">
            <p className="text-2xl font-semibold leading-8 text-stone-50">
              {deriveDraftTitle(draft.goalText)}
            </p>
            <p className="mt-2 text-base leading-7 text-stone-300">
              Interview in progress
            </p>
            <div className="mt-7">
              <DashboardAction href={`/adventures/${draft.id}/interview`}>
                Continue Draft
              </DashboardAction>
            </div>
          </DashboardPanel>
          <DashboardAction href="/adventures/new" variant="secondary">
            Start New Adventure
          </DashboardAction>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-stone-50 [text-shadow:0_6px_30px_rgba(0,0,0,0.85),0_0_18px_rgba(217,119,6,0.2)] sm:text-4xl">
        Welcome, adventurer.
      </h1>
      <div className="mt-8">
        <DashboardPanel title="Quest Log">
          <p className="text-2xl font-semibold leading-8 text-stone-50">
            No adventures yet.
          </p>
          <p className="mt-4 max-w-md text-base leading-7 text-stone-300">
            Start with one real goal. I’ll help turn it into a playable path.
          </p>
          <div className="mt-7">
            <DashboardAction href="/adventures/new">Start Adventure</DashboardAction>
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}

function deriveDraftTitle(goalText: string): string {
  const trimmedGoal = goalText.trim();

  if (trimmedGoal.length <= 56) {
    return trimmedGoal;
  }

  return `${trimmedGoal.slice(0, 53).trimEnd()}…`;
}
