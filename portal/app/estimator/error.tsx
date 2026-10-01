"use client";

export default function EstimatorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <h1 className="text-xl font-semibold text-rose-950">Estimator service is unavailable</h1>
      <p className="mt-2 text-rose-800">The page could not load model information. Verify the Python estimator and ML services.</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-rose-900 px-4 py-2 text-white">Retry</button>
    </section>
  );
}
