import type { EvalMatrixFilters } from "./eval-matrix-types";
import type { EvalPromptModelVariant } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

type EvalFilterBarProps = {
  filters: EvalMatrixFilters;
  variants: EvalPromptModelVariant[];
};

export function EvalFilterBar({ filters, variants }: EvalFilterBarProps) {
  return (
    <section aria-label="Eval filters" className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3 md:flex-row md:items-center">
      <label className="flex min-h-11 items-center gap-2 border border-slate-800 bg-slate-900/70 px-3 text-sm text-slate-200">
        <input type="checkbox" className="h-4 w-4 accent-blue-400" />
        {filters.failuresOnlyLabel}
      </label>
      <label className="flex min-h-11 flex-1 items-center gap-2 border border-slate-800 bg-slate-900/70 px-3 text-sm text-slate-400">
        <span className="sr-only">{filters.searchLabel}</span>
        <input
          type="search"
          placeholder={filters.searchPlaceholder}
          className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 border border-slate-800 bg-slate-900/70 px-3 text-sm text-slate-200">
        <span>{filters.variantLabel}</span>
        <select className="bg-slate-950 px-2 py-1 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300">
          {variants.map((variant) => (
            <option key={variant.id}>{variant.name}</option>
          ))}
        </select>
      </label>
    </section>
  );
}
