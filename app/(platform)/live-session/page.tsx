import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { LiveSessionCategoryCards } from "@/components/platform/LiveSessionCategoryCards";
import { getCurrentUserAndProfile } from "@/lib/server-data";
import { getLiveSessionCategoryOverview } from "@/lib/live-session-overview";
import { liveSessionsNurFrei } from "@/lib/membership";
import { liveZugangAbgelaufen } from "@/lib/mentoring/zugang";
import { LiveZugangAbgelaufen } from "@/components/platform/LiveZugangAbgelaufen";

/**
 * Übersicht wie das Institut: die drei Kategorien als Einstiegskarten. Ein
 * Klick führt in die Kategorie, dort stehen die Aufzeichnungen, und in der
 * Aufzeichnung liegen die einzelnen Videos (Nutzerwunsch 17.09.2026).
 */
export default async function LiveSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ live_fehler?: string }>;
}) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const categories = await getLiveSessionCategoryOverview();
  /*
    Mentoring-Programm mit abgelaufenem Live-Zeitraum: oben das Anschlussangebot,
    darunter die Kategorien wie für Free-Mitglieder — die freie Kategorie bleibt
    offen, denn wer ein Programm gekauft hat, soll nicht weniger sehen als ein
    Free-Konto.
  */
  const abgelaufen = liveZugangAbgelaufen(profile);
  const { live_fehler } = await searchParams;

  return (
    <Box>
      <PageHeader
        title="Live Sessions"
        subtitle="Drei Bereiche, wie im Institut: Kategorie anklicken, dann die Aufzeichnung wählen und die Videos darin ansehen."
      />
      {abgelaufen ? (
        <Box mb={6}>
          <LiveZugangAbgelaufen fehler={live_fehler ?? null} />
        </Box>
      ) : null}
      <LiveSessionCategoryCards categories={categories} isFreeMember={liveSessionsNurFrei(profile) || abgelaufen} />
    </Box>
  );
}
