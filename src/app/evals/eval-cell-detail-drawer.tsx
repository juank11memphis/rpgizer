"use client";

import { type KeyboardEvent, useEffect, useId, useRef } from "react";

import { CopyablePreBlock } from "./eval-copyable-pre-block";
import type { EvalMatrixShellCell } from "./eval-matrix-types";
import { EvalRawArtifactDetail } from "./eval-raw-artifact-detail";

type EvalCellDetailDrawerProps = {
  cell: EvalMatrixShellCell;
  onClose: () => void;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "details summary",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function EvalCellDetailDrawer({ cell, onClose }: EvalCellDetailDrawerProps) {
  const detail = cell.detail;
  const titleId = useId();
  const descriptionId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [cell.id]);

  if (!detail) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements(drawerRef.current);

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-slate-950/70 md:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className="fixed inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-slate-950/70 md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:h-[calc(100vh-2rem)] md:max-h-none md:w-[80vw] md:max-w-[72rem]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cell detail</p>
            <h2 id={titleId} className="mt-1 font-mono text-lg font-semibold text-slate-50">{cell.testCaseName}</h2>
            <p id={descriptionId} className="mt-1 text-sm text-slate-300">
              {cell.statusLabel} · {cell.variantName} · {cell.variantModelLabel}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="min-h-10 border border-slate-700 px-3 text-sm font-semibold text-slate-200 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="Close cell detail"
          >
            ✕
          </button>
        </div>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-slate-100">Assertions</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {detail.assertions.map((assertion) => {
              const assertionStatusLabel = assertion.status === "passed" ? "Passed" : "Failed";

              return (
                <li key={assertion.id} className="border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200">
                  <span className={assertion.status === "passed" ? "text-emerald-300" : "text-rose-300"} aria-hidden="true">
                    {assertion.status === "passed" ? "✓" : "✕"}
                  </span>{" "}
                  <span className="font-semibold">{assertionStatusLabel}: {assertion.label}</span>
                  {assertion.message ? <p className="mt-1 text-xs text-slate-400">{assertion.message}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-slate-100">Diagnostics</h3>
          {detail.diagnostics.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No diagnostics.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-300">
              {detail.diagnostics.map((diagnostic, index) => (
                <li key={`${diagnostic.code ?? diagnostic.scope}-${index}`} className="border border-slate-800 bg-slate-900/70 p-3">
                  {diagnostic.message}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-slate-100">Raw artifacts</h3>
          <div className="mt-2 flex flex-col gap-2">
            {detail.artifacts.map((artifact) => (
              <EvalRawArtifactDetail key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) {
    return [];
  }

  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);
}
