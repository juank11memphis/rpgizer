import type { KeyboardEvent, RefObject } from "react";

import type { AdventureDetailMenuTabId, AdventureDetailMenuTabView } from "./adventure-detail-menu-types";

type AdventureMenuTabsProps = {
  tabs: AdventureDetailMenuTabView[];
  selectedTabId: AdventureDetailMenuTabId;
  tabRefs: RefObject<Record<AdventureDetailMenuTabId, HTMLButtonElement | null>>;
  onSelectTab: (tabId: AdventureDetailMenuTabId) => void;
};

export function AdventureMenuTabs({ tabs, selectedTabId, tabRefs, onSelectTab }: AdventureMenuTabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, tabId: AdventureDetailMenuTabId) {
    const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
    const lastIndex = tabs.length - 1;
    const nextTabByKey: Partial<Record<string, AdventureDetailMenuTabView>> = {
      ArrowLeft: tabs[currentIndex === 0 ? lastIndex : currentIndex - 1],
      ArrowRight: tabs[currentIndex === lastIndex ? 0 : currentIndex + 1],
      Home: tabs[0],
      End: tabs[lastIndex],
    };
    const nextTab = nextTabByKey[event.key];

    if (!nextTab) {
      return;
    }

    event.preventDefault();
    onSelectTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  }

  return (
    <div
      aria-label="Adventure menu sections"
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
    >
      {tabs.map((tab) => {
        const selected = tab.id === selectedTabId;

        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            id={`adventure-menu-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`adventure-menu-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, tab.id)}
            className={
              selected
                ? "min-h-11 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-200/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-amber-100 shadow-lg shadow-amber-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
                : "min-h-11 whitespace-nowrap rounded-lg border border-amber-300/25 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-stone-300 transition hover:border-amber-200/70 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
