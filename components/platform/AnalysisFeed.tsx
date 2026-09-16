"use client";

import { Box, Button, Flex, SimpleGrid, Stack, type ButtonProps } from "@chakra-ui/react";
import NextLink from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { AnalysisPostRow } from "@/lib/server-data";
import { plainTextFromTiptapJson } from "@/lib/tiptap-excerpt";
import { Meta, clampLines } from "@/components/platform/dashboard/primitives";

type Filter = "all" | "weekly" | "daily";

/** Aktiver Filter wie der aktive Nav-Punkt: Gold-Haarlinie, Gold-Verlauf von links, Text in Gold hell. */
const activeChip: ButtonProps = {
  bg: "linear-gradient(90deg, rgba(212, 176, 128, 0.16) 0%, rgba(212, 176, 128, 0.03) 100%)",
  borderColor: "var(--cc-gold-line)",
  color: "var(--cc-gold-light)",
  boxShadow: "0 0 18px rgba(212, 176, 128, 0.1)",
  _hover: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 18px rgba(212, 176, 128, 0.14)" },
};

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button size="sm" variant="line" aria-pressed={active} onClick={onClick} {...(active ? activeChip : {})}>
      {children}
    </Button>
  );
}

function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

function cardImageSrc(post: AnalysisPostRow): string | null {
  if (post.cover_image_storage_key) {
    return `/api/analysis-post-image?id=${encodeURIComponent(post.id)}&variant=cover`;
  }
  if (post.image_storage_key) {
    return `/api/analysis-post-image?id=${encodeURIComponent(post.id)}`;
  }
  return null;
}

function cardExcerpt(post: AnalysisPostRow): string {
  const ex = post.excerpt?.trim();
  if (ex) return ex;
  return plainTextFromTiptapJson(post.content, 220);
}

function cardDate(post: AnalysisPostRow): string {
  return post.analysis_date
    ? new Date(post.analysis_date).toLocaleDateString("de-DE", { dateStyle: "long" })
    : new Date(post.published_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function AnalysisFeed({ posts }: { posts: AnalysisPostRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.post_type === filter);
  }, [posts, filter]);

  return (
    <Stack gap={5}>
      <Flex role="group" aria-label="Analysen filtern" wrap="wrap" gap={2}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Alle
        </FilterChip>
        <FilterChip active={filter === "weekly"} onClick={() => setFilter("weekly")}>
          Weekly
        </FilterChip>
        <FilterChip active={filter === "daily"} onClick={() => setFilter("daily")}>
          Daily
        </FilterChip>
      </Flex>

      {filtered.length === 0 ? (
        <Box className="cc-card cc-card--still cc-rise" style={riseDelay(0)} p={{ base: 6, md: 8 }} textAlign="center">
          <Meta fontSize="16px">Noch keine Beiträge in dieser Kategorie.</Meta>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5} alignItems="stretch">
          {filtered.map((post, i) => {
            const isWeekly = post.post_type === "weekly";
            const img = cardImageSrc(post);
            const teaser = cardExcerpt(post);
            const titleId = `analysis-card-${post.id}`;

            return (
              <Box
                as="article"
                key={post.id}
                aria-labelledby={titleId}
                className="cc-card cc-rise"
                style={riseDelay(i)}
                display="flex"
                flexDirection="column"
                minW={0}
                h="100%"
              >
                {img ? (
                  // Bild oben, Ecken passend zur Karte; die Gold-Kante der Karte bleibt sichtbar (kein overflow am Wrapper).
                  <Box
                    h={{ base: "180px", md: "200px" }}
                    borderTopRadius="11px"
                    overflow="hidden"
                    borderBottom="1px solid var(--cc-line)"
                    bg="var(--cc-surface-2)"
                    flexShrink={0}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </Box>
                ) : null}

                <Stack gap={3} p={{ base: 5, md: 6 }} flex="1">
                  <Stack gap={1.5}>
                    <Box
                      as="h2"
                      id={titleId}
                      fontSize={{ base: "17px", md: "18px" }}
                      fontWeight={600}
                      lineHeight={1.3}
                      letterSpacing="-0.01em"
                      color="var(--cc-text)"
                      overflowWrap="break-word"
                    >
                      {post.title}
                    </Box>
                    <Box overflow="hidden">
                      <Flex className="cc-meta-row" wrap="wrap" fontSize="14px" lineHeight={1.4} color="var(--cc-text-2)">
                        <Box as="span" className="cc-meta-item">
                          {isWeekly ? "Weekly" : "Daily"}
                        </Box>
                        <Box as="span" className="cc-meta-item cc-num">
                          {cardDate(post)}
                        </Box>
                      </Flex>
                    </Box>
                  </Stack>

                  {teaser ? (
                    <Meta fontSize="15px" lineHeight={1.6} sx={clampLines(4)}>
                      {teaser}
                    </Meta>
                  ) : null}

                  <Box mt="auto" pt={2}>
                    <Button
                      as={NextLink}
                      href={`/analysis/${post.id}`}
                      size="sm"
                      variant="line"
                      aria-label={`${post.title} weiterlesen`}
                    >
                      Weiterlesen
                    </Button>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
}
