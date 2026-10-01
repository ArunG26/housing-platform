import { MarketDashboard } from "@/components/market/MarketDashboard";
import { requireSession } from "@/lib/auth";
import { createServerRenderContext, fetchInitialMarketAnalysis, fetchInitialProperties } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const session = await requireSession();
  const context = await createServerRenderContext(session);
  const [analysis, properties] = await Promise.all([
    fetchInitialMarketAnalysis(session, context),
    fetchInitialProperties(session, context),
  ]);
  return <MarketDashboard initialAnalysis={analysis} initialProperties={properties} canAnalyze={session.role === "ANALYST"} />;
}
