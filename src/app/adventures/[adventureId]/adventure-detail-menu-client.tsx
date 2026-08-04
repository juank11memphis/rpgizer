"use client";

import { useRef, useState } from "react";

import { AchievementsTab } from "./achievements-tab";
import type { AdventureDetailMenuTabId, AdventureDetailMenuView, JournalActView } from "./adventure-detail-menu-types";
import { AdventureMenuTabs } from "./adventure-menu-tabs";
import { CharacterTab } from "./character-tab";
import { InventoryTab } from "./inventory-tab";
import { JournalTab } from "./journal-tab";

type AdventureDetailMenuClientProps = {
  menu: AdventureDetailMenuView;
};

export function AdventureDetailMenuClient({ menu }: AdventureDetailMenuClientProps) {
  const [selectedTabId, setSelectedTabId] = useState<AdventureDetailMenuTabId>("journal");
  const [selectedJournalActId, setSelectedJournalActId] = useState<string | null>(() =>
    getInitialJournalActId(menu.journal.acts, menu.journal.defaultSelectedActId),
  );
  const [selectedJournalDetailId, setSelectedJournalDetailId] = useState<string | null>(() => {
    const selectedAct = findJournalAct(menu.journal.acts, menu.journal.defaultSelectedActId) ?? menu.journal.acts[0] ?? null;

    return getInitialJournalDetailId(selectedAct, menu.journal.defaultSelectedDetailId);
  });
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(
    () => menu.inventory.defaultSelectedItemId ?? menu.inventory.items[0]?.id ?? null,
  );
  const [selectedCharacterSkillId, setSelectedCharacterSkillId] = useState<string | null>(
    () => menu.character.defaultSelectedSkillId ?? menu.character.skills[0]?.id ?? null,
  );
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(
    () => menu.achievements.defaultSelectedAchievementId ?? menu.achievements.achievements[0]?.id ?? null,
  );
  const tabRefs = useRef<Record<AdventureDetailMenuTabId, HTMLButtonElement | null>>({
    journal: null,
    inventory: null,
    character: null,
    achievements: null,
  });

  function selectJournalAct(actId: string) {
    const selectedAct = findJournalAct(menu.journal.acts, actId);

    setSelectedJournalActId(selectedAct?.id ?? null);
    setSelectedJournalDetailId(getInitialJournalDetailId(selectedAct ?? null, null));
  }

  return (
    <div className="flex flex-col gap-5">
      <AdventureMenuTabs
        tabs={menu.tabs}
        selectedTabId={selectedTabId}
        tabRefs={tabRefs}
        onSelectTab={setSelectedTabId}
      />
      <div
        id={`adventure-menu-panel-${selectedTabId}`}
        role="tabpanel"
        aria-labelledby={`adventure-menu-tab-${selectedTabId}`}
        className="rounded-2xl border border-amber-200/15 bg-[#16091f]/80 p-4 shadow-inner shadow-black/30 sm:p-5"
      >
        {selectedTabId === "journal" ? (
          <JournalTab
            journal={menu.journal}
            selectedActId={selectedJournalActId}
            selectedDetailId={selectedJournalDetailId}
            onSelectAct={selectJournalAct}
            onSelectDetail={setSelectedJournalDetailId}
          />
        ) : null}
        {selectedTabId === "inventory" ? (
          <InventoryTab
            inventory={menu.inventory}
            selectedItemId={selectedInventoryItemId}
            onSelectItem={setSelectedInventoryItemId}
          />
        ) : null}
        {selectedTabId === "character" ? (
          <CharacterTab
            character={menu.character}
            selectedSkillId={selectedCharacterSkillId}
            onSelectSkill={setSelectedCharacterSkillId}
          />
        ) : null}
        {selectedTabId === "achievements" ? (
          <AchievementsTab
            achievements={menu.achievements}
            selectedAchievementId={selectedAchievementId}
            onSelectAchievement={setSelectedAchievementId}
          />
        ) : null}
      </div>
    </div>
  );
}

function getInitialJournalActId(acts: JournalActView[], defaultSelectedActId: string | null) {
  return findJournalAct(acts, defaultSelectedActId)?.id ?? acts[0]?.id ?? null;
}

function getInitialJournalDetailId(act: JournalActView | null, defaultSelectedDetailId: string | null) {
  if (!act) {
    return null;
  }

  const details = getJournalActDetails(act);
  return details.find((detail) => detail.id === defaultSelectedDetailId)?.id ?? details[0]?.id ?? null;
}

function findJournalAct(acts: JournalActView[], actId: string | null) {
  return acts.find((act) => act.id === actId) ?? null;
}

function getJournalActDetails(act: JournalActView) {
  return [...act.mainQuests, ...act.sideQuests, ...act.bossFights];
}
