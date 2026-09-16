import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { Step2ApplicationsManager } from "@/components/admin/Step2ApplicationsManager";

export const dynamic = "force-dynamic";

export default async function AdminStep2ApplicationsPage() {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

  return (
    <Box maxW="1200px" mx="auto">
      <AdminPageHeader
        title="Step-2 Bewerbungen"
        subtitle="Erweiterte Bewerbungen (11 Fragen) von approved Free-Nutzern. Prüfe die Antworten und entscheide über die nächste Stufe."
      />
      <Step2ApplicationsManager />
    </Box>
  );
}
