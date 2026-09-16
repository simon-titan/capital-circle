"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Box, Button, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import { Calendar, Radio } from "lucide-react";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { LockedNote, clampLines } from "@/components/platform/dashboard/primitives";
import type { LiveSessionCategoryRow, LiveSessionListItem } from "@/lib/server-data";

const FREE_CATEGORY = "weekly outlook";

function isFreeAccessible(s: LiveSessionListItem): boolean {
  return s.category.title.toLowerCase().includes(FREE_CATEGORY);
}

/** Gestaffelter Einstieg (80ms + 70ms je Schritt), gedeckelt, damit lange Listen nicht nachhinken. */
function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

/** Aktiver Filter wie der aktive Nav-Punkt: Gold-Haarlinie, Gold-Verlauf, Text in Gold hell. */
const CHIP_ACTIVE = {
  color: "var(--cc-gold-light)",
  bg: "linear-gradient(90deg, rgba(212, 176, 128, 0.16) 0%, rgba(212, 176, 128, 0.04) 100%)",
  borderColor: "var(--cc-gold-line)",
  boxShadow: "0 0 16px rgba(212, 176, 128, 0.1)",
};

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      size="sm"
      variant="line"
      aria-pressed={active}
      onClick={onClick}
      {...(active ? { ...CHIP_ACTIVE, _hover: CHIP_ACTIVE } : null)}
    >
      {children}
    </Button>
  );
}

function SessionCard({ s, locked }: { s: LiveSessionListItem; locked: boolean }) {
  const primaryIso = s.event?.start_time ?? s.recorded_at;
  const caption = s.event ? "Live-Termin" : "Aufzeichnung";

  return (
    <Flex as="article" direction="column" className="cc-card" h="100%" minW={0}>
      <Box
        position="relative"
        w="100%"
        aspectRatio="16 / 9"
        borderTopRadius="11px"
        borderBottom="1px solid var(--cc-line)"
        overflow="hidden"
        bg="radial-gradient(ellipse 70% 65% at 50% 38%, rgba(212, 176, 128, 0.14), transparent 72%), var(--cc-surface-2)"
        opacity={locked ? 0.55 : 1}
      >
        {s.thumbnailSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.thumbnailSignedUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <Flex align="center" justify="center" h="100%" color="var(--cc-text-3)">
            <Radio size={36} strokeWidth={1.5} aria-hidden />
          </Flex>
        )}
        <Box
          position="absolute"
          top={3}
          left={3}
          maxW="calc(100% - 24px)"
          px={2.5}
          py={1}
          borderRadius="full"
          bg="rgba(18, 23, 28, 0.78)"
          border="1px solid var(--cc-line-strong)"
          backdropFilter="blur(8px)"
          fontSize="12px"
          lineHeight="16px"
          fontWeight={500}
          color="var(--cc-text-soft)"
          isTruncated
        >
          {s.category.title}
        </Box>
      </Box>

      <Stack spacing={3} p={{ base: 5, md: 6 }} flex="1">
        <Text
          as="h2"
          fontSize={{ base: "17px", md: "18px" }}
          fontWeight={600}
          lineHeight={1.3}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
          sx={clampLines(2)}
        >
          {s.title}
        </Text>
        {s.description ? (
          <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)" sx={clampLines(2)}>
            {s.description}
          </Text>
        ) : null}
        {primaryIso ? (
          <Flex align="center" gap={2} wrap="wrap" fontSize="14px" lineHeight={1.5}>
            <Box as="span" color="var(--cc-text-2)" display="inline-flex">
              <Calendar size={15} strokeWidth={1.75} aria-hidden />
            </Box>
            <Text as="span" color="var(--cc-text-2)">
              {caption}
            </Text>
            <Text as="span" color="var(--cc-text-3)" aria-hidden>
              ·
            </Text>
            <Text as="span" className="cc-num" color="var(--cc-text-soft)">
              {new Date(primaryIso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
            </Text>
          </Flex>
        ) : null}
        {s.event ? (
          <Box pt={3} borderTop="1px solid var(--cc-line)">
            <Text fontSize="12px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-3)" mb={1}>
              Kalender-Event
            </Text>
            <Text fontSize="14px" lineHeight={1.45} color="var(--cc-text-soft)" sx={clampLines(3)}>
              {s.event.title}
            </Text>
          </Box>
        ) : null}
        <Box mt="auto" pt={2}>
          {locked ? (
            <LockedNote text="Live Sessions sind exklusiv für vollwertige Capital Circle Mitglieder — Weekly Outlook ist kostenlos verfügbar." />
          ) : (
            <ChakraLinkButton href={`/live-session/${s.id}`} size="sm" w="full" variant="line">
              Ansehen
            </ChakraLinkButton>
          )}
        </Box>
      </Stack>
    </Flex>
  );
}

type Props = {
  categories: LiveSessionCategoryRow[];
  sessions: LiveSessionListItem[];
  isFreeMember?: boolean;
};

export function LiveSessionGrid({ categories, sessions, isFreeMember }: Props) {
  const [filterId, setFilterId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!filterId) return sessions;
    return sessions.filter((s) => s.category.id === filterId);
  }, [sessions, filterId]);

  return (
    <Stack spacing={6}>
      <Flex gap={2} wrap="wrap" align="center" className="cc-rise" style={riseDelay(0)}>
        <FilterChip active={filterId === null} onClick={() => setFilterId(null)}>
          Alle
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c.id} active={filterId === c.id} onClick={() => setFilterId(c.id)}>
            {c.title}
          </FilterChip>
        ))}
      </Flex>

      {filtered.length === 0 ? (
        <Box className="cc-card cc-card--still cc-rise" style={riseDelay(1)} p={{ base: 5, md: 6 }}>
          <Text fontSize="15px" lineHeight={1.5} color="var(--cc-text-2)">
            Keine Sessions in dieser Kategorie.
          </Text>
        </Box>
      ) : (
        <Grid
          templateColumns={{ base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }}
          gap={5}
        >
          {filtered.map((s, i) => (
            <Box key={s.id} className="cc-rise" style={riseDelay(i + 1)} minW={0} h="100%">
              <SessionCard s={s} locked={!!isFreeMember && !isFreeAccessible(s)} />
            </Box>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
