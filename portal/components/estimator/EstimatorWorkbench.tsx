"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { z } from "zod";

import { useEstimateHistory, type EstimateHistoryEntry } from "@/hooks/useEstimateHistory";
import type { EstimateResponse, HousingFeatures, ModelInfo } from "@/lib/contracts";
import { formatCurrency, formatNumber } from "@/lib/format";

const schema = z.object({
  square_footage: z.coerce.number().positive("Square footage must be greater than 0"),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().positive().max(20),
  year_built: z.coerce.number().int().min(1800).max(2100),
  lot_size: z.coerce.number().positive(),
  distance_to_city_center: z.coerce.number().min(0),
  school_rating: z.coerce.number().min(0).max(10),
});

type FormState = Record<keyof HousingFeatures, string>;
type ErrorState = Partial<Record<keyof HousingFeatures, string>>;

const initialForm: FormState = {
  square_footage: "1550",
  bedrooms: "3",
  bathrooms: "2",
  year_built: "1997",
  lot_size: "6800",
  distance_to_city_center: "4.1",
  school_rating: "7.6",
};

const fields: Array<{ key: keyof HousingFeatures; label: string; step?: string }> = [
  { key: "square_footage", label: "Square footage" },
  { key: "bedrooms", label: "Bedrooms" },
  { key: "bathrooms", label: "Bathrooms", step: "0.5" },
  { key: "year_built", label: "Year built" },
  { key: "lot_size", label: "Lot size" },
  { key: "distance_to_city_center", label: "Distance to city center", step: "0.1" },
  { key: "school_rating", label: "School rating", step: "0.1" },
];

export function EstimatorWorkbench({ modelInfo }: { modelInfo: ModelInfo }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<ErrorState>({});
  const [latest, setLatest] = useState<EstimateHistoryEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const { history, add, clear } = useEstimateHistory();

  const comparison = history.filter((entry) => comparisonIds.includes(entry.request_id));
  const chartData = useMemo(
    () => history.slice(0, 8).reverse().map((entry, index) => ({ name: `Estimate ${index + 1}`, price: entry.estimated_price })),
    [history],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: ErrorState = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof HousingFeatures;
        nextErrors[key] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { detail?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.detail ?? "Estimate could not be created");
      }
      const result = (await response.json()) as EstimateResponse;
      const entry: EstimateHistoryEntry = { ...parsed.data, ...result };
      setLatest(entry);
      add(entry);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Estimate could not be created");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCompare(id: string) {
    setComparisonIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Application 1 · Python backend</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Property Value Estimator</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Validated form submission → estimator API → shared ML inference service.</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div><span className="text-slate-500">Model</span> <strong>{modelInfo.model_version}</strong></div>
          <div><span className="text-slate-500">Holdout R²</span> <strong>{modelInfo.performance.holdout_metrics.r2.toFixed(3)}</strong></div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" noValidate>
          <h2 className="text-xl font-semibold">Property details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, step }) => (
              <div key={key}>
                <label htmlFor={key} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                <input
                  id={key}
                  name={key}
                  type="number"
                  step={step ?? "1"}
                  value={form[key]}
                  aria-invalid={Boolean(errors[key])}
                  aria-describedby={errors[key] ? `${String(key)}-error` : undefined}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                {errors[key] && <p id={`${String(key)}-error`} className="mt-1 text-sm text-rose-700">{errors[key]}</p>}
              </div>
            ))}
          </div>
          {requestError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{requestError}</p>}
          <button type="submit" disabled={submitting} className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Estimating…" : "Estimate value"}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-live="polite">
          <h2 className="text-xl font-semibold">Latest prediction</h2>
          {!latest ? (
            <p className="mt-6 text-slate-500">Submit a property to create the first estimate.</p>
          ) : (
            <>
              <p className="mt-5 text-4xl font-semibold tracking-tight">{formatCurrency(latest.estimated_price)}</p>
              <p className="mt-1 text-sm text-slate-500">Generated by model {latest.model_version}</p>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
              <caption className="sr-only">Previous property estimates with controls to add entries to side-by-side comparison.</caption>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map(({ key, label }) => (
                      <tr key={key}><th scope="row" className="py-2 text-left font-medium text-slate-500">{label}</th><td className="py-2 text-right">{formatNumber(latest[key])}</td></tr>
                    ))}
                    <tr><th scope="row" className="py-2 text-left font-semibold">Predicted price</th><td className="py-2 text-right font-semibold">{formatCurrency(latest.estimated_price)}</td></tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Estimate history</h2><p className="text-sm text-slate-500">Stored locally in this browser for the interview demo.</p></div>
          {history.length > 0 && <button onClick={clear} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Clear history</button>}
        </div>
        {history.length === 0 ? <p className="mt-6 text-slate-500">No previous estimates yet.</p> : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b text-left text-slate-500"><th scope="col" className="pb-2">Price</th><th scope="col" className="pb-2">Sq ft</th><th scope="col" className="pb-2">Beds</th><th scope="col" className="pb-2">Model</th><th scope="col" className="pb-2">Compare</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((entry) => (
                    <tr key={entry.request_id}>
                      <td className="py-3 font-medium">{formatCurrency(entry.estimated_price)}</td>
                      <td>{formatNumber(entry.square_footage, 0)}</td><td>{entry.bedrooms}</td><td>{entry.model_version}</td>
                      <td><button onClick={() => toggleCompare(entry.request_id)} disabled={!comparisonIds.includes(entry.request_id) && comparisonIds.length >= 3} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">{comparisonIds.includes(entry.request_id) ? "Remove" : "Add"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="h-72" role="img" aria-label="Bar chart of recent predicted property values">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip formatter={(value) => formatCurrency(Number(value))}/><Bar dataKey="price" name="Predicted price" /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {comparison.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Side-by-side comparison</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {comparison.map((entry) => (
              <article key={entry.request_id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-2xl font-semibold">{formatCurrency(entry.estimated_price)}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Sq ft</dt><dd>{entry.square_footage}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Bedrooms</dt><dd>{entry.bedrooms}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Bathrooms</dt><dd>{entry.bathrooms}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">School</dt><dd>{entry.school_rating}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Distance</dt><dd>{entry.distance_to_city_center}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
