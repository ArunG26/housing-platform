"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-xl p-8">
          <h1 className="text-2xl font-semibold">The portal could not be loaded.</h1>
          <p className="mt-3 text-slate-600">A required service may be temporarily unavailable.</p>
          <button onClick={reset} className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-white">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
