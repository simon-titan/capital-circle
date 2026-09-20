"use client";

import {
  Avatar,
  Box,
  Button,
  Flex,
  IconButton,
  Stack,
  StackDivider,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { Bookmark, BookmarkCheck, Heart, MessageSquare, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { NewsCommentRow } from "@/lib/server-data";
import { Meta } from "@/components/platform/dashboard/primitives";
import { avatarSrc } from "@/lib/avatar";

type Props = {
  postId: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  initialSavedByMe: boolean;
  initialComments: NewsCommentRow[];
  initialMyComment: NewsCommentRow | null;
  currentUserId: string;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null;
};

const MAX_COMMENT = 2000;

/** Eingabefeld im Schema v3.2: Haarlinie, Gold-Kante bei Fokus. */
const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  fontSize: "15px",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.35)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
};

/** Chakra färbt Avatare zufällig nach Name — hier neutral wie die Icon-Kacheln. */
const avatarProps = {
  size: "sm",
  bg: "var(--cc-surface-2)",
  color: "var(--cc-text-soft)",
  borderWidth: "1px",
  borderColor: "var(--cc-line-strong)",
} as const;

function formatRelative(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function NewsPostDetailClient({
  postId,
  initialLikeCount,
  initialLikedByMe,
  initialSavedByMe,
  initialComments,
  initialMyComment,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
}: Props) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLikedByMe);
  const [saved, setSaved] = useState(initialSavedByMe);
  const [comments, setComments] = useState<NewsCommentRow[]>(initialComments);
  const [myComment, setMyComment] = useState<NewsCommentRow | null>(initialMyComment);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try {
      const res = await fetch("/api/news/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error("like");
    } catch {
      setLiked(!next);
      setLikeCount((c) => (next ? Math.max(0, c - 1) : c + 1));
      toast({ status: "error", title: "Like konnte nicht gespeichert werden." });
    }
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      const res = await fetch("/api/news/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error("save");
    } catch {
      setSaved(!next);
      toast({ status: "error", title: "Speichern fehlgeschlagen." });
    }
  };

  const submitComment = async () => {
    const body = draft.trim();
    if (!body) return;
    if (body.length > MAX_COMMENT) {
      toast({ status: "warning", title: `Maximal ${MAX_COMMENT} Zeichen.` });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/news/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, body }),
      });
      const json = (await res.json()) as { ok: boolean; id?: string; error?: string };
      if (!res.ok || !json.ok) {
        if (json.error === "already_commented") {
          toast({ status: "warning", title: "Du hast diesen Post bereits kommentiert." });
        } else {
          toast({ status: "error", title: "Kommentar konnte nicht gespeichert werden." });
        }
        return;
      }
      const now = new Date().toISOString();
      const added: NewsCommentRow = {
        id: json.id ?? `tmp-${Date.now()}`,
        post_id: postId,
        user_id: currentUserId,
        body,
        created_at: now,
        updated_at: now,
        author_name: currentUserName,
        author_avatar_url: currentUserAvatarUrl,
      };
      setMyComment(added);
      setComments((list) => [added, ...list]);
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const deleteMyComment = async () => {
    if (!myComment) return;
    if (!confirm("Deinen Kommentar wirklich löschen?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/news/comment?postId=${encodeURIComponent(postId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete");
      setComments((list) => list.filter((c) => c.id !== myComment.id));
      setMyComment(null);
    } catch {
      toast({ status: "error", title: "Kommentar konnte nicht gelöscht werden." });
    } finally {
      setBusy(false);
    }
  };

  const otherComments = comments.filter((c) => c.user_id !== currentUserId);

  return (
    <Box id="interactions" mt={6}>
      <Flex gap={1} pt={4} borderTop="1px solid var(--cc-line)" align="center">
        <ActionBar
          icon={<Heart size={18} strokeWidth={1.75} fill={liked ? "currentColor" : "none"} />}
          label={`${likeCount}`}
          active={liked}
          pressed={liked}
          onClick={() => void toggleLike()}
          aria-label={`Gefällt mir (${likeCount})`}
        />
        <ActionBar
          icon={<MessageSquare size={18} strokeWidth={1.75} />}
          label={`${comments.length}`}
          active={Boolean(myComment)}
          onClick={() => {
            const el = document.getElementById("comments");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          aria-label={`Kommentare (${comments.length})`}
        />
        <Box flex="1" />
        <IconButton
          aria-label={saved ? "Gespeichert" : "Speichern"}
          aria-pressed={saved}
          icon={saved ? <BookmarkCheck size={18} strokeWidth={1.75} /> : <Bookmark size={18} strokeWidth={1.75} />}
          onClick={() => void toggleSave()}
          variant="ghost"
          color={saved ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
          _hover={{ bg: "rgba(255, 255, 255, 0.04)", color: saved ? "var(--cc-gold-light)" : "var(--cc-text)" }}
        />
      </Flex>

      <Box
        as="section"
        id="comments"
        aria-labelledby="comments-title"
        scrollMarginTop="90px"
        mt={5}
        pt={6}
        borderTop="1px solid var(--cc-line)"
      >
        <Box
          as="h2"
          id="comments-title"
          className="cc-num"
          fontSize="13px"
          lineHeight="18px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-soft)"
          mb={4}
        >
          Kommentare ({comments.length})
        </Box>

        {myComment ? (
          <Box
            p={4}
            borderRadius="10px"
            border="1px solid rgba(212, 176, 128, 0.3)"
            bg="var(--cc-gold-wash)"
          >
            <Flex justify="space-between" align="flex-start" mb={2} gap={3}>
              <Flex gap={2.5} align="center" minW={0}>
                <Avatar {...avatarProps} name={myComment.author_name ?? "Ich"} src={avatarSrc(myComment.author_avatar_url)} />
                <Stack gap={0} minW={0}>
                  <Text fontSize="14px" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                    {myComment.author_name ?? "Du"}
                  </Text>
                  <Meta fontSize="13px" className="cc-num">
                    Dein Kommentar · {formatRelative(myComment.created_at)}
                  </Meta>
                </Stack>
              </Flex>
              <IconButton
                aria-label="Kommentar löschen"
                icon={<Trash2 size={16} strokeWidth={1.75} />}
                size="sm"
                variant="ghost"
                color="var(--cc-text-3)"
                isDisabled={busy}
                onClick={() => void deleteMyComment()}
                _hover={{ bg: "rgba(248, 113, 113, 0.1)", color: "var(--cc-danger)" }}
              />
            </Flex>
            <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-soft)" whiteSpace="pre-wrap" overflowWrap="break-word">
              {myComment.body}
            </Text>
          </Box>
        ) : (
          <Stack gap={3}>
            <Meta fontSize="13px">Du kannst pro Beitrag genau einen Kommentar hinterlassen.</Meta>
            <Textarea
              aria-label="Dein Kommentar"
              placeholder="Dein Kommentar..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_COMMENT}
              rows={3}
              {...fieldSx}
            />
            <Flex justify="space-between" align="center" gap={3}>
              <Text fontSize="13px" color="var(--cc-text-3)" className="cc-num">
                {draft.length}/{MAX_COMMENT}
              </Text>
              <Button
                size="sm"
                variant="line"
                onClick={() => void submitComment()}
                isLoading={busy}
                isDisabled={!draft.trim()}
              >
                Kommentieren
              </Button>
            </Flex>
          </Stack>
        )}

        {otherComments.length > 0 ? (
          <Stack
            mt={5}
            spacing={0}
            divider={<StackDivider borderColor="var(--cc-line)" />}
            borderTop="1px solid var(--cc-line)"
          >
            {otherComments.map((c) => (
              <Box key={c.id} py={4}>
                <Flex gap={2.5} align="center" mb={2} minW={0}>
                  <Avatar {...avatarProps} name={c.author_name ?? "Mitglied"} src={avatarSrc(c.author_avatar_url)} />
                  <Stack gap={0} minW={0}>
                    <Text fontSize="14px" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                      {c.author_name ?? "Mitglied"}
                    </Text>
                    <Meta fontSize="13px" className="cc-num">
                      {formatRelative(c.created_at)}
                    </Meta>
                  </Stack>
                </Flex>
                <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-soft)" whiteSpace="pre-wrap" overflowWrap="break-word">
                  {c.body}
                </Text>
              </Box>
            ))}
          </Stack>
        ) : null}

        {comments.length === 0 ? (
          <Meta mt={4}>Noch keine Kommentare. Sei die Erste / der Erste.</Meta>
        ) : null}
      </Box>
    </Box>
  );
}

function ActionBar({
  icon,
  label,
  active,
  pressed,
  onClick,
  "aria-label": ariaLabel,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  pressed?: boolean;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      px={3}
      py={2}
      borderRadius="8px"
      color={active ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
      fontSize="14px"
      fontWeight={500}
      transition="background-color 180ms var(--cc-ease), color 180ms var(--cc-ease)"
      _hover={{ bg: "rgba(255, 255, 255, 0.04)", color: active ? "var(--cc-gold-light)" : "var(--cc-text)" }}
    >
      {icon}
      <Box as="span" className="cc-num" aria-hidden>
        {label}
      </Box>
    </Box>
  );
}
