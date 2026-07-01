import Link from "next/link";
import type { ReactNode } from "react";

type DashboardActionProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function DashboardAction({
  href,
  children,
  variant = "primary",
}: DashboardActionProps) {
  const className =
    variant === "primary"
      ? "inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-amber-200 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 px-6 text-center font-bold uppercase tracking-[0.12em] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_34px_rgba(245,158,11,0.28)] outline-none transition hover:-translate-y-0.5 hover:from-amber-100 hover:to-amber-600 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d] active:translate-y-0"
      : "inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-amber-200/35 bg-black/35 px-6 text-center font-bold uppercase tracking-[0.12em] text-amber-100 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.35)] outline-none transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-950/25 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d] active:translate-y-0";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
