export default function MarketLoading() {
  return <div className="grid gap-4 md:grid-cols-4" role="status"><div className="h-28 animate-pulse rounded-2xl bg-slate-200 md:col-span-4"/><div className="h-72 animate-pulse rounded-2xl bg-slate-200 md:col-span-2"/><div className="h-72 animate-pulse rounded-2xl bg-slate-200 md:col-span-2"/><span className="sr-only">Loading market dashboard</span></div>;
}
