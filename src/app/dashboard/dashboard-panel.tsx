import type { ReactNode } from "react";

type DashboardPanelProps = {
  title: string;
  children: ReactNode;
};

export function DashboardPanel({ title, children }: DashboardPanelProps) {
  return (
    <section className="rounded-sm border border-amber-300/25 bg-[#12070c]/86 p-6 shadow-[0_26px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur sm:p-8">
      <h2 className="font-serif text-xl font-bold tracking-[0.08em] text-amber-100 [text-shadow:0_0_18px_rgba(245,158,11,0.35)]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}
