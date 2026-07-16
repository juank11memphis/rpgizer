import { EvalBlockedPanel } from "./eval-blocked-panel";
import { EvalCellDetailDrawer } from "./eval-cell-detail-drawer";
import { EvalFilterBar } from "./eval-filter-bar";
import { EvalMatrixTable } from "./eval-matrix-table";
import type { EvalCellSelection, EvalMatrixShellCell, EvalMatrixViewModel } from "./eval-matrix-types";
import type { EvalMatrixCellNavigationDirection, EvalMatrixCellNavigationMode } from "./eval-matrix-view-model";
import { EvalSummaryBar } from "./eval-summary-bar";
import { EvalTestCaseList } from "./eval-test-case-list";

type EvalMatrixScreenProps = {
  viewModel: EvalMatrixViewModel;
  onRunSelectedEval: () => void;
  failuresOnly?: boolean;
  searchQuery?: string;
  visibleVariantIds?: string[];
  selectedCell?: EvalMatrixShellCell | null;
  onFailuresOnlyChange?: (value: boolean) => void;
  onSearchQueryChange?: (value: string) => void;
  onVisibleVariantIdsChange?: (variantIds: string[]) => void;
  onSelectCell?: (selection: EvalCellSelection, mode: EvalMatrixCellNavigationMode) => void;
  onCloseCellDetail?: () => void;
  onCellButtonRef?: (selection: EvalCellSelection, mode: EvalMatrixCellNavigationMode, element: HTMLButtonElement | null) => void;
  onCellArrowNavigation?: (
    selection: EvalCellSelection,
    direction: EvalMatrixCellNavigationDirection,
    mode: EvalMatrixCellNavigationMode,
  ) => void;
};

export function EvalMatrixScreen({
  viewModel,
  onRunSelectedEval,
  failuresOnly = false,
  searchQuery = "",
  visibleVariantIds = viewModel.variants.map((variant) => variant.id),
  selectedCell = null,
  onFailuresOnlyChange = () => undefined,
  onSearchQueryChange = () => undefined,
  onVisibleVariantIdsChange = () => undefined,
  onSelectCell = () => undefined,
  onCloseCellDetail = () => undefined,
  onCellButtonRef = () => undefined,
  onCellArrowNavigation = () => undefined,
}: EvalMatrixScreenProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-3 py-4 text-slate-100 sm:px-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <header className="sticky top-0 z-20 border border-slate-700 bg-slate-950/95 px-4 py-3 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {viewModel.eyebrow}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
                  {viewModel.title}
                </h1>
                <p className="text-sm font-medium text-blue-200">{viewModel.selectedSuite.name}</p>
              </div>
              <p className="mt-1 text-sm text-slate-400">{viewModel.statusMessage}</p>
            </div>
            <button
              type="button"
              onClick={onRunSelectedEval}
              disabled={viewModel.action.disabled}
              className="min-h-11 border border-blue-400 bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-400"
            >
              {viewModel.action.label}
            </button>
          </div>
          <EvalSummaryBar viewModel={viewModel} />
          <EvalFilterBar
            filters={viewModel.filters}
            variants={viewModel.variants}
            failuresOnly={failuresOnly}
            searchQuery={searchQuery}
            visibleVariantIds={visibleVariantIds}
            onFailuresOnlyChange={onFailuresOnlyChange}
            onSearchQueryChange={onSearchQueryChange}
            onVisibleVariantIdsChange={onVisibleVariantIdsChange}
          />
        </header>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          Status: {viewModel.statusLabel}. {viewModel.progress.label}.
        </div>

        {viewModel.status === "blocked" ? (
          <EvalBlockedPanel viewModel={viewModel} />
        ) : (
          <section aria-label="Eval results" className="flex flex-col gap-3">
            <EvalTestCaseList
              rows={viewModel.rows}
              onSelectCell={onSelectCell}
              onCellButtonRef={onCellButtonRef}
              onCellArrowNavigation={onCellArrowNavigation}
            />
            <EvalMatrixTable
              rows={viewModel.rows}
              variants={viewModel.variants}
              onSelectCell={onSelectCell}
              onCellButtonRef={onCellButtonRef}
              onCellArrowNavigation={onCellArrowNavigation}
            />
          </section>
        )}

        {selectedCell ? <EvalCellDetailDrawer cell={selectedCell} onClose={onCloseCellDetail} /> : null}
      </div>
    </main>
  );
}
