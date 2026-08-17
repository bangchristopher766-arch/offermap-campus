import { OfferMapApp } from "../components/OfferMapApp";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

export default function CareerMapPage() {
  return <OfferMapApp initialView="map" supabaseConfig={getSupabasePublicConfig()} />;
}
