import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminZahlungsstoerungenManager } from "@/components/admin/AdminZahlungsstoerungenManager";

export const dynamic = "force-dynamic";

export default async function AdminZahlungsstoerungenPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  return (
    <Box maxW="1200px" mx="auto" px={{ base: 4, md: 6 }} py={8}>
      <Stack spacing={6}>
        <Stack spacing={1}>
          <Heading
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "2xl", md: "3xl" }}
            color="whiteAlpha.950"
          >
            Zahlungsstörungen
          </Heading>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
            Mitglieder im Grace-Zeitraum nach fehlgeschlagener Zahlung — Dunning-Status und
            verbleibende Zeit bis zum Zugangsverlust auf einen Blick.
          </Text>
        </Stack>
        <AdminZahlungsstoerungenManager />
      </Stack>
    </Box>
  );
}
