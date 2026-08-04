import type { JournalDetailView } from "./adventure-detail-menu-types";
import { JournalDetailField } from "./journal-detail-field";
import { JournalQuestSteps } from "./journal-quest-steps";

type JournalDetailPanelProps = {
  detail: JournalDetailView | null;
  emptyMessage: string;
};

export function JournalDetailPanel({ detail, emptyMessage }: JournalDetailPanelProps) {
  const isBossFight = detail?.type === "boss_fight";
  const shouldShowSteps = detail ? !isBossFight && detail.steps.length > 0 : false;

  return (
    <aside
      className={`rounded-xl border p-4 ${
        isBossFight
          ? "border-rose-200/35 bg-rose-950/15 shadow-inner shadow-rose-950/20"
          : "border-amber-200/15 bg-black/20"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
        {isBossFight ? "Milestone detail" : "Quest detail"}
      </p>
      {detail ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
              {detail.typeLabel} · {detail.statusLabel}
            </p>
            <h3 className="font-serif text-2xl text-amber-100">{detail.title}</h3>
            {isBossFight ? (
              <p className="rounded-lg border border-rose-200/25 bg-black/20 px-3 py-2 text-sm leading-6 text-rose-100">
                Milestone challenge for this Act.
              </p>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-stone-300">{detail.description}</p>
          {shouldShowSteps ? <JournalQuestSteps key={detail.id} steps={detail.steps} /> : null}
          <JournalDetailField label="Done when" value={detail.doneCondition} />
          <JournalDetailField label="Reward" value={detail.rewardIntent} />
          {detail.skillRewards.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/70">Skill rewards</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-stone-300">
                {detail.skillRewards.map((reward) => (
                  <li key={`${reward.skillId}-${reward.label}`}>{reward.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {detail.linkedInventoryNames.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/70">Inventory</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-stone-300">
                {detail.linkedInventoryNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-stone-300">{emptyMessage}</p>
      )}
    </aside>
  );
}
