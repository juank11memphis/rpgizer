import type { AdventureDetailMenuView } from "./adventure-detail-menu-types";
import { AdventureDetailMenuClient } from "./adventure-detail-menu-client";
import { AdventureMenuShell } from "./adventure-menu-shell";

type AdventureDetailMenuScreenProps = {
  menu: AdventureDetailMenuView;
};

export function AdventureDetailMenuScreen({ menu }: AdventureDetailMenuScreenProps) {
  return (
    <AdventureMenuShell header={menu.header}>
      <AdventureDetailMenuClient menu={menu} />
    </AdventureMenuShell>
  );
}
