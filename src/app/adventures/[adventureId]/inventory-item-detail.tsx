import type { InventoryItemView } from "./adventure-detail-menu-types";

type InventoryItemDetailProps = {
  item: InventoryItemView | null;
  emptyMessage: string;
};

export function InventoryItemDetail({ item, emptyMessage }: InventoryItemDetailProps) {
  return (
    <aside className="rounded-xl border border-amber-200/15 bg-black/20 p-4 lg:min-h-72">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">Item detail</p>
      {item ? (
        <div className="mt-4 space-y-3">
          <h3 className="font-serif text-2xl text-amber-100">{item.name}</h3>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100">{item.statusLabel}</p>
          <p className="text-sm leading-6 text-stone-300">{item.purpose}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-300">{emptyMessage}</p>
      )}
    </aside>
  );
}
