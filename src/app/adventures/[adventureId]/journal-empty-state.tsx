type JournalEmptyStateProps = {
  message: string;
};

export function JournalEmptyState({ message }: JournalEmptyStateProps) {
  return (
    <div className="rounded-xl border border-amber-200/15 bg-black/25 p-4 text-sm leading-6 text-stone-300">
      {message}
    </div>
  );
}
