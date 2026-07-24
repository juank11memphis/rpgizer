"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const FORGED_QUERY_PARAM = "forged";
const FORGED_QUERY_VALUE = "1";
const TOAST_VISIBLE_MS = 4_000;

export function AdventureForgedToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldShowForgedToast = searchParams.get(FORGED_QUERY_PARAM) === FORGED_QUERY_VALUE;
  const [isVisible, setIsVisible] = useState(shouldShowForgedToast);

  useEffect(() => {
    if (!shouldShowForgedToast) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete(FORGED_QUERY_PARAM);
    const nextUrl = nextSearchParams.toString()
      ? `${pathname}?${nextSearchParams.toString()}`
      : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, shouldShowForgedToast]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, TOAST_VISIBLE_MS);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 rounded-2xl border border-emerald-200/30 bg-emerald-950/90 px-4 py-3 text-sm font-bold text-emerald-50 shadow-xl shadow-black/30"
    >
      Adventure forged.
    </div>
  );
}
