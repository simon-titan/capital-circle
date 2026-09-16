import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminZertifikateManager } from "@/components/admin/AdminZertifikateManager";

export const dynamic = "force-dynamic";

export default async function AdminZertifikatePage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <AdminPageHeader
        title="Zertifikate & Erfolge"
        subtitle="Review-Queue für eingereichte Trading-Nachweise. Freigeben macht den Nachweis auf /erfolge sichtbar (sobald zusätzlich öffentlich geschaltet)."
      />
      <AdminZertifikateManager />
    </Box>
  );
}
