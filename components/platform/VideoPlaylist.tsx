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

export function VideoPlaylist({ playlist, activeIndex, progressMap, onSelect }: VideoPlaylistProps) {
  const groups = useMemo(() => {
    const direct: { idx: number; v: PlaylistVideoRow }[] = [];
    const subs = new Map<string, { title: string; items: { idx: number; v: PlaylistVideoRow }[] }>();
    playlist.forEach((v, idx) => {
      if (!v.subcategoryId) {
        direct.push({ idx, v });
        return;
      }
      const key = v.subcategoryId;
      const title = v.subcategoryTitle ?? "Abschnitt";
      let g = subs.get(key);
      if (!g) {
        g = { title, items: [] };
        subs.set(key, g);
      }
      g.items.push({ idx, v });
    });
    return { direct, subs: [...subs.values()] };
  }, [playlist]);

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
      {groups.direct.length > 0 ? (
        <VStack align="stretch" spacing={2}>
          {groups.direct.map(({ idx, v }) => row(idx, v))}
        </VStack>
      ) : null}
      {groups.subs.length > 0 ? (
        <Accordion allowMultiple defaultIndex={groups.subs.map((_, i) => i)}>
          {groups.subs.map((g, i) => (
            <AccordionItem key={i} border="none" mb={2}>
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
                    {g.title}
                  </Text>
                </Box>
                <AccordionIcon color="var(--color-accent-gold)" />
              </AccordionButton>
              <AccordionPanel px={0} pt={2} pb={0}>
                <VStack align="stretch" spacing={2}>
                  {g.items.map(({ idx, v }) => row(idx, v))}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      ) : null}
    </VStack>
  );
}
