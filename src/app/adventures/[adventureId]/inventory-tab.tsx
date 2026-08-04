import type { InventoryItemView, InventoryTabView } from "./adventure-detail-menu-types";
import { InventoryItemDetail } from "./inventory-item-detail";
import { InventoryItemGrid } from "./inventory-item-grid";

type InventoryTabProps = {
  inventory: InventoryTabView;
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
};

export function InventoryTab({ inventory, selectedItemId, onSelectItem }: InventoryTabProps) {
  const selectedItem = findSelectedInventoryItem(inventory.items, selectedItemId);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
      <div className="rounded-xl border border-amber-200/15 bg-black/25 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          {inventory.label}
        </p>
        <h2 className="mt-3 font-serif text-2xl text-amber-100">Readiness gear</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">{inventory.description}</p>
        {inventory.items.length > 0 ? (
          <div className="mt-4">
            <InventoryItemGrid items={inventory.items} selectedItemId={selectedItem?.id ?? null} onSelectItem={onSelectItem} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-300">{inventory.emptyMessage}</p>
        )}
      </div>
      <InventoryItemDetail item={selectedItem} emptyMessage={inventory.emptyMessage} />
    </section>
  );
}

function findSelectedInventoryItem(items: InventoryItemView[], selectedItemId: string | null) {
  return items.find((item) => item.id === selectedItemId) ?? items[0] ?? null;
}
