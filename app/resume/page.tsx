import { OfferMapApp } from "../components/OfferMapApp";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";

export default function ResumePage() {
  return <OfferMapApp initialView="resume" supabaseConfig={getSupabasePublicConfig()} />;
}
