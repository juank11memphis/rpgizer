type JournalDetailFieldProps = {
  label: string;
  value: string;
};

export function JournalDetailField({ label, value }: JournalDetailFieldProps) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/70">{label}</p>
      <p className="mt-1 text-sm leading-6 text-stone-300">{value}</p>
    </div>
  );
}
