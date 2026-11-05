import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageAnalysisFeed } from "@/components/platform/PageCards";
import { getAnalysisPosts, getCurrentUserAndProfile } from "@/lib/server-data";

export default async function AnalysisPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

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
