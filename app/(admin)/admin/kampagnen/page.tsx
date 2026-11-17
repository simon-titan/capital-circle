import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { AdminKampagnen } from "@/components/admin/AdminKampagnen";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

/** `/admin/kampagnen` — Retargeting- und Trustpilot-Mail (15.11.2026). */
export default async function AdminKampagnenPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");
  return (
    <Box>
      <AdminPageHeader
        title="Mail-Kampagnen"
        subtitle="Einmal-Mails an eine feste Gruppe. Jede Adresse bekommt jede Kampagne höchstens einmal; Abgemeldete und gesperrte Adressen sind ausgenommen. Erst eine Testmail an dich schicken, dann senden."
      />
      <AdminKampagnen />
    </Box>
  );
}
