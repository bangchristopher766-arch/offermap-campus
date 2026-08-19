import { OfferMapApp } from "../../components/OfferMapApp";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

export default async function PositionAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferMapApp initialView="analysis" positionId={id} supabaseConfig={getSupabasePublicConfig()} />;
}
