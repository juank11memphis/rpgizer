"use client";

import type { EvalCellArtifact } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

import { CopyablePreBlock } from "./eval-copyable-pre-block";

type EvalRawArtifactDetailProps = {
  artifact: EvalCellArtifact;
};

export function EvalRawArtifactDetail({ artifact }: EvalRawArtifactDetailProps) {
  const displayedContent = artifact.value ?? artifact.preview;

  return (
    <details className="border border-slate-800 bg-slate-900/70 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        {artifact.label} · Local only
      </summary>
      {displayedContent ? (
        <CopyablePreBlock
          title={artifact.label}
          copyLabel={`Copy raw artifact ${artifact.label}`}
          content={displayedContent}
          headingLevel="h4"
          className="mt-2"
        />
      ) : (
        <p className="mt-2 text-sm text-slate-400">Artifact not available.</p>
      )}
    </details>
  );
}
