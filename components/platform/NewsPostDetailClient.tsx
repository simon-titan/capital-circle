"use client";

import {
  Avatar,
  Box,
  Button,
  HStack,
  IconButton,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { Bookmark, BookmarkCheck, Heart, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import type { NewsCommentRow } from "@/lib/server-data";

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
    if (!confirm("Deinen Kommentar wirklich loeschen?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/news/comment?postId=${encodeURIComponent(postId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete");
      setComments((list) => list.filter((c) => c.id !== myComment.id));
      setMyComment(null);
    } catch {
      toast({ status: "error", title: "Kommentar konnte nicht geloescht werden." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap={6} id="interactions">
      <HStack
        gap={1}
        pt={4}
        mt={2}
        borderTopWidth="1px"
        borderColor="rgba(255, 255, 255, 0.08)"
        align="center"
      >
        <ActionBar
          icon={<Heart size={18} fill={liked ? "#D4AF37" : "none"} />}
          label={`${likeCount}`}
          active={liked}
          onClick={() => void toggleLike()}
          aria-label="Gefaellt mir"
        />
        <ActionBar
          icon={<MessageSquare size={18} />}
          label={`${comments.length}`}
          active={Boolean(myComment)}
          onClick={() => {
            const el = document.getElementById("comments");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          aria-label="Kommentare"
        />
        <Box flex="1" />
        <IconButton
          aria-label={saved ? "Gespeichert" : "Speichern"}
          icon={saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          onClick={() => void toggleSave()}
          variant="ghost"
          color={saved ? "#D4AF37" : "var(--color-text-tertiary)"}
          _hover={{ bg: "rgba(212, 175, 55, 0.12)", color: "#FEF3C7" }}
        />
      </HStack>

      <Stack gap={4} id="comments" scrollMarginTop="90px">
        <Text className="inter-semibold" fontSize="md" color="var(--color-text-primary)">
          Kommentare ({comments.length})
        </Text>

        {myComment ? (
          <Box
            p={4}
            borderRadius="12px"
            borderWidth="1px"
            borderColor="rgba(212, 175, 55, 0.32)"
            bg="rgba(212, 175, 55, 0.06)"
          >
            <HStack justify="space-between" align="flex-start" mb={2} gap={3}>
              <HStack gap={2.5} align="center">
                <Avatar size="sm" name={myComment.author_name ?? "Ich"} src={myComment.author_avatar_url ?? undefined} />
                <Stack gap={0}>
                  <Text fontSize="sm" className="inter-semibold" color="var(--color-text-primary)">
                    {myComment.author_name ?? "Du"}
                  </Text>
                  <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter">
                    Dein Kommentar · {formatRelative(myComment.created_at)}
                  </Text>
                </Stack>
              </HStack>
              <IconButton
                aria-label="Kommentar loeschen"
                icon={<Trash2 size={16} />}
                size="sm"
                variant="ghost"
                color="#F87171"
                isDisabled={busy}
                onClick={() => void deleteMyComment()}
                _hover={{ bg: "rgba(248, 113, 113, 0.12)" }}
              />
            </HStack>
            <Text fontSize="sm" className="inter" color="var(--color-text-secondary)" whiteSpace="pre-wrap">
              {myComment.body}
            </Text>
          </Box>
        ) : (
          <Stack
            gap={2}
            p={4}
            borderRadius="12px"
            borderWidth="1px"
            borderColor="rgba(255, 255, 255, 0.1)"
            bg="rgba(255, 255, 255, 0.03)"
          >
            <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter">
              Du kannst pro Beitrag genau einen Kommentar hinterlassen.
            </Text>
            <Textarea
              placeholder="Dein Kommentar..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_COMMENT}
              rows={3}
              bg="rgba(0, 0, 0, 0.25)"
              borderColor="rgba(255, 255, 255, 0.1)"
              _focus={{ borderColor: "rgba(212, 175, 55, 0.55)", boxShadow: "none" }}
              className="inter"
              color="var(--color-text-primary)"
            />
            <HStack justify="space-between">
              <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter">
                {draft.length}/{MAX_COMMENT}
              </Text>
              <Button
                size="sm"
                onClick={() => void submitComment()}
                isLoading={busy}
                isDisabled={!draft.trim()}
                bg="rgba(212, 175, 55, 0.35)"
                color="#FEF3C7"
                borderWidth="1px"
                borderColor="rgba(212, 175, 55, 0.55)"
                _hover={{ bg: "rgba(212, 175, 55, 0.5)" }}
                className="inter-medium"
              >
                Kommentieren
              </Button>
            </HStack>
          </Stack>
        )}

        <Stack gap={3}>
          {comments
            .filter((c) => c.user_id !== currentUserId)
            .map((c) => (
              <Box
                key={c.id}
                p={4}
                borderRadius="12px"
                borderWidth="1px"
                borderColor="rgba(255, 255, 255, 0.08)"
                bg="rgba(255, 255, 255, 0.02)"
              >
                <HStack gap={2.5} align="center" mb={2}>
                  <Avatar size="sm" name={c.author_name ?? "Mitglied"} src={c.author_avatar_url ?? undefined} />
                  <Stack gap={0}>
                    <Text fontSize="sm" className="inter-semibold" color="var(--color-text-primary)">
                      {c.author_name ?? "Mitglied"}
                    </Text>
                    <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter">
                      {formatRelative(c.created_at)}
                    </Text>
                  </Stack>
                </HStack>
                <Text fontSize="sm" className="inter" color="var(--color-text-secondary)" whiteSpace="pre-wrap">
                  {c.body}
                </Text>
              </Box>
            ))}

          {comments.length === 0 ? (
            <Text fontSize="sm" className="inter" color="var(--color-text-tertiary)">
              Noch keine Kommentare. Sei die Erste / der Erste.
            </Text>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}

function ActionBar({
  icon,
  label,
  active,
  onClick,
  "aria-label": ariaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      aria-label={ariaLabel}
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      px={3}
      py={2}
      borderRadius="8px"
      color={active ? "#D4AF37" : "var(--color-text-secondary)"}
      fontSize="sm"
      className="inter-medium"
      transition="all 0.18s ease"
      _hover={{ bg: "rgba(212, 175, 55, 0.12)", color: "#FEF3C7" }}
    >
      {icon}
      <Text as="span" fontSize="sm" className="inter-medium">
        {label}
      </Text>
    </Box>
  );
}
