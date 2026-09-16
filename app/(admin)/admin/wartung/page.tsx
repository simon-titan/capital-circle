import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { AdminWartungManager, type AdminMaintenanceSettings } from "@/components/admin/AdminWartungManager";

export const dynamic = "force-dynamic";

export default async function AdminWartungPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  const service = createServiceClient();
  const { data } = await service
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", "maintenance_mode")
    .maybeSingle();

  const value = (data?.value ?? {}) as { enabled?: boolean; message?: string };
  const initial: AdminMaintenanceSettings = {
    enabled: Boolean(value.enabled),
    message: typeof value.message === "string" ? value.message : "",
    updatedAt: (data?.updated_at as string | null) ?? null,
  };

  return (
    <Box maxW="720px" mx="auto">
      <AdminPageHeader
        title="Wartungsmodus"
        subtitle="Sperrt die Plattform für alle Nutzer außer Admins. Betroffene Besucher landen auf /wartung mit der hier hinterlegten Nachricht."
      />
      <AdminWartungManager initial={initial} />
    </Box>
  );
}
