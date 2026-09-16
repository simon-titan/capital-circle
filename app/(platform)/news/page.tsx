import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { NewsFeed } from "@/components/platform/NewsFeed";
import { getCurrentUserAndProfile, getNewsPostsWithCounts } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const posts = await getNewsPostsWithCounts(user.id);

  return (
    <Box>
      <PageHeader
        title="News"
        subtitle="Kurze, knackige Updates aus dem Capital Circle. Like, kommentiere und speichere die Beiträge, die für dich relevant sind."
      />
      <NewsFeed posts={posts} />
    </Box>
  );
}
