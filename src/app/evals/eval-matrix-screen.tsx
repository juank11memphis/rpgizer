import { EvalBlockedPanel } from "./eval-blocked-panel";
import { EvalCellDetailDrawer } from "./eval-cell-detail-drawer";
import { EvalFilterBar } from "./eval-filter-bar";
import { EvalMatrixTable } from "./eval-matrix-table";
import { EvalRunScopeControls } from "./eval-run-scope-controls";
import type {
  EvalCellSelection,
  EvalMatrixRunScope,
  EvalMatrixShellCell,
  EvalMatrixTestCaseRow,
  EvalMatrixViewModel,
} from "./eval-matrix-types";
import type { EvalMatrixCellNavigationDirection, EvalMatrixCellNavigationMode } from "./eval-matrix-view-model";
import { EvalSummaryBar } from "./eval-summary-bar";
import { EvalSuiteDropdown } from "./eval-suite-dropdown";
import { EvalSuiteRail } from "./eval-suite-rail";
import { EvalTestCaseList } from "./eval-test-case-list";

type EvalMatrixScreenProps = {
  viewModel: EvalMatrixViewModel;
  runScope?: EvalMatrixRunScope;
  runTestCaseRows?: EvalMatrixTestCaseRow[];
  runButtonLabel?: string;
  onRunSelectedEval: () => void;
  onRunScopeChange?: (scope: EvalMatrixRunScope) => void;
  onRunTestCase?: (testCaseId: string) => void;
  onSuiteChange?: (suiteId: string) => void;
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
  runScope = { type: "all" },
  runTestCaseRows = viewModel.rows,
  runButtonLabel = viewModel.action.label,
  onRunSelectedEval,
  onRunScopeChange = () => undefined,
  onRunTestCase = () => undefined,
  onSuiteChange = () => undefined,
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
        <header className="border border-slate-700 bg-slate-950 px-4 py-3 shadow-2xl shadow-slate-950/40">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {viewModel.eyebrow}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
            {viewModel.title}
          </h1>
        </header>

        <EvalSuiteDropdown
          suites={viewModel.suites}
          selectedSuite={viewModel.selectedSuite}
          disabled={viewModel.action.disabled}
          onSuiteChange={onSuiteChange}
        />

        <div className="flex gap-3">
          <EvalSuiteRail
            suites={viewModel.suites}
            availableCountLabel={viewModel.availableCountLabel}
            disabled={viewModel.action.disabled}
            onSuiteChange={onSuiteChange}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <section className="sticky top-0 z-20 border border-slate-700 bg-slate-950/95 px-4 py-3 shadow-2xl shadow-slate-950/40 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-50 md:text-xl">
                      {viewModel.selectedSuite.name}
                    </h2>
                    <p className="text-sm font-medium text-blue-200">{viewModel.statusLabel}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{viewModel.selectedSuite.shortDescription}</p>
                  <p className="mt-1 text-sm text-slate-400">{viewModel.statusMessage}</p>
                </div>
                <EvalRunScopeControls
                  runScope={runScope}
                  testCaseRows={runTestCaseRows}
                  disabled={viewModel.action.disabled}
                  runButtonLabel={runButtonLabel}
                  onRunScopeChange={onRunScopeChange}
                  onRunSelectedScope={onRunSelectedEval}
                />
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
            </section>

            <div aria-live="polite" aria-atomic="true" className="sr-only">
              Status: {viewModel.statusLabel}. {viewModel.progress.label}.
            </div>

            {viewModel.status === "blocked" ? (
              <EvalBlockedPanel viewModel={viewModel} />
            ) : (
              <section aria-label="Eval results" className="flex flex-col gap-3">
                <EvalTestCaseList
                  rows={viewModel.rows}
                  isRunDisabled={viewModel.action.disabled}
                  onRunTestCase={onRunTestCase}
                  onSelectCell={onSelectCell}
                  onCellButtonRef={onCellButtonRef}
                  onCellArrowNavigation={onCellArrowNavigation}
                />
                <EvalMatrixTable
                  rows={viewModel.rows}
                  variants={viewModel.variants}
                  isRunDisabled={viewModel.action.disabled}
                  onRunTestCase={onRunTestCase}
                  onSelectCell={onSelectCell}
                  onCellButtonRef={onCellButtonRef}
                  onCellArrowNavigation={onCellArrowNavigation}
                />
              </section>
            )}
          </div>
        </div>

        {selectedCell ? <EvalCellDetailDrawer cell={selectedCell} onClose={onCloseCellDetail} /> : null}
      </div>
    </main>
  );
}
