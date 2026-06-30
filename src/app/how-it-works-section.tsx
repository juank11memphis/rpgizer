const steps = [
  {
    number: "I",
    title: "Bring a goal",
    description: "Start with the thing you want to do.",
  },
  {
    number: "II",
    title: "Talk to the Game Master",
    description: "One focused question at a time.",
  },
  {
    number: "III",
    title: "Follow your Adventure",
    description: "Get a roadmap with quests and next actions.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-8 py-16 sm:py-20"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="how-it-works-heading"
          className="text-center font-serif text-4xl font-black text-stone-50 sm:text-5xl"
        >
          How it works
        </h2>
        <div className="mx-auto mt-4 h-px w-32 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="border border-amber-300/22 bg-[#12090c]/80 p-6 shadow-[0_20px_55px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(255,255,255,0.04)]"
            >
              <p className="mb-5 flex h-11 w-11 items-center justify-center border border-amber-300/50 bg-amber-950/35 font-serif font-bold text-amber-100">
                {step.number}
              </p>
              <h3 className="font-serif text-2xl font-bold text-stone-50">{step.title}</h3>
              <p className="mt-3 leading-7 text-stone-300">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
