type AdventurePlanLimitsProps = {
  safetyNotes: string[];
};

export function AdventurePlanLimits({ safetyNotes }: AdventurePlanLimitsProps) {
  if (safetyNotes.length === 0) {
    return null;
  }

  return (
    <aside className="rounded-xl border border-emerald-200/20 bg-emerald-950/10 p-4 text-sm text-stone-300">
      <h2 className="font-serif text-lg text-emerald-100">Plan limits</h2>
      <ul className="mt-3 space-y-2">
        {safetyNotes.map((note) => (
          <li key={note} className="leading-6">
            {note}
          </li>
        ))}
      </ul>
    </aside>
  );
}
