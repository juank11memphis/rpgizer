const transformations = [
  {
    goal: "Learn guitar",
    details: ["Practice quests", "First-song boss fight", "Rhythm + Chords skills"],
  },
  {
    goal: "Organize my home",
    details: ["Room-by-room quests", "Declutter inventory", "Guest-ready boss"],
  },
  {
    goal: "Plan a Japan trip",
    details: ["Phases", "Passport inventory", "Booking readiness"],
  },
];

export function GoalTransformationsSection() {
  return (
    <section className="py-4 sm:py-8" aria-labelledby="goal-transformations-heading">
      <div className="mx-auto max-w-5xl">
        <h2
          id="goal-transformations-heading"
          className="text-center font-serif text-4xl font-black text-stone-50 sm:text-5xl"
        >
          Your goal becomes...
        </h2>
        <div className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          {transformations.map((transformation) => (
            <article
              key={transformation.goal}
              className="border border-emerald-200/20 bg-[#0d1110]/82 p-6 shadow-[0_20px_55px_rgba(0,0,0,0.34),inset_0_0_0_1px_rgba(255,255,255,0.04)]"
            >
              <h3 className="font-serif text-2xl font-bold text-emerald-100">
                {transformation.goal}
              </h3>
              <ul className="mt-5 space-y-3 text-stone-200">
                {transformation.details.map((detail) => (
                  <li key={detail} className="flex gap-3 border-t border-white/8 pt-3 first:border-t-0 first:pt-0">
                    <span aria-hidden="true" className="text-amber-200">
                      ✦
                    </span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
