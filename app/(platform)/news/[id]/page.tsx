import { Box, Flex, Stack } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ArticleRenderer } from "@/components/platform/ArticleRenderer";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { NewsPostDetailClient } from "@/components/platform/NewsPostDetailClient";
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
    <Box maxW="46rem" w="100%" mx="auto">
      <ChakraLinkButton
        href="/news"
        variant="line"
        size="sm"
        leftIcon={<ArrowLeft size={15} strokeWidth={1.75} aria-hidden />}
        mb={{ base: 5, md: 6 }}
      >
        Zurück zu den News
      </ChakraLinkButton>

      {/* Leseansicht: ruhige Glas-Karte ohne Anheben, lesbare Spalte (~46rem) */}
      <Box
        as="article"
        aria-labelledby="news-title"
        className="cc-card cc-card--still cc-rise"
        p={{ base: 5, md: 6 }}
      >
        <Stack gap={3} mb={coverSrc ? 6 : 5}>
          <Box
            as="h1"
            id="news-title"
            fontSize={{ base: "24px", md: "30px" }}
            fontWeight={600}
            lineHeight={1.2}
            letterSpacing="-0.01em"
            color="var(--cc-text)"
            overflowWrap="break-word"
          >
            {post.title}
          </Box>
          <Box overflow="hidden">
            <Flex className="cc-meta-row" wrap="wrap" fontSize="14px" lineHeight={1.4} color="var(--cc-text-2)">
              <Box as="span" className="cc-meta-item">
                Capital Circle News
              </Box>
              <Box as="time" dateTime={post.published_at} className="cc-meta-item cc-num">
                {new Date(post.published_at).toLocaleString("de-DE", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </Box>
            </Flex>
          </Box>
        </Stack>

        {coverSrc ? (
          <Box borderRadius="10px" overflow="hidden" border="1px solid var(--cc-line-strong)" mb={6}>
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
      </Box>
    </Box>
  );
}
