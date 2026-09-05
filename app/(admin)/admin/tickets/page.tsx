import { redirect } from "next/navigation";
import { Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminTicketsManager } from "@/components/admin/AdminTicketsManager";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          Support-Tickets
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Alle Anfragen der Mitglieder, gefiltert nach Status &amp; Priorität. Die Antwortzeit misst die Zeit bis zur
          ersten Admin-Antwort.
        </Text>
      </Stack>
      <AdminTicketsManager />
    </Stack>
  );
}
