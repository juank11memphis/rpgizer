import type { InventoryItemView } from "./adventure-detail-menu-types";
import { InventoryItemCard } from "./inventory-item-card";

type InventoryItemGridProps = {
  items: InventoryItemView[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
};

export function InventoryItemGrid({ items, selectedItemId, onSelectItem }: InventoryItemGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <InventoryItemCard
          key={item.id}
          item={item}
          isSelected={item.id === selectedItemId}
          onSelect={onSelectItem}
        />
      ))}
    </div>
  );
}
