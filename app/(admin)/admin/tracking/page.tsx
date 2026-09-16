import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { TrackingLinksManager } from "@/components/admin/TrackingLinksManager";

export const dynamic = "force-dynamic";

export default async function AdminTrackingPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Insight Tracking Links"
        subtitle="Erstelle individuelle Tracking-Links für die /insight Seite und messe, welche Kanäle die meisten Besucher und Bewerbungen bringen."
      />
      <TrackingLinksManager />
    </Box>
  );
}
