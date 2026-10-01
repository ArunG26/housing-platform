"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { buildMarketQuery, type MarketFilters, useMarketData } from "@/hooks/useMarketData";
import type { HousingFeatures, MarketAnalysis, PagedProperties, PropertyRecord, WhatIfResponse } from "@/lib/contracts";
import { formatCurrency, formatNumber } from "@/lib/format";

const emptyFilters: MarketFilters = {
  minPrice: "",
  maxPrice: "",
  bedrooms: "",
  minSchoolRating: "",
  maxDistance: "",
};

function propertyToFeatures(property: PropertyRecord): HousingFeatures {
  return {
    square_footage: property.squareFootage,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    year_built: property.yearBuilt,
    lot_size: property.lotSize,
    distance_to_city_center: property.distanceToCityCenter,
    school_rating: property.schoolRating,
  };
}

export function MarketDashboard({
  initialAnalysis,
  initialProperties,
  canAnalyze,
}: {
  initialAnalysis: MarketAnalysis;
  initialProperties: PagedProperties;
  canAnalyze: boolean;
}) {
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [filterForm, setFilterForm] = useState<MarketFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<MarketFilters>(emptyFilters);
  const [sortBy, setSortBy] = useState("price");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const { analysis, properties, loading, error, refresh,loadPage } = useMarketData(initialAnalysis, initialProperties);
  const [selected, setSelected] = useState<PropertyRecord | null>(initialProperties.content[0] ?? null);
  const [scenario, setScenario] = useState<HousingFeatures | null>(
    initialProperties.content[0] ? propertyToFeatures(initialProperties.content[0]) : null,
  );
  const [whatIf, setWhatIf] = useState<WhatIfResponse | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);

  useEffect(() => {
    if (selected) {
      setScenario(propertyToFeatures(selected));
      setWhatIf(null);
    }
  }, [selected]);

  const exportQuery = useMemo(() => buildMarketQuery(appliedFilters).toString(), [appliedFilters]);

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    
    event.preventDefault();

    setPage(0);
    setAppliedFilters(filterForm);
    await refresh(filterForm, sortBy, direction, 0, PAGE_SIZE);
  }

  async function goToPage(nextPage: number) {
    if (
      nextPage < 0 ||
      nextPage >= properties.totalPages
    ) {
    return;
  }

  setPage(nextPage);

    await loadPage(
      appliedFilters,
      sortBy,
      direction,
      nextPage,
      PAGE_SIZE
    );
  }
  async function changeSort(field: string) {
    setPage(0);
    const nextDirection = field === sortBy && direction === "asc" ? "desc" : "asc";
    setSortBy(field);
    setDirection(nextDirection);
    await refresh(appliedFilters, field, nextDirection, 0, PAGE_SIZE);
  }

  async function runWhatIf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !scenario) return;
    setWhatIfLoading(true);
    setWhatIfError(null);
    try {
      const response = await fetch("/api/market/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseline: propertyToFeatures(selected), scenario }),
      });
      if (!response.ok) throw new Error("What-if prediction could not be calculated");
      setWhatIf((await response.json()) as WhatIfResponse);
    } catch (err) {
      setWhatIfError(err instanceof Error ? err.message : "What-if prediction failed");
    } finally {
      setWhatIfLoading(false);
    }
  }

  function selectProperty(property: PropertyRecord) {
    setSelected(property);
  }

  const startRecord =
    properties.totalElements === 0
      ? 0
      : properties.page * properties.size + 1;

  const endRecord = Math.min(
    properties.page * properties.size + properties.content.length,
    properties.totalElements
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Application 2 · Java backend</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Property Market Analysis</h1>
            <p className="mt-2 max-w-3xl text-slate-600">Server-loaded market aggregates, filtered analytics, model-backed what-if scenarios, cached Java calculations and exportable data.</p>
          </div>
          {canAnalyze && (
            <div className="flex gap-2">
              <a href={`/api/market/export/csv?${exportQuery}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-slate-900">Export CSV</a>
              <a href={`/api/market/export/pdf?${exportQuery}`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-slate-900">Export PDF</a>
            </div>
          )}
        </div>
      </section>

      <form onSubmit={applyFilters} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Market segments</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterInput label="Min price" value={filterForm.minPrice ?? ""} onChange={(value) => setFilterForm((f) => ({ ...f, minPrice: value }))} />
          <FilterInput label="Max price" value={filterForm.maxPrice ?? ""} onChange={(value) => setFilterForm((f) => ({ ...f, maxPrice: value }))} />
          <FilterInput label="Bedrooms" value={filterForm.bedrooms ?? ""} onChange={(value) => setFilterForm((f) => ({ ...f, bedrooms: value }))} />
          <FilterInput label="Min school rating" step="0.1" value={filterForm.minSchoolRating ?? ""} onChange={(value) => setFilterForm((f) => ({ ...f, minSchoolRating: value }))} />
          <FilterInput label="Max city distance" step="0.1" value={filterForm.maxDistance ?? ""} onChange={(value) => setFilterForm((f) => ({ ...f, maxDistance: value }))} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{loading ? "Applying…" : "Apply filters"}</button>
          <button type="button" onClick={() => { setFilterForm(emptyFilters); setAppliedFilters(emptyFilters); setPage(0); void refresh(emptyFilters, sortBy, direction, 0, PAGE_SIZE); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Reset</button>
          {error && <span role="alert" className="text-sm text-rose-700">{error}</span>}
        </div>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Properties" value={analysis.propertyCount.toString()} />
        <MetricCard label="Average price" value={formatCurrency(analysis.averagePrice)} />
        <MetricCard label="Median price" value={formatCurrency(analysis.medianPrice)} />
        <MetricCard label="Average school rating" value={formatNumber(analysis.averageSchoolRating)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Average price by bedrooms" description="Bar chart comparing average market price across bedroom counts.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysis.byBedrooms}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="bedrooms"/><YAxis/><Tooltip formatter={(value) => formatCurrency(Number(value))}/><Bar dataKey="averagePrice" name="Average price" /></BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Price distribution" description="Bar chart showing the number of properties in each price band.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysis.priceDistribution.map((bucket) => ({ label: `${Math.round(bucket.lowerBound / 1000)}k–${Math.round(bucket.upperBound / 1000)}k`, count: bucket.propertyCount }))}>
              <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" name="Properties" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Properties</h2><p className="text-sm text-slate-500"> Showing {startRecord}-{endRecord} of {properties.totalElements} properties</p></div><p className="text-xs text-slate-500">Click column headings to sort</p></div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">Filtered housing properties. Column headings can be used to change sorting.</caption>
            <thead><tr className="border-b text-left text-slate-500">
              <SortableHeader label="Price" field="price" current={sortBy} direction={direction} onSort={changeSort}/>
              <SortableHeader label="Sq ft" field="squareFootage" current={sortBy} direction={direction} onSort={changeSort}/>
              <SortableHeader label="Beds" field="bedrooms" current={sortBy} direction={direction} onSort={changeSort}/>
              <SortableHeader label="Baths" field="bathrooms" current={sortBy} direction={direction} onSort={changeSort}/>
              <SortableHeader label="Year" field="yearBuilt" current={sortBy} direction={direction} onSort={changeSort}/>
              <SortableHeader label="School" field="schoolRating" current={sortBy} direction={direction} onSort={changeSort}/>
              <SortableHeader label="Distance" field="distanceToCityCenter" current={sortBy} direction={direction} onSort={changeSort}/>
              {canAnalyze && <th className="pb-2" scope="col">What-if</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {properties.content.map((property) => (
                <tr key={property.id} className={selected?.id === property.id ? "bg-slate-50" : undefined}>
                  <td className="py-3 font-medium">{formatCurrency(property.price)}</td><td>{formatNumber(property.squareFootage, 0)}</td><td>{property.bedrooms}</td><td>{property.bathrooms}</td><td>{property.yearBuilt}</td><td>{property.schoolRating}</td><td>{property.distanceToCityCenter}</td>
                  {canAnalyze && <td><button type="button" onClick={() => selectProperty(property)} className="rounded border border-slate-300 px-2 py-1 focus-visible:outline-2 focus-visible:outline-slate-900">Select</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between">

            <button
              type="button"
              disabled={properties.page === 0}
              onClick={() => void goToPage(properties.page - 1)}
              className="rounded border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm text-slate-500">
              Page {properties.page + 1} of {properties.totalPages}
            </span>

            <button
              type="button"
              disabled={properties.page + 1 >= properties.totalPages}
              onClick={() => void goToPage(properties.page + 1)}
              className="rounded border border-slate-300 px-3 py-2 disabled:opacity-50"
            >
              Next
            </button>

          </div>
        </div>
      </section>

      {canAnalyze && (<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">What-if analysis</h2>
        <p className="mt-1 text-sm text-slate-500">The Java service sends baseline and scenario together to the ML batch endpoint, keeping both predictions on one model version.</p>
        {!selected || !scenario ? <p className="mt-5 text-slate-500">Select a property first.</p> : (
          <form onSubmit={runWhatIf} className="mt-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ScenarioInput label="Square footage" value={scenario.square_footage} onChange={(value) => setScenario({ ...scenario, square_footage: value })}/>
              <ScenarioInput label="Bedrooms" value={scenario.bedrooms} onChange={(value) => setScenario({ ...scenario, bedrooms: Math.round(value) })}/>
              <ScenarioInput label="Bathrooms" step="0.5" value={scenario.bathrooms} onChange={(value) => setScenario({ ...scenario, bathrooms: value })}/>
              <ScenarioInput label="Year built" value={scenario.year_built} onChange={(value) => setScenario({ ...scenario, year_built: Math.round(value) })}/>
              <ScenarioInput label="Lot size" value={scenario.lot_size} onChange={(value) => setScenario({ ...scenario, lot_size: value })}/>
              <ScenarioInput label="City distance" step="0.1" value={scenario.distance_to_city_center} onChange={(value) => setScenario({ ...scenario, distance_to_city_center: value })}/>
              <ScenarioInput label="School rating" step="0.1" value={scenario.school_rating} onChange={(value) => setScenario({ ...scenario, school_rating: value })}/>
            </div>
            <button disabled={whatIfLoading} className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{whatIfLoading ? "Calculating…" : "Run scenario"}</button>
            {whatIfError && <p role="alert" className="mt-3 text-sm text-rose-700">{whatIfError}</p>}
            {whatIf && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-live="polite">
                <MetricCard label="Baseline model value" value={formatCurrency(whatIf.baselinePrediction)} />
                <MetricCard label="Scenario model value" value={formatCurrency(whatIf.scenarioPrediction)} />
                <MetricCard label="Change" value={`${whatIf.absoluteChange >= 0 ? "+" : ""}${formatCurrency(whatIf.absoluteChange)} (${whatIf.percentageChange.toFixed(1)}%)`} />
              </div>
            )}
          </form>
        )}
      </section>)}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></article>;
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">{title}</h2><p className="sr-only">{description}</p><div className="mt-4 h-72" role="img" aria-label={description}>{children}</div></article>;
}

function FilterInput({ label, value, onChange, step = "1" }: { label: string; value: string; onChange: (value: string) => void; step?: string }) {
  return <label className="text-sm font-medium text-slate-700">{label}<input type="number" step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"/></label>;
}

function ScenarioInput({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return <label className="text-sm font-medium text-slate-700">{label}<input type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"/></label>;
}

function SortableHeader({ label, field, current, direction, onSort }: { label: string; field: string; current: string; direction: "asc" | "desc"; onSort: (field: string) => Promise<void> }) {
  const marker = current === field ? (direction === "asc" ? " ↑" : " ↓") : "";
  return <th scope="col" className="pb-2"><button type="button" className="font-medium hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900" onClick={() => void onSort(field)}>{label}{marker}</button></th>;
}
