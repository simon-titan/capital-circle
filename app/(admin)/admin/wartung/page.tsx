import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
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
    <Box maxW="720px" mx="auto" px={{ base: 4, md: 6 }} py={8}>
      <Stack spacing={6}>
        <Stack spacing={1}>
          <Heading
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "2xl", md: "3xl" }}
            color="whiteAlpha.950"
          >
            Wartungsmodus
          </Heading>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
            Sperrt die Plattform fuer alle Nutzer außer Admins. Betroffene Besucher landen auf /wartung mit der
            hier hinterlegten Nachricht.
          </Text>
        </Stack>
        <AdminWartungManager initial={initial} />
      </Stack>
    </Box>
  );
}
