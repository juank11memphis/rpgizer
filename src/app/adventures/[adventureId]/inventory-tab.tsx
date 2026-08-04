import type { InventoryTabView } from "./adventure-detail-menu-types";

type InventoryTabProps = {
  inventory: InventoryTabView;
};

export function InventoryTab({ inventory }: InventoryTabProps) {
  const firstItem = inventory.items[0];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
      <div className="rounded-xl border border-amber-200/15 bg-black/25 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          {inventory.label}
        </p>
        <h2 className="mt-3 font-serif text-2xl text-amber-100">Readiness gear</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">{inventory.description}</p>
        <p className="mt-4 text-sm text-stone-200">
          {inventory.items.length > 0 ? `${inventory.items.length} items on the path.` : inventory.emptyMessage}
        </p>
      </div>
      <div className="rounded-xl border border-amber-200/15 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          Selected item
        </p>
        {firstItem ? (
          <div className="mt-3 space-y-2">
            <p className="font-serif text-xl text-amber-100">{firstItem.name}</p>
            <p className="text-sm text-emerald-100">{firstItem.statusLabel}</p>
            <p className="text-sm leading-6 text-stone-300">{firstItem.purpose}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-300">{inventory.emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
