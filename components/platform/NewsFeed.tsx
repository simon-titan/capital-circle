"use client";

import { Box, Button, Flex, IconButton, Stack, useToast, type ButtonProps } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { Bookmark, BookmarkCheck, Heart, MessageSquare } from "lucide-react";
import type { NewsPostWithCounts } from "@/lib/server-data";
import { plainTextFromTiptapJson } from "@/lib/tiptap-excerpt";
import { Meta, clampLines } from "@/components/platform/dashboard/primitives";

type PostState = NewsPostWithCounts;

/** Aktiver Filter wie der aktive Nav-Punkt: Gold-Haarlinie, Gold-Verlauf von links, Text in Gold hell. */
const activeChip: ButtonProps = {
  bg: "linear-gradient(90deg, rgba(212, 176, 128, 0.16) 0%, rgba(212, 176, 128, 0.03) 100%)",
  borderColor: "var(--cc-gold-line)",
  color: "var(--cc-gold-light)",
  boxShadow: "0 0 18px rgba(212, 176, 128, 0.1)",
  _hover: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 18px rgba(212, 176, 128, 0.14)" },
};

function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

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
    <Stack gap={5}>
      <Flex role="group" aria-label="News filtern" gap={2} wrap="wrap">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Alle Posts
        </FilterChip>
        <FilterChip active={filter === "saved"} onClick={() => setFilter("saved")}>
          Gespeichert
        </FilterChip>
      </Flex>

      {filtered.length === 0 ? (
        <Box className="cc-card cc-card--still cc-rise" style={riseDelay(0)} p={{ base: 6, md: 8 }} textAlign="center">
          <Meta fontSize="16px">
            {filter === "saved" ? "Du hast noch keine Posts gespeichert." : "Noch keine News. Schau später wieder rein."}
          </Meta>
        </Box>
      ) : (
        <Stack gap={5}>
          {filtered.map((post, i) => (
            <NewsCard
              key={post.id}
              post={post}
              index={i}
              onToggleLike={() => void toggleLike(post.id)}
              onToggleSave={() => void toggleSave(post.id)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button size="sm" variant="line" aria-pressed={active} onClick={onClick} {...(active ? activeChip : {})}>
      {children}
    </Button>
  );
}

function NewsCard({
  post,
  index,
  onToggleLike,
  onToggleSave,
}: {
  post: PostState;
  index: number;
  onToggleLike: () => void;
  onToggleSave: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const img = cardImageSrc(post);
  const text = teaser(post);
  const titleId = `news-card-${post.id}`;

  return (
    <Box
      as="article"
      aria-labelledby={titleId}
      className="cc-card cc-rise"
      style={riseDelay(index)}
      display="flex"
      flexDirection={{ base: "column", md: img ? "row" : "column" }}
      minW={0}
    >
      {img ? (
        // Bild ist ein zweiter Weg zum Beitrag — für Tastatur/Screenreader reicht der Titel-Link.
        <Box
          as={Link}
          href={`/news/${post.id}`}
          aria-hidden
          tabIndex={-1}
          flexShrink={0}
          w={{ base: "100%", md: "220px" }}
          h={{ base: "180px", md: "auto" }}
          minH={{ md: "180px" }}
          bg="var(--cc-surface-2)"
          overflow="hidden"
          borderTopLeftRadius="11px"
          borderTopRightRadius={{ base: "11px", md: 0 }}
          borderBottomLeftRadius={{ base: 0, md: "11px" }}
          borderBottom={{ base: "1px solid var(--cc-line)", md: "none" }}
          borderRight={{ base: "none", md: "1px solid var(--cc-line)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </Box>
      ) : null}

      <Stack gap={3} p={{ base: 5, md: 6 }} flex="1" minW={0}>
        <Stack gap={1.5}>
          <Box
            as="h2"
            id={titleId}
            fontSize={{ base: "17px", md: "18px" }}
            fontWeight={600}
            lineHeight={1.3}
            letterSpacing="-0.01em"
            color="var(--cc-text)"
            sx={clampLines(2)}
          >
            <Box
              as={Link}
              href={`/news/${post.id}`}
              transition="color 180ms var(--cc-ease)"
              _hover={{ color: "var(--cc-gold-light)" }}
            >
              {post.title}
            </Box>
          </Box>
          <Box
            as="time"
            dateTime={post.published_at}
            className="cc-num"
            fontSize="13px"
            lineHeight={1.5}
            color="var(--cc-text-2)"
          >
            {formatDate(post.published_at)}
          </Box>
        </Stack>

        {text ? (
          <Meta fontSize="15px" lineHeight={1.6} sx={clampLines(3)}>
            {text}
          </Meta>
        ) : null}

        <Flex pt={3} mt="auto" borderTop="1px solid var(--cc-line)" gap={1} align="center">
          <ActionButton
            icon={<Heart size={18} strokeWidth={1.75} fill={post.liked_by_me ? "currentColor" : "none"} />}
            count={post.like_count}
            active={post.liked_by_me}
            pressed={post.liked_by_me}
            onClick={onToggleLike}
            label={post.liked_by_me ? "Gefällt mir entfernen" : "Gefällt mir"}
          />
          <ActionButton
            icon={<MessageSquare size={18} strokeWidth={1.75} />}
            count={post.comment_count}
            active={post.commented_by_me}
            onClick={() => startTransition(() => router.push(`/news/${post.id}#comments`))}
            label="Kommentare"
          />
          <Box flex="1" />
          <IconButton
            aria-label={post.saved_by_me ? "Gespeichert" : "Speichern"}
            aria-pressed={post.saved_by_me}
            icon={post.saved_by_me ? <BookmarkCheck size={18} strokeWidth={1.75} /> : <Bookmark size={18} strokeWidth={1.75} />}
            onClick={onToggleSave}
            variant="ghost"
            size="sm"
            color={post.saved_by_me ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
            _hover={{ bg: "rgba(255, 255, 255, 0.04)", color: post.saved_by_me ? "var(--cc-gold-light)" : "var(--cc-text)" }}
          />
        </Flex>
      </Stack>
    </Box>
  );
}

function ActionButton({
  icon,
  count,
  active,
  pressed,
  onClick,
  label,
}: {
  icon: ReactNode;
  count: number;
  active: boolean;
  pressed?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      aria-label={`${label} (${count})`}
      aria-pressed={pressed}
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      px={2.5}
      py={1.5}
      borderRadius="8px"
      color={active ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
      fontSize="14px"
      fontWeight={500}
      transition="background-color 180ms var(--cc-ease), color 180ms var(--cc-ease)"
      _hover={{ bg: "rgba(255, 255, 255, 0.04)", color: active ? "var(--cc-gold-light)" : "var(--cc-text)" }}
    >
      {icon}
      <Box as="span" className="cc-num" aria-hidden>
        {count}
      </Box>
    </Box>
  );
}
