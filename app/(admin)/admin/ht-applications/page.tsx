import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { HTApplicationsManager } from "@/components/admin/HTApplicationsManager";

export const dynamic = "force-dynamic";

export default async function AdminHTApplicationsPage() {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

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
            High-Ticket Bewerbungen
          </Heading>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
            Bewerbungen aus dem 1:1-Funnel. „Über 2.000 €"-Leads stehen oben mit Priority-Badge.
            Setze nach dem Call den Outcome — bei „Closed Won" wird der Plattform-Zugang automatisch
            auf <Box as="span" color="var(--color-accent-gold)">ht_1on1</Box> aufgestuft.
          </Text>
        </Stack>

        <HTApplicationsManager />
      </Stack>
    </Box>
  );
}
