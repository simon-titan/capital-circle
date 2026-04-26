"use client";

import { Box, Flex, HStack, IconButton, Stack, Text, useToast } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Heart, MessageSquare } from "lucide-react";
import type { NewsPostWithCounts } from "@/lib/server-data";
import { plainTextFromTiptapJson } from "@/lib/tiptap-excerpt";

type PostState = NewsPostWithCounts;

function cardImageSrc(post: PostState): string | null {
  if (post.cover_image_storage_key) {
    return `/api/news-post-image?id=${encodeURIComponent(post.id)}`;
  }
  return null;
}

function teaser(post: PostState): string {
  const ex = post.excerpt?.trim();
  if (ex) return ex;
  return plainTextFromTiptapJson(post.content, 240);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function NewsFeed({ posts: initialPosts }: { posts: NewsPostWithCounts[] }) {
  const [posts, setPosts] = useState<PostState[]>(initialPosts);
  const [filter, setFilter] = useState<"all" | "saved">("all");
  const toast = useToast();

  // Beim Mount: last_seen_at aktualisieren (Badge zuruecksetzen)
  useEffect(() => {
    void fetch("/api/news/read-status", { method: "POST" }).catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () => (filter === "saved" ? posts.filter((p) => p.saved_by_me) : posts),
    [posts, filter],
  );

  const toggleLike = async (postId: string) => {
    const prev = posts;
    setPosts((list) =>
      list.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked_by_me: !p.liked_by_me,
              like_count: p.liked_by_me ? Math.max(0, p.like_count - 1) : p.like_count + 1,
            }
          : p,
      ),
    );
    try {
      const res = await fetch("/api/news/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error("like failed");
    } catch {
      setPosts(prev);
      toast({ status: "error", title: "Like konnte nicht gespeichert werden." });
    }
  };

  const toggleSave = async (postId: string) => {
    const prev = posts;
    setPosts((list) =>
      list.map((p) => (p.id === postId ? { ...p, saved_by_me: !p.saved_by_me } : p)),
    );
    try {
      const res = await fetch("/api/news/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setPosts(prev);
      toast({ status: "error", title: "Speichern fehlgeschlagen." });
    }
  };

  return (
    <Stack gap={6}>
      <HStack gap={2} flexWrap="wrap">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="Alle Posts" />
        <FilterButton active={filter === "saved"} onClick={() => setFilter("saved")} label="Gespeichert" />
      </HStack>

      {filtered.length === 0 ? (
        <Box
          p={8}
          borderRadius="16px"
          textAlign="center"
          borderWidth="1px"
          borderColor="rgba(212, 175, 55, 0.18)"
          bg="rgba(255, 255, 255, 0.03)"
        >
          <Text className="inter" color="var(--color-text-muted)">
            {filter === "saved" ? "Du hast noch keine Posts gespeichert." : "Noch keine News. Schau spaeter wieder rein."}
          </Text>
        </Box>
      ) : (
        <Stack gap={5}>
          {filtered.map((post) => (
            <NewsCard
              key={post.id}
              post={post}
              onToggleLike={() => void toggleLike(post.id)}
              onToggleSave={() => void toggleSave(post.id)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <Box
      as="button"
      onClick={onClick}
      px={4}
      py={1.5}
      borderRadius="999px"
      borderWidth="1px"
      borderColor={active ? "rgba(212, 175, 55, 0.55)" : "rgba(255, 255, 255, 0.12)"}
      bg={active ? "rgba(212, 175, 55, 0.18)" : "transparent"}
      color={active ? "#FEF3C7" : "var(--color-text-secondary)"}
      fontSize="sm"
      className="inter-medium"
      transition="all 0.18s ease"
      _hover={{ bg: active ? "rgba(212, 175, 55, 0.24)" : "rgba(255, 255, 255, 0.06)" }}
    >
      {label}
    </Box>
  );
}

function NewsCard({
  post,
  onToggleLike,
  onToggleSave,
}: {
  post: PostState;
  onToggleLike: () => void;
  onToggleSave: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const img = cardImageSrc(post);
  const text = teaser(post);

  return (
    <Box
      role="article"
      position="relative"
      borderRadius="18px"
      borderWidth="1px"
      borderColor="rgba(255, 255, 255, 0.08)"
      bg="rgba(12, 13, 16, 0.72)"
      overflow="hidden"
      transition="border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease"
      _hover={{
        borderColor: "rgba(212, 175, 55, 0.38)",
        transform: "translateY(-2px)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
      }}
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="2px"
        bg="linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(212,175,55,0.7) 50%, rgba(212,175,55,0) 100%)"
        opacity={0.8}
        pointerEvents="none"
      />

      <Flex direction={{ base: "column", md: img ? "row" : "column" }} gap={0}>
        {img ? (
          <Box
            as={Link}
            href={`/news/${post.id}`}
            flexShrink={0}
            w={{ base: "100%", md: "220px" }}
            h={{ base: "180px", md: "auto" }}
            minH={{ md: "180px" }}
            bg="rgba(15, 23, 42, 0.5)"
            overflow="hidden"
            position="relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </Box>
        ) : null}

        <Stack gap={3} p={{ base: 5, md: 6 }} flex="1" minW={0}>
          <HStack justify="space-between" align="flex-start" gap={3}>
            <Text
              as={Link}
              href={`/news/${post.id}`}
              className="radley-regular"
              fontSize={{ base: "lg", md: "xl" }}
              color="var(--color-text-primary)"
              lineHeight={1.25}
              _hover={{ color: "#FEF3C7" }}
              noOfLines={2}
            >
              {post.title}
            </Text>
            <Text
              fontSize="xs"
              letterSpacing="0.08em"
              color="var(--color-text-tertiary)"
              className="inter"
              flexShrink={0}
              mt={1}
            >
              {formatDate(post.published_at)}
            </Text>
          </HStack>

          {text ? (
            <Text className="inter" fontSize="sm" color="var(--color-text-secondary)" lineHeight={1.6} noOfLines={3}>
              {text}
            </Text>
          ) : null}

          <HStack
            pt={2}
            borderTopWidth="1px"
            borderColor="rgba(255, 255, 255, 0.06)"
            gap={1}
            justify="flex-start"
            align="center"
          >
            <ActionButton
              icon={<Heart size={18} fill={post.liked_by_me ? "#D4AF37" : "none"} />}
              count={post.like_count}
              active={post.liked_by_me}
              onClick={onToggleLike}
              label={post.liked_by_me ? "Gefaellt mir entfernen" : "Gefaellt mir"}
            />
            <ActionButton
              icon={<MessageSquare size={18} />}
              count={post.comment_count}
              active={post.commented_by_me}
              onClick={() => startTransition(() => router.push(`/news/${post.id}#comments`))}
              label="Kommentare"
            />
            <Box flex="1" />
            <IconButton
              aria-label={post.saved_by_me ? "Gespeichert" : "Speichern"}
              icon={post.saved_by_me ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              onClick={onToggleSave}
              variant="ghost"
              size="sm"
              color={post.saved_by_me ? "#D4AF37" : "var(--color-text-tertiary)"}
              _hover={{ bg: "rgba(212, 175, 55, 0.12)", color: "#FEF3C7" }}
            />
          </HStack>
        </Stack>
      </Flex>
    </Box>
  );
}

function ActionButton({
  icon,
  count,
  active,
  onClick,
  label,
}: {
  icon: React.ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      aria-label={label}
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      px={2.5}
      py={1.5}
      borderRadius="8px"
      color={active ? "#D4AF37" : "var(--color-text-tertiary)"}
      fontSize="sm"
      className="inter-medium"
      transition="all 0.18s ease"
      _hover={{ bg: "rgba(212, 175, 55, 0.12)", color: "#FEF3C7" }}
    >
      {icon}
      <Text as="span" fontSize="xs" className="inter-medium">
        {count}
      </Text>
    </Box>
  );
}
