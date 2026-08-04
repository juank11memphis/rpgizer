import type { InventoryItemView } from "./adventure-detail-menu-types";

type InventoryItemCardProps = {
  item: InventoryItemView;
  isSelected: boolean;
  onSelect: (itemId: string) => void;
};

export function InventoryItemCard({ item, isSelected, onSelect }: InventoryItemCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(item.id)}
      className={`min-h-28 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
        isSelected
          ? "border-amber-200/70 bg-amber-200/10 shadow-[0_0_24px_rgba(251,191,36,0.16)]"
          : "border-amber-200/15 bg-black/25 hover:border-amber-200/40 hover:bg-amber-200/5"
      }`}
    >
      <span className="block font-serif text-lg leading-tight text-amber-100">{item.name}</span>
      <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
        {item.statusLabel}
      </span>
      <span className="mt-3 line-clamp-3 block text-sm leading-5 text-stone-300">{item.purpose}</span>
    </button>
  );
}
