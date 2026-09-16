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
import { Play } from "lucide-react";
import { clampLines } from "@/components/platform/dashboard/primitives";
import type { LiveSessionVideoRow } from "@/lib/server-data";

function formatDur(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type LiveSessionPlaylistProps = {
  playlist: LiveSessionVideoRow[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

/** Vorschaubild wie in der Kursleiste der Lernseite: aktives Video mit Gold-Play. */
function Thumb({ v, active }: { v: LiveSessionVideoRow; active: boolean }) {
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
      {v.thumbnailSignedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.thumbnailSignedUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : null}
      {active ? (
        <Box position="absolute" inset={0} bg="rgba(0, 0, 0, 0.35)" display="flex" alignItems="center" justifyContent="center">
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
      ) : !v.thumbnailSignedUrl ? (
        <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" color="var(--cc-text-3)">
          <Play size={14} strokeWidth={2} />
        </Box>
      ) : null}
    </Box>
  );
}

export function LiveSessionPlaylist({ playlist, activeIndex, onSelect }: LiveSessionPlaylistProps) {
  const groups = useMemo(() => {
    const direct: { idx: number; v: LiveSessionVideoRow }[] = [];
    const subs = new Map<string, { title: string; items: { idx: number; v: LiveSessionVideoRow }[] }>();
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

  const row = (idx: number, v: LiveSessionVideoRow) => {
    const active = idx === activeIndex;

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
        cursor="pointer"
        transition="background-color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)"
        _hover={active ? {} : { bg: "rgba(255, 255, 255, 0.04)" }}
        onClick={() => onSelect(idx)}
        aria-current={active ? "true" : undefined}
      >
        <Thumb v={v} active={active} />
        <Box flex={1} minW={0}>
          <Text
            fontSize="14px"
            lineHeight={1.35}
            fontWeight={active ? 600 : 500}
            color={active ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
            sx={clampLines(2)}
          >
            {v.title}
          </Text>
          <Text className="cc-num" fontSize="12px" color="var(--cc-text-3)" mt={1}>
            {formatDur(v.duration_seconds)}
          </Text>
        </Box>
      </HStack>
    );
  };

  if (playlist.length === 0) {
    return (
      <Text fontSize="14px" color="var(--cc-text-2)">
        Noch keine Aufzeichnung hinterlegt.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={1}>
      {groups.direct.length > 0 ? (
        <VStack align="stretch" spacing={1}>
          {groups.direct.map(({ idx, v }) => row(idx, v))}
        </VStack>
      ) : null}
      {groups.subs.length > 0 ? (
        <Accordion allowMultiple defaultIndex={groups.subs.map((_, i) => i)}>
          {groups.subs.map((g, i) => (
            <AccordionItem key={i} border="none">
              <AccordionButton px={3} py={2.5} borderRadius="8px" _hover={{ bg: "rgba(255, 255, 255, 0.04)" }}>
                <Box flex="1" textAlign="left">
                  <Text fontSize="12px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-2)">
                    {g.title}
                  </Text>
                </Box>
                <AccordionIcon color="var(--cc-gold-light)" />
              </AccordionButton>
              <AccordionPanel px={0} pt={1} pb={1}>
                <VStack align="stretch" spacing={1}>
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
