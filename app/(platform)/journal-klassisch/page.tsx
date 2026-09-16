import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { JournalShell } from "@/components/trading-journal/JournalShell";
import { evaluateAccess } from "@/lib/access-control/has-access";
import { getCurrentUserAndProfile } from "@/lib/server-data";

export default async function KlassischesJournalPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");
  if (!evaluateAccess(profile).hasAccess) redirect("/dashboard");

  return (
    <Box w="100%">
      <PageHeader
        title="Klassisches Journal"
        subtitle="Erfasse Trades mit Strategie-Tags, filtere den Verlauf und werte deine Performance aus — inklusive Kalenderansicht und Screenshots."
      />
      <JournalShell />
    </Box>
  );
}
