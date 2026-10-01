import Link from "next/link";

import { requireSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await requireSession();
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Unified Portal</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
          Property decisions backed by one versioned inference service
        </h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          The portal keeps application concerns separate from model ownership: a Python estimator backend and a Java market analytics backend consume the same ML API.
        </p>
        <p className="mt-4 text-sm text-slate-500">Signed in as <strong>{session.username}</strong> with <strong>{session.role}</strong> access.</p>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <Link href="/estimator" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition motion-reduce:transition-none hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 hover:shadow-md focus-visible:outline-2 focus-visible:outline-slate-900">
          <p className="text-sm font-medium text-slate-500">Application 1 · Python</p>
          <h2 className="mt-2 text-2xl font-semibold">Property Value Estimator</h2>
          <p className="mt-3 text-slate-600">Estimate a property, retain browser-local history, and compare multiple predictions side by side.</p>
        </Link>
        <Link href="/market" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition motion-reduce:transition-none hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 hover:shadow-md focus-visible:outline-2 focus-visible:outline-slate-900">
          <p className="text-sm font-medium text-slate-500">Application 2 · Java</p>
          <h2 className="mt-2 text-2xl font-semibold">Property Market Analysis</h2>
          <p className="mt-3 text-slate-600">Explore market segments, aggregate statistics, what-if scenarios, sortable data and exports.</p>
        </Link>
      </section>
    </div>
  );
}
