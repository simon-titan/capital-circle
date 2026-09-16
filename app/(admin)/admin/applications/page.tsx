import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { ApplicationsManager } from "@/components/admin/ApplicationsManager";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const { error } = await requireAdmin();
  if (error) {
    // Non-Admin → Dashboard. requireAdmin() liefert eine NextResponse — die
    // können wir hier nicht direkt zurückgeben, weil das eine Server-Component
    // ist. Wir nutzen redirect() als Equivalent.
    redirect("/dashboard");
  }

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Bewerbungen"
        subtitle="Prüfe neue Free-Funnel-Bewerbungen und entscheide, wer in den 5-Tage-Onboarding-Kurs aufgenommen wird."
      />
      <ApplicationsManager />
    </Box>
  );
}
