import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsDashboardPage() {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

  return (
    <Box maxW="1440px" mx="auto" px={{ base: 4, md: 6 }} py={8}>
      <Stack spacing={2} mb={8}>
        <Heading
          as="h1"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "2xl", md: "3xl" }}
          color="whiteAlpha.950"
        >
          Analytics-Dashboard
        </Heading>
        <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
          Live-Kennzahlen für Funnel, Revenue, Churn und Email-Performance.
          Daten werden bei jedem Aufruf frisch aus Supabase geladen.
        </Text>
      </Stack>

      <AnalyticsDashboard />
    </Box>
  );
}
