import { Box, Flex, Stack } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { ArticleRenderer } from "@/components/platform/ArticleRenderer";
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
    <Box maxW="46rem" w="100%" mx="auto">
      <ChakraLinkButton
        href="/analysis"
        variant="line"
        size="sm"
        leftIcon={<ArrowLeft size={15} strokeWidth={1.75} aria-hidden />}
        mb={{ base: 5, md: 6 }}
      >
        Zurück zur Übersicht
      </ChakraLinkButton>

      {/* Leseansicht: ruhige Glas-Karte ohne Anheben, lesbare Spalte (~46rem) */}
      <Box
        as="article"
        aria-labelledby="analysis-title"
        className="cc-card cc-card--still cc-rise"
        p={{ base: 5, md: 6 }}
      >
        <Stack gap={3} mb={coverSrc ? 6 : 5}>
          <Box
            as="h1"
            id="analysis-title"
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
                {isWeekly ? "Weekly" : "Daily"} · Analyse
              </Box>
              <Box as="time" dateTime={post.published_at} className="cc-meta-item cc-num">
                {new Date(post.published_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
              </Box>
            </Flex>
          </Box>
        </Stack>

        {coverSrc ? (
          <Box borderRadius="10px" overflow="hidden" border="1px solid var(--cc-line-strong)" mb={6}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverSrc} alt="" style={{ width: "100%", height: "auto", display: "block", maxHeight: "420px", objectFit: "cover" }} />
          </Box>
        ) : null}

        <ArticleRenderer key={post.id} content={post.content} />
      </Box>
    </Box>
  );
}
