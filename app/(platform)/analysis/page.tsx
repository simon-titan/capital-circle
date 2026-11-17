import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageAnalysisFeed } from "@/components/platform/PageCards";
import { getAnalysisPosts, getCurrentUserAndProfile } from "@/lib/server-data";
import { liveZugangAbgelaufen } from "@/lib/mentoring/zugang";
import { LiveZugangAbgelaufen } from "@/components/platform/LiveZugangAbgelaufen";

export default async function AnalysisPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  /*
    Daily Bias gehört zum befristeten Live-Bereich der Mentoring-Programme. Die
    Datenbank liefert die Beiträge danach ohnehin nicht mehr aus
    (`hat_live_zugang()`, Migration 108) — ohne diese Weiche stünde hier ein
    leerer Feed statt des Grundes.
  */
  if (liveZugangAbgelaufen(profile)) {
    return (
      <Box>
        <PageHeader title="Analysen" subtitle="Daily Bias und Marktkommentare vom Team." />
        <LiveZugangAbgelaufen titel="Analysen und Daily Bias" />
      </Box>
    );
  }

  const posts = await getAnalysisPosts("all");

  return (
    <Box>
      <PageHeader
        title="Analysen"
        subtitle="Einblicke und Marktkommentare vom Team: chronologisch, nur Lesezugriff für Mitglieder."
      />
      <PageAnalysisFeed posts={posts} />
    </Box>
  );
}
