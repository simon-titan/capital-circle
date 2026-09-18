"use client";

import { useMemo, useState } from "react";
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
import { Check, Lock, Play } from "lucide-react";
import { clampLines } from "@/components/platform/dashboard/primitives";
import { isPlaylistVideoDone, type PlaylistVideoRow } from "@/lib/module-video";

/** „11 Min.“ wie in der Kursleiste der Vorlage; unter einer Minute „1 Min.“. */
function formatMinutes(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  return `${Math.max(1, Math.round(sec / 60))} Min.`;
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

/** Vorschaubild der Lektion mit Zustand: Schloss, läuft gerade, erledigt. */
function LessonThumb({
  v,
  active,
  done,
  locked,
}: {
  v: PlaylistVideoRow;
  active: boolean;
  done: boolean;
  locked: boolean;
}) {
  /*
   * Signierte Standbilder können ins Leere laufen — der Token läuft ab, und
   * Cloudflare liefert erst ein Bild, wenn die Kodierung durch ist. Ein kaputtes
   * <img> hinterlässt sonst eine zerrissene Kachel; hier fällt die Zeile
   * stattdessen auf denselben ruhigen Platzhalter zurück wie ein Video ohne Bild.
   */
  const [bildKaputt, setBildKaputt] = useState(false);
  const bildUrl = !bildKaputt ? v.thumbnailSignedUrl : null;

  return (
    <Box
      flexShrink={0}
      w="80px"
      h="46px"
      borderRadius="6px"
      overflow="hidden"
      position="relative"
      bg="var(--cc-surface-2)"
      border="1px solid"
      borderColor={active ? "var(--cc-gold-line)" : "rgba(255, 255, 255, 0.1)"}
      aria-hidden
    >
      {bildUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bildUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBildKaputt(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : null}
      {locked ? (
        // Seit die Kacheln ein echtes Standbild tragen, muss das Schloss dagegen
        // anstehen: dunklere Decke, hellere Linie.
        <Box position="absolute" inset={0} bg="rgba(0,0,0,0.72)" display="flex" alignItems="center" justifyContent="center" color="var(--cc-text-soft)">
          <Lock size={14} strokeWidth={2} />
        </Box>
      ) : active ? (
        <Box position="absolute" inset={0} bg="rgba(0,0,0,0.35)" display="flex" alignItems="center" justifyContent="center">
          <Box
            w="24px"
            h="24px"
            borderRadius="full"
            bg="var(--cc-gold-grad)"
            color="var(--cc-on-gold)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 0 14px rgba(212, 176, 128, 0.6)"
          >
            <Play size={11} fill="currentColor" strokeWidth={0} style={{ marginLeft: 1 }} />
          </Box>
        </Box>
      ) : !bildUrl ? (
        <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" color="var(--cc-text-3)">
          <Play size={14} strokeWidth={2} />
        </Box>
      ) : null}
      {done && !locked ? (
        <Box
          position="absolute"
          right="3px"
          bottom="3px"
          w="16px"
          h="16px"
          borderRadius="full"
          bg="var(--cc-gold-grad)"
          color="var(--cc-on-gold)"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Check size={10} strokeWidth={3} />
        </Box>
      ) : null}
    </Box>
  );
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
        spacing={3}
        borderRadius="10px"
        border="1px solid"
        borderColor={active ? "var(--cc-gold-line)" : "transparent"}
        bg={active ? "linear-gradient(90deg, rgba(212, 176, 128, 0.14) 0%, rgba(212, 176, 128, 0.03) 100%)" : "transparent"}
        boxShadow={active ? "0 0 18px rgba(212, 176, 128, 0.1)" : "none"}
        cursor={locked ? "not-allowed" : "pointer"}
        opacity={locked ? 0.55 : 1}
        transition="background-color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)"
        _hover={locked || active ? {} : { bg: "rgba(255, 255, 255, 0.04)" }}
        onClick={() => {
          if (!unlocked) return;
          onSelect(idx);
        }}
        aria-disabled={locked}
        aria-current={active ? "true" : undefined}
      >
        <LessonThumb v={v} active={active} done={done} locked={locked} />
        <Box flex={1} minW={0}>
          <Text
            fontSize="14px"
            lineHeight={1.35}
            fontWeight={active ? 600 : 500}
            color={active ? "var(--cc-gold-light)" : locked ? "var(--cc-text-3)" : "var(--cc-text-soft)"}
            sx={clampLines(2)}
          >
            {v.title}
          </Text>
          <HStack spacing={1.5} mt={1} fontSize="12px" color="var(--cc-text-3)" className="cc-num">
            <span>{formatMinutes(v.duration_seconds)}</span>
            {done && !locked ? (
              <>
                <span aria-hidden>·</span>
                <Box as="span" color="var(--cc-gold-light)">
                  erledigt
                </Box>
              </>
            ) : null}
          </HStack>
        </Box>
      </HStack>
    );
  };

  if (playlist.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={1}>
      {blocks.map((block, bi) => {
        if (block.kind === "videos") {
          return (
            <VStack key={`videos-${bi}`} align="stretch" spacing={1}>
              {block.items.map(({ idx, v }) => row(idx, v))}
            </VStack>
          );
        }
        return (
          <Accordion key={`sub-${block.subcategoryId}-${bi}`} allowToggle defaultIndex={0}>
            <AccordionItem border="none">
              <AccordionButton px={3} py={2.5} borderRadius="8px" _hover={{ bg: "rgba(255, 255, 255, 0.04)" }}>
                <Box flex="1" textAlign="left">
                  <Text fontSize="12px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-2)">
                    {block.title}
                  </Text>
                </Box>
                <AccordionIcon color="var(--cc-gold-light)" />
              </AccordionButton>
              <AccordionPanel px={0} pt={1} pb={1}>
                <VStack align="stretch" spacing={1}>
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
