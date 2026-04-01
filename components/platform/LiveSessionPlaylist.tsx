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
import { Circle, Play } from "lucide-react";
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
        borderRadius="12px"
        borderWidth="1px"
        borderColor={active ? "rgba(100, 170, 240, 0.5)" : "rgba(255,255,255,0.08)"}
        bg={active ? "rgba(74, 144, 217, 0.12)" : "rgba(255,255,255,0.03)"}
        spacing={3}
        cursor="pointer"
        transition="border-color 0.2s, background 0.2s"
        _hover={{ borderColor: "rgba(100, 170, 240, 0.35)", bg: "rgba(255,255,255,0.05)" }}
        onClick={() => onSelect(idx)}
      >
        {v.thumbnailSignedUrl ? (
          <Box
            flexShrink={0}
            w="44px"
            h="44px"
            borderRadius="8px"
            overflow="hidden"
            borderWidth="1px"
            borderColor={active ? "rgba(100,170,240,0.5)" : "rgba(255,255,255,0.12)"}
            position="relative"
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.thumbnailSignedUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {active && (
              <Box
                position="absolute"
                inset={0}
                bg="rgba(0,0,0,0.35)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="rgba(147, 197, 253, 0.95)"
              >
                <Play size={14} strokeWidth={2} />
              </Box>
            )}
          </Box>
        ) : (
          <Box
            color={active ? "rgba(147, 197, 253, 0.95)" : "rgba(240,240,242,0.5)"}
            flexShrink={0}
            aria-hidden
          >
            {active ? <Play size={18} strokeWidth={2} /> : <Circle size={18} strokeWidth={1.5} />}
          </Box>
        )}
        <Box flex={1} minW={0}>
          <Text
            className="inter-medium"
            fontSize="sm"
            color="var(--color-text-primary)"
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
    return (
      <Text className="inter" fontSize="sm" color="var(--color-text-muted)">
        Noch keine Aufzeichnung hinterlegt.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Text
        className="inter"
        fontSize="xs"
        textTransform="uppercase"
        letterSpacing="0.08em"
        color="var(--color-text-muted)"
      >
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
                <AccordionIcon color="rgba(147, 197, 253, 0.85)" />
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
