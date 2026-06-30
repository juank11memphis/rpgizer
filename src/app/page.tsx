import { AdventureLogPreview } from "./adventure-log-preview";
import { FinalCtaSection } from "./final-cta-section";
import { GoalTransformationsSection } from "./goal-transformations-section";
import { HeroSection } from "./hero-section";
import { HowItWorksSection } from "./how-it-works-section";
import { LandingHeader } from "./landing-header";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07030d] text-stone-100">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-10%,rgba(127,29,29,0.58)_0%,rgba(49,18,12,0.52)_28%,rgba(7,3,13,0.98)_72%)]" />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_12%_20%,rgba(180,83,9,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(90deg,rgba(250,204,21,0.06)_1px,transparent_1px),linear-gradient(rgba(250,204,21,0.04)_1px,transparent_1px)] bg-[length:auto,auto,72px_72px,72px_72px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-amber-500/10 to-transparent" />
      <div className="pointer-events-none fixed inset-0 -z-10 shadow-[inset_0_0_180px_rgba(0,0,0,0.92)]" />
      <LandingHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-col px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:px-10">
        <HeroSection />
        <AdventureLogPreview />
        <HowItWorksSection />
        <GoalTransformationsSection />
        <FinalCtaSection />
      </div>
    </main>
  );
}
