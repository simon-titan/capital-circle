import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { TradingViewZugang } from "@/components/platform/tools/TradingViewZugang";
import { hatInhaltsZugang } from "@/lib/membership";
import { getCurrentUserAndProfile } from "@/lib/server-data";
import { createClient } from "@/lib/supabase/server";
import { TV_SPALTEN, type TvZugang } from "@/lib/tradingview/zugang";

export const dynamic = "force-dynamic";

/**
 * TradingView-Indikator (Tools, seit 25.09.2026). Wie früher bei Whop: Name
 * eintragen, das Team schaltet ihn im Invite-only-Script frei.
 *
 * Gelesen mit dem Nutzer-Client — die Lese-Policy liefert nur die eigene
 * Zeile. Fehlt Migration 105, gibt es einen Fehler statt einer Zeile; dann
 * steht das Formular da, und die API meldet sich beim Absenden.
 */
export default async function TradingViewPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");
  if (!hatInhaltsZugang(profile)) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tradingview_zugaenge")
    .select(TV_SPALTEN)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) console.warn("[tradingview] Zugang nicht lesbar:", error.message);
  const zugang = error ? null : ((data as TvZugang | null) ?? null);

  return (
    <Box w="100%" maxW="760px" mx="auto">
      <PageHeader
        title="TradingView"
        subtitle="Als aktives Capital-Circle-Mitglied erhältst du Zugang zu unserem exklusiven TradingView-Indikator."
      />
      <TradingViewZugang start={zugang} />
    </Box>
  );
}
