import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminReviewsManager } from "@/components/admin/AdminReviewsManager";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Bewertungen verwalten"
        subtitle="Erstelle, bearbeite und verwalte Bewertungen für Landing Pages."
      />
      <AdminReviewsManager />
    </Box>
  );
}
