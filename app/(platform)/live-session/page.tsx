import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageLiveSessionGrid } from "@/components/platform/PageCards";
import {
  getCurrentUserAndProfile,
  getLiveSessionCategories,
  getLiveSessions,
} from "@/lib/server-data";
import { isApprovedFreeMember } from "@/lib/membership";

export default async function LiveSessionPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const [categories, sessions] = await Promise.all([
    getLiveSessionCategories(),
    getLiveSessions(null),
  ]);

  return (
    <Box>
      <PageHeader
        title="Live Sessions"
        subtitle="Aufzeichnungen vergangener Live Calls — nach Kategorie sortiert, mit Detail-Ansicht wie im Institut. Videos liegen auf unserem sicheren Speicher."
      />
      <PageLiveSessionGrid categories={categories} sessions={sessions} isFreeMember={isApprovedFreeMember(profile)} />
    </Box>
  );
}
