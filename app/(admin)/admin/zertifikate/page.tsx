import { redirect } from "next/navigation";
import { Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminZertifikateManager } from "@/components/admin/AdminZertifikateManager";

export const dynamic = "force-dynamic";

export default async function AdminZertifikatePage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          Zertifikate &amp; Erfolge
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Review-Queue fuer eingereichte Trading-Nachweise. Freigeben macht den Nachweis auf /erfolge sichtbar
          (sobald zusaetzlich oeffentlich geschaltet).
        </Text>
      </Stack>
      <AdminZertifikateManager />
    </Stack>
  );
}
