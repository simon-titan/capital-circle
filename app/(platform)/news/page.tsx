import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { NewsFeed } from "@/components/platform/NewsFeed";
import { getCurrentUserAndProfile, getNewsPostsWithCounts } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const posts = await getNewsPostsWithCounts(user.id);

  return (
    <Stack gap={{ base: 6, md: 8 }}>
      <Stack gap={3}>
        <Text
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          className="inter-semibold"
          color="#D4AF37"
        >
          Capital Circle News
        </Text>
        <Box
          as="h1"
          className="radley-regular"
          fontSize="clamp(1.75rem, 4vw, 2.25rem)"
          color="var(--color-text-primary)"
        >
          News &amp; Updates aus dem Circle
        </Box>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(320px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.95) 45%, rgba(212, 175, 55, 0.1) 100%)"
          boxShadow="0 0 20px rgba(212, 175, 55, 0.15)"
        />
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Kurze, knackige Updates aus dem Capital Circle. Like, kommentiere und speichere die Beitraege, die fuer dich relevant sind.
        </Text>
      </Stack>
      <NewsFeed posts={posts} />
    </Stack>
  );
}
