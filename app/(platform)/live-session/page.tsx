import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { LiveSessionCategoryCards } from "@/components/platform/LiveSessionCategoryCards";
import { getCurrentUserAndProfile } from "@/lib/server-data";
import { getLiveSessionCategoryOverview } from "@/lib/live-session-overview";
import { liveSessionsNurFrei } from "@/lib/membership";

/**
 * Übersicht wie das Institut: die drei Kategorien als Einstiegskarten. Ein
 * Klick führt in die Kategorie, dort stehen die Aufzeichnungen, und in der
 * Aufzeichnung liegen die einzelnen Videos (Nutzerwunsch 17.09.2026).
 */
export default async function LiveSessionPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const categories = await getLiveSessionCategoryOverview();

  return (
    <Box>
      <PageHeader
        title="Live Sessions"
        subtitle="Drei Bereiche, wie im Institut: Kategorie anklicken, dann die Aufzeichnung wählen und die Videos darin ansehen."
      />
      <LiveSessionCategoryCards categories={categories} isFreeMember={liveSessionsNurFrei(profile)} />
    </Box>
  );
}
