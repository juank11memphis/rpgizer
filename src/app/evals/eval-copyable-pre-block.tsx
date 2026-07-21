"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

type CopyablePreBlockProps = {
  title: string;
  copyLabel: string;
  content: string;
  headingLevel?: "h3" | "h4";
  className?: string;
};

const copyFeedbackDurationMs = 1600;

export function CopyablePreBlock({
  title,
  copyLabel,
  content,
  headingLevel = "h3",
  className,
}: CopyablePreBlockProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Heading = headingLevel;

  useEffect(() => () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
  }, []);

  async function handleCopy() {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    resetTimerRef.current = setTimeout(() => {
      setCopyState("idle");
      resetTimerRef.current = null;
    }, copyFeedbackDurationMs);
  }

  return (
    <section className={className}>
      <div className="flex items-center justify-between gap-3">
        <Heading className="text-sm font-semibold text-slate-100">{title}</Heading>
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-8 border border-slate-700 px-2 text-xs font-semibold text-slate-200 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label={copyLabel}
        >
          {getCopyButtonLabel(copyState)}
        </button>
      </div>
      <pre className="mt-2 whitespace-pre-wrap border border-slate-800 bg-slate-900/70 p-3 font-mono text-xs text-slate-200">
        {content}
      </pre>
    </section>
  );
}

function getCopyButtonLabel(copyState: CopyState): string {
  if (copyState === "copied") {
    return "Copied";
  }

  if (copyState === "failed") {
    return "Copy failed";
  }

  return "Copy";
}
