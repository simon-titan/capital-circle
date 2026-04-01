"use client";

import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import type { AnalysisPostRow } from "@/lib/server-data";
import { plainTextFromTiptapJson } from "@/lib/tiptap-excerpt";
import { useMemo, useState } from "react";

type Filter = "all" | "weekly" | "daily";

const GOLD = {
  activeBg: "rgba(212, 175, 55, 0.38)",
  activeBorder: "rgba(212, 175, 55, 0.58)",
  hover: "rgba(212, 175, 55, 0.48)",
};

const ORANGE = {
  activeBg: "rgba(255, 140, 60, 0.28)",
  activeBorder: "rgba(255, 170, 100, 0.55)",
  hover: "rgba(255, 140, 60, 0.38)",
  cardBorder: "rgba(255, 140, 60, 0.42)",
  radial: "radial-gradient(circle at 100% 0%, rgba(255, 130, 70, 0.2), transparent 50%)",
  badgeBg: "rgba(255, 130, 70, 0.18)",
  badgeBorder: "rgba(255, 170, 100, 0.45)",
  badgeColor: "#fed7aa",
  topLine: "linear-gradient(90deg, rgba(255, 140, 60, 0) 0%, rgba(255, 170, 100, 0.95) 45%, rgba(255, 140, 60, 0.3) 100%)",
};

const BLUE = {
  activeBg: "rgba(74, 144, 217, 0.28)",
  activeBorder: "rgba(100, 170, 240, 0.55)",
  hover: "rgba(74, 144, 217, 0.38)",
  cardBorder: "rgba(74, 144, 217, 0.42)",
  radial: "radial-gradient(circle at 100% 0%, rgba(74, 144, 217, 0.2), transparent 50%)",
  badgeBg: "rgba(74, 144, 217, 0.18)",
  badgeBorder: "rgba(147, 197, 253, 0.45)",
  badgeColor: "#bfdbfe",
  topLine: "linear-gradient(90deg, rgba(74, 144, 217, 0) 0%, rgba(147, 197, 253, 0.95) 45%, rgba(74, 144, 217, 0.3) 100%)",
};

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

export function AnalysisFeed({ posts }: { posts: AnalysisPostRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.post_type === filter);
  }, [posts, filter]);

  const filterBtn = (key: Filter, label: string) => {
    const active = filter === key;
    const palette = key === "all" ? GOLD : key === "weekly" ? ORANGE : BLUE;
    return (
      <Button
        key={key}
        size="sm"
        variant={active ? "solid" : "outline"}
        onClick={() => setFilter(key)}
        bg={active ? palette.activeBg : "transparent"}
        borderColor={active ? palette.activeBorder : "rgba(255,255,255,0.15)"}
        color="var(--color-text-primary)"
        _hover={{ bg: active ? palette.hover : "rgba(255,255,255,0.06)" }}
        className="inter-medium"
      >
        {label}
      </Button>
    );
  };

  return (
    <Stack gap={6}>
      <HStack flexWrap="wrap" gap={2}>
        {filterBtn("all", "Alle")}
        {filterBtn("weekly", "Weekly")}
        {filterBtn("daily", "Daily")}
      </HStack>

      {filtered.length === 0 ? (
        <Box className="glass-card-dashboard" p={8} borderRadius="14px" textAlign="center">
          <Text className="inter" color="var(--color-text-muted)">
            Noch keine Beiträge in dieser Kategorie.
          </Text>
        </Box>
      ) : (
        <Stack gap={8}>
          {filtered.map((post) => {
            const isWeekly = post.post_type === "weekly";
            const C = isWeekly ? ORANGE : BLUE;
            const img = cardImageSrc(post);
            const teaser = cardExcerpt(post);

            return (
              <Box
                key={post.id}
                className="glass-card-hero"
                overflow="hidden"
                borderRadius="18px"
                borderWidth="1px"
                borderColor={C.cardBorder}
                position="relative"
              >
                <Box position="absolute" top={0} left={0} right={0} h="2px" bg={C.topLine} zIndex={2} pointerEvents="none" />
                <Box position="absolute" inset={0} pointerEvents="none" bg={C.radial} zIndex={0} />

                {img ? (
                  <Box position="relative" h={{ base: "180px", md: "220px" }} bg="rgba(15,23,42,0.5)" overflow="hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </Box>
                ) : null}

                <Stack gap={4} position="relative" zIndex={1} p={{ base: 5, md: 7 }} pt={img ? { base: 4, md: 5 } : { base: 5, md: 7 }}>
                  <HStack justify="space-between" flexWrap="wrap" gap={2} align="flex-start">
                    <Text
                      className="radley-regular"
                      fontSize={{ base: "xl", md: "2xl" }}
                      color="var(--color-text-primary)"
                      flex="1"
                      minW={0}
                    >
                      {post.title}
                    </Text>
                    <Text
                      fontSize="xs"
                      textTransform="uppercase"
                      letterSpacing="0.12em"
                      className="inter-semibold"
                      px={2.5}
                      py={1}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={C.badgeBorder}
                      bg={C.badgeBg}
                      color={C.badgeColor}
                      flexShrink={0}
                    >
                      {isWeekly ? "Weekly" : "Daily"}
                    </Text>
                  </HStack>
                  <Text className="inter" fontSize="sm" color="var(--color-text-tertiary)">
                    {new Date(post.published_at).toLocaleString("de-DE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                  <Text className="inter" fontSize="sm" color="var(--color-text-secondary)" lineHeight={1.65} noOfLines={6}>
                    {teaser}
                  </Text>
                  <Box>
                    <ChakraLinkButton
                      href={`/analysis/${post.id}`}
                      size="sm"
                      variant="outline"
                      borderColor={isWeekly ? "rgba(255, 170, 100, 0.45)" : "rgba(147, 197, 253, 0.45)"}
                      color={isWeekly ? "#fed7aa" : "#bfdbfe"}
                      _hover={{ bg: isWeekly ? "rgba(255, 140, 60, 0.15)" : "rgba(74, 144, 217, 0.15)" }}
                    >
                      Weiterlesen
                    </ChakraLinkButton>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
