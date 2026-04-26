import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminReviewsManager } from "@/components/admin/AdminReviewsManager";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
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
            Bewertungen verwalten
          </Heading>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
            Erstelle, bearbeite und verwalte Bewertungen für Landing Pages.
          </Text>
        </Stack>
        <AdminReviewsManager />
      </Stack>
    </Box>
  );
}
