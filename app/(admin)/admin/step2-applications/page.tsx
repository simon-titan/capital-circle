import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { Step2ApplicationsManager } from "@/components/admin/Step2ApplicationsManager";

export const dynamic = "force-dynamic";

export default async function AdminStep2ApplicationsPage() {
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
            Step-2 Bewerbungen
          </Heading>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
            Erweiterte Bewerbungen (11 Fragen) von approved Free-Nutzern. Prüfe die Antworten und entscheide über die nächste Stufe.
          </Text>
        </Stack>

        <Step2ApplicationsManager />
      </Stack>
    </Box>
  );
}
