export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="h-10 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
      <span className="sr-only">Loading portal</span>
    </div>
  );
}
