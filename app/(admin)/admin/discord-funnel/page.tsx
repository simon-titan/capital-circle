import { redirect } from "next/navigation";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { DiscordFunnelDashboard } from "@/components/admin/DiscordFunnelDashboard";

export const dynamic = "force-dynamic";

export default async function AdminDiscordFunnelPage() {
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
          Discord Funnel
        </Heading>
        <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
          Cold-Traffic-Funnel (Instagram/TikTok/YouTube → Discord → Call). KPIs,
          Funnel-Stufen, Content-Insights, Closer-Performance und Lead-Management.
        </Text>
      </Stack>

      <DiscordFunnelDashboard />
    </Box>
  );
}
