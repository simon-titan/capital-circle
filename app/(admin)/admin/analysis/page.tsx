import { Box } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AnalysisManager } from "@/components/admin/AnalysisManager";

export default function AdminAnalysisPage() {
  return (
    <Box maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <AdminPageHeader
        title="Weekly / Daily Analysis"
        subtitle="Beiträge mit Bild und Text — erscheinen im Mitglieder-Feed unter Analyse."
      />
      <AnalysisManager />
    </Box>
  );
}
