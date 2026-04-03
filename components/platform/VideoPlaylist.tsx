"use client";

import { useMemo } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Check, Circle, Lock, Play } from "lucide-react";
import { isPlaylistVideoDone, type PlaylistVideoRow } from "@/lib/module-video";

function formatDur(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Index freigeschaltet: erstes Video oder vorheriges vollständig gesehen. */
export function isPlaylistIndexUnlocked(
  playlist: PlaylistVideoRow[],
  progressMap: Record<string, number>,
  idx: number,
): boolean {
  if (idx < 0 || idx >= playlist.length) return false;
  if (idx === 0) return true;
  return isPlaylistVideoDone(playlist[idx - 1]!, progressMap);
}

type VideoPlaylistProps = {
  playlist: PlaylistVideoRow[];
  activeIndex: number;
  progressMap: Record<string, number>;
  onSelect: (index: number) => void;
};

type PlaylistItemRef = { idx: number; v: PlaylistVideoRow };

/** Behält die lineare Playlist-Reihenfolge (gemischte Admin-Position): direkte Videos und Subkategorie-Blöcke abwechselnd. */
type PlaylistBlock =
  | { kind: "videos"; items: PlaylistItemRef[] }
  | { kind: "sub"; subcategoryId: string; title: string; items: PlaylistItemRef[] };

function buildPlaylistBlocks(playlist: PlaylistVideoRow[]): PlaylistBlock[] {
  const blocks: PlaylistBlock[] = [];
  let currentVideos: PlaylistItemRef[] = [];
  let currentSub: { subcategoryId: string; title: string; items: PlaylistItemRef[] } | null = null;

  const flushVideos = () => {
    if (currentVideos.length > 0) {
      blocks.push({ kind: "videos", items: currentVideos });
      currentVideos = [];
    }
  };

  for (let idx = 0; idx < playlist.length; idx++) {
    const v = playlist[idx]!;
    const item: PlaylistItemRef = { idx, v };
    if (!v.subcategoryId) {
      if (currentSub) {
        blocks.push({
          kind: "sub",
          subcategoryId: currentSub.subcategoryId,
          title: currentSub.title,
          items: currentSub.items,
        });
        currentSub = null;
      }
      currentVideos.push(item);
      continue;
    }
    const sid = v.subcategoryId;
    const title = v.subcategoryTitle ?? "Abschnitt";
    if (currentSub && currentSub.subcategoryId === sid) {
      currentSub.items.push(item);
      continue;
    }
    if (currentSub) {
      blocks.push({
        kind: "sub",
        subcategoryId: currentSub.subcategoryId,
        title: currentSub.title,
        items: currentSub.items,
      });
    } else {
      flushVideos();
    }
    currentSub = { subcategoryId: sid, title, items: [item] };
  }

  flushVideos();
  if (currentSub) {
    blocks.push({
      kind: "sub",
      subcategoryId: currentSub.subcategoryId,
      title: currentSub.title,
      items: currentSub.items,
    });
  }

  return blocks;
}

export function VideoPlaylist({ playlist, activeIndex, progressMap, onSelect }: VideoPlaylistProps) {
  const blocks = useMemo(() => buildPlaylistBlocks(playlist), [playlist]);

  const row = (idx: number, v: PlaylistVideoRow) => {
    const active = idx === activeIndex;
    const done = isPlaylistVideoDone(v, progressMap);
    const unlocked = isPlaylistIndexUnlocked(playlist, progressMap, idx);
    const locked = !unlocked;

    return (
      <HStack
        key={v.id}
        as="button"
        type="button"
        w="full"
        textAlign="left"
        px={3}
        py={2.5}
        borderRadius="12px"
        borderWidth="1px"
        borderColor={
          locked
            ? "rgba(255,255,255,0.05)"
            : active
              ? "rgba(212, 175, 55, 0.45)"
              : "rgba(255,255,255,0.08)"
        }
        bg={
          locked
            ? "rgba(0,0,0,0.2)"
            : active
              ? "rgba(212, 175, 55, 0.08)"
              : "rgba(255,255,255,0.03)"
        }
        spacing={3}
        cursor={locked ? "not-allowed" : "pointer"}
        opacity={locked ? 0.55 : 1}
        transition="border-color 0.2s, background 0.2s, opacity 0.2s"
        _hover={
          locked
            ? {}
            : { borderColor: "rgba(212, 175, 55, 0.35)", bg: "rgba(255,255,255,0.05)" }
        }
        onClick={() => {
          if (!unlocked) return;
          onSelect(idx);
        }}
        aria-disabled={locked}
      >
        {v.thumbnailSignedUrl ? (
          <Box
            flexShrink={0}
            w="44px"
            h="44px"
            borderRadius="8px"
            overflow="hidden"
            borderWidth="1px"
            borderColor={
              locked
                ? "rgba(255,255,255,0.06)"
                : active
                  ? "rgba(212,175,55,0.45)"
                  : "rgba(255,255,255,0.12)"
            }
            position="relative"
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.thumbnailSignedUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {locked && (
              <Box
                position="absolute"
                inset={0}
                bg="rgba(0,0,0,0.55)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="rgba(240,240,242,0.7)"
              >
                <Lock size={14} strokeWidth={2} />
              </Box>
            )}
            {!locked && done && (
              <Box
                position="absolute"
                inset={0}
                bg="rgba(0,0,0,0.45)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="rgba(74,222,128,0.95)"
              >
                <Check size={14} strokeWidth={2.5} />
              </Box>
            )}
            {!locked && !done && active && (
              <Box
                position="absolute"
                inset={0}
                bg="rgba(0,0,0,0.35)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="var(--color-accent-gold)"
              >
                <Play size={14} strokeWidth={2} />
              </Box>
            )}
          </Box>
        ) : (
          <Box
            color={
              locked
                ? "rgba(240,240,242,0.35)"
                : active
                  ? "var(--color-accent-gold)"
                  : "rgba(240,240,242,0.5)"
            }
            flexShrink={0}
            aria-hidden
          >
            {locked ? (
              <Lock size={18} strokeWidth={2} />
            ) : done ? (
              <Check size={18} strokeWidth={2} />
            ) : active ? (
              <Play size={18} strokeWidth={2} />
            ) : (
              <Circle size={18} strokeWidth={1.5} />
            )}
          </Box>
        )}
        <Box flex={1} minW={0}>
          <Text
            className="inter-medium"
            fontSize="sm"
            color={locked ? "var(--color-text-muted)" : "var(--color-text-primary)"}
            noOfLines={2}
          >
            {v.title}
          </Text>
        </Box>
        <Text className="jetbrains-mono" fontSize="xs" color="rgba(240,240,242,0.55)" flexShrink={0}>
          {formatDur(v.duration_seconds)}
        </Text>
      </HStack>
    );
  };

  if (playlist.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Text className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-muted)">
        Inhalt
      </Text>
      {blocks.map((block, bi) => {
        if (block.kind === "videos") {
          return (
            <VStack key={`videos-${bi}`} align="stretch" spacing={2}>
              {block.items.map(({ idx, v }) => row(idx, v))}
            </VStack>
          );
        }
        return (
          <Accordion
            key={`sub-${block.subcategoryId}-${bi}`}
            allowToggle
            defaultIndex={0}
          >
            <AccordionItem border="none" mb={2}>
              <AccordionButton
                borderRadius="12px"
                bg="rgba(255,255,255,0.04)"
                borderWidth="1px"
                borderColor="rgba(255,255,255,0.08)"
                _hover={{ bg: "rgba(255,255,255,0.06)" }}
                py={3}
              >
                <Box flex="1" textAlign="left">
                  <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
                    {block.title}
                  </Text>
                </Box>
                <AccordionIcon color="var(--color-accent-gold)" />
              </AccordionButton>
              <AccordionPanel px={0} pt={2} pb={0}>
                <VStack align="stretch" spacing={2}>
                  {block.items.map(({ idx, v }) => row(idx, v))}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        );
      })}
    </VStack>
  );
}
