import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { notFound, redirect } from "next/navigation";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { ArticleRenderer } from "@/components/platform/ArticleRenderer";
import { GlassCard } from "@/components/ui/GlassCard";
import { getAnalysisPostById, getCurrentUserAndProfile } from "@/lib/server-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnalysisArticlePage({ params }: PageProps) {
  const { id } = await params;
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const post = await getAnalysisPostById(id);
  if (!post) notFound();

  const isWeekly = post.post_type === "weekly";

  const coverSrc = post.cover_image_storage_key
    ? `/api/analysis-post-image?id=${encodeURIComponent(post.id)}&variant=cover`
    : post.image_storage_key
      ? `/api/analysis-post-image?id=${encodeURIComponent(post.id)}`
      : null;

  return (
    <Stack gap={6} alignItems="start" maxW="900px" mx="auto">
      <ChakraLinkButton
        href="/analysis"
        variant="ghost"
        size="sm"
        color="var(--color-accent-gold)"
        className="inter"
      >
        ← Zurück zur Übersicht
      </ChakraLinkButton>

      <GlassCard w="full">
        <Stack gap={4} mb={coverSrc ? 5 : 3}>
          <Text
            fontSize="xs"
            letterSpacing="0.12em"
            textTransform="uppercase"
            className="inter-semibold"
            color={isWeekly ? "rgba(251, 146, 60, 0.95)" : "rgba(147, 197, 253, 0.95)"}
          >
            {isWeekly ? "Weekly" : "Daily"} · Analyse
          </Text>
          <Heading as="h1" size="lg" className="radley-regular" fontWeight={400} color="var(--color-text-primary)">
            {post.title}
          </Heading>
          <Text className="inter" fontSize="sm" color="var(--color-text-muted)">
            {new Date(post.published_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
          </Text>
        </Stack>

        {coverSrc ? (
          <Box borderRadius="14px" overflow="hidden" borderWidth="1px" borderColor="rgba(255,255,255,0.1)" mb={6}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverSrc} alt="" style={{ width: "100%", height: "auto", display: "block", maxHeight: "420px", objectFit: "cover" }} />
          </Box>
        ) : null}

        <ArticleRenderer key={post.id} content={post.content} />
      </GlassCard>
    </Stack>
  );
}
