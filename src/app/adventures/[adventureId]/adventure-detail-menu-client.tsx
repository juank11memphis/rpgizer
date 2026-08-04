"use client";

import { useRef, useState } from "react";

import { AchievementsTab } from "./achievements-tab";
import type { AdventureDetailMenuTabId, AdventureDetailMenuView } from "./adventure-detail-menu-types";
import { AdventureMenuTabs } from "./adventure-menu-tabs";
import { CharacterTab } from "./character-tab";
import { InventoryTab } from "./inventory-tab";
import { JournalTab } from "./journal-tab";

type AdventureDetailMenuClientProps = {
  menu: AdventureDetailMenuView;
};

export function AdventureDetailMenuClient({ menu }: AdventureDetailMenuClientProps) {
  const [selectedTabId, setSelectedTabId] = useState<AdventureDetailMenuTabId>("journal");
  const tabRefs = useRef<Record<AdventureDetailMenuTabId, HTMLButtonElement | null>>({
    journal: null,
    inventory: null,
    character: null,
    achievements: null,
  });

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
        {selectedTabId === "journal" ? <JournalTab journal={menu.journal} /> : null}
        {selectedTabId === "inventory" ? <InventoryTab inventory={menu.inventory} /> : null}
        {selectedTabId === "character" ? <CharacterTab character={menu.character} /> : null}
        {selectedTabId === "achievements" ? <AchievementsTab achievements={menu.achievements} /> : null}
      </div>
    </div>
  );
}
