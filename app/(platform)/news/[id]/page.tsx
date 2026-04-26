import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { notFound, redirect } from "next/navigation";
import { ArticleRenderer } from "@/components/platform/ArticleRenderer";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { NewsPostDetailClient } from "@/components/platform/NewsPostDetailClient";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getCurrentUserAndProfile,
  getNewsPostById,
  getNewsPostInteractions,
} from "@/lib/server-data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewsPostPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const post = await getNewsPostById(id);
  if (!post) notFound();

  const interactions = await getNewsPostInteractions(id, user.id);

  const coverSrc = post.cover_image_storage_key
    ? `/api/news-post-image?id=${encodeURIComponent(post.id)}`
    : null;

  const displayName =
    (profile as { full_name?: string | null; username?: string | null }).full_name?.trim() ||
    (profile as { username?: string | null }).username?.trim() ||
    null;
  const avatarUrl =
    (profile as { avatar_url?: string | null }).avatar_url?.trim() || null;

  return (
    <Stack gap={6} alignItems="start" maxW="900px" mx="auto">
      <ChakraLinkButton
        href="/news"
        variant="ghost"
        size="sm"
        color="var(--color-accent-gold)"
        className="inter"
      >
        ← Zurueck zu den News
      </ChakraLinkButton>

      <GlassCard w="full">
        <Stack gap={4} mb={coverSrc ? 5 : 3}>
          <Text
            fontSize="xs"
            letterSpacing="0.14em"
            textTransform="uppercase"
            className="inter-semibold"
            color="#D4AF37"
          >
            Capital Circle News
          </Text>
          <Heading
            as="h1"
            size="lg"
            className="radley-regular"
            fontWeight={400}
            color="var(--color-text-primary)"
          >
            {post.title}
          </Heading>
          <Text className="inter" fontSize="sm" color="var(--color-text-muted)">
            {new Date(post.published_at).toLocaleString("de-DE", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </Text>
        </Stack>

        {coverSrc ? (
          <Box
            borderRadius="14px"
            overflow="hidden"
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.1)"
            mb={6}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverSrc}
              alt=""
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                maxHeight: "420px",
                objectFit: "cover",
              }}
            />
          </Box>
        ) : null}

        <ArticleRenderer key={post.id} content={post.content} />

        <NewsPostDetailClient
          postId={post.id}
          initialLikeCount={interactions.like_count}
          initialLikedByMe={interactions.liked_by_me}
          initialSavedByMe={interactions.saved_by_me}
          initialComments={interactions.comments}
          initialMyComment={interactions.my_comment}
          currentUserId={user.id}
          currentUserName={displayName}
          currentUserAvatarUrl={avatarUrl}
        />
      </GlassCard>
    </Stack>
  );
}
