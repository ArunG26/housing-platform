import { EstimatorWorkbench } from "@/components/estimator/EstimatorWorkbench";
import { requireSession } from "@/lib/auth";
import { createServerRenderContext, fetchModelInfo } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function EstimatorPage() {
  const session = await requireSession();
  const context = await createServerRenderContext(session);
  const modelInfo = await fetchModelInfo(session, context);
  return <EstimatorWorkbench modelInfo={modelInfo} />;
}
