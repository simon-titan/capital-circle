import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { ApplicationsManager } from "@/components/admin/ApplicationsManager";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const { error } = await requireAdmin();
  if (error) {
    // Non-Admin → Dashboard. requireAdmin() liefert eine NextResponse — die
    // können wir hier nicht direkt zurückgeben, weil das eine Server-Component
    // ist. Wir nutzen redirect() als Equivalent.
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
            Bewerbungen
          </Heading>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
            Prüfe neue Free-Funnel-Bewerbungen und entscheide, wer in den 5-Tage-Onboarding-Kurs aufgenommen wird.
          </Text>
        </Stack>

        <ApplicationsManager />
      </Stack>
    </Box>
  );
}
