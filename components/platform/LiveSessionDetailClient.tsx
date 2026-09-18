"use client";

import { useCallback, useState } from "react";
import { Box, Button, Flex, Grid, GridItem, Heading, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import NextLink from "next/link";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { VideoDescription } from "@/components/platform/VideoDescription";
import { LiveSessionPlaylist } from "@/components/platform/LiveSessionPlaylist";
import { clampLines } from "@/components/platform/dashboard/primitives";
import type { LiveSessionVideoRow } from "@/lib/server-data";

/** Kopfdaten der Session; Datum wird auf dem Server formatiert (Zeitzone, kein Hydration-Versatz). */
export type LiveSessionDetailInfo = {
  title: string;
  categoryTitle: string;
  /** Ziel des Zurueck-Links — ohne sie laege der Weg zurueck eine Ebene zu hoch. */
  categoryId: string;
  description: string | null;
  /** z. B. „Live am: …“ oder „Aufzeichnung: …“ */
  dateLine: string | null;
  eventTitle: string | null;
};

export type LiveSessionDetailClientProps = {
  playlist: LiveSessionVideoRow[];
  session?: LiveSessionDetailInfo;
};

const sectionLabel = {
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--cc-text-2)",
};

function BackLink({ categoryId, categoryTitle }: { categoryId?: string; categoryTitle?: string }) {
  // Zurueck heisst: eine Ebene hoeher, nicht ganz an den Anfang. Wer eine
  // Aufzeichnung aus „Backtesting" geoeffnet hat, will dorthin zurueck und
  // nicht zur Kategorieauswahl — dieselbe Regel wie im Institut.
  return (
    <Button
      as={NextLink}
      href={categoryId ? `/live-session/kategorie/${categoryId}` : "/live-session"}
      variant="ghost"
      size="sm"
      h="auto"
      px={0}
      leftIcon={<ArrowLeft size={15} strokeWidth={2} />}
      color="var(--cc-text-2)"
      fontWeight={500}
      _hover={{ color: "var(--cc-gold-light)", bg: "transparent" }}
    >
      {categoryTitle ? `Zurück zu ${categoryTitle}` : "Zurück zur Übersicht"}
    </Button>
  );
}

/** Kategorie, Titel, Datum und verknüpftes Kalender-Event. */
function SessionHead({ session, compact = false }: { session: LiveSessionDetailInfo; compact?: boolean }) {
  return (
    <Box>
      <Text {...sectionLabel}>{session.categoryTitle} · Live Session</Text>
      <Heading
        as="h1"
        fontSize={compact ? "20px" : { base: "22px", md: "26px" }}
        fontWeight={600}
        lineHeight={1.3}
        letterSpacing="-0.01em"
        color="var(--cc-text)"
        mt={2}
        sx={compact ? clampLines(3) : undefined}
      >
        {session.title}
      </Heading>
      {session.dateLine ? (
        <Text className="cc-num" fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)" mt={2}>
          {session.dateLine}
        </Text>
      ) : null}
      {session.eventTitle ? (
        <Flex
          mt={4}
          gap={2.5}
          align="flex-start"
          px={3}
          py={2.5}
          borderRadius="10px"
          border="1px solid var(--cc-line)"
          bg="rgba(255, 255, 255, 0.03)"
        >
          <Box color="var(--cc-gold-light)" mt="2px" flexShrink={0}>
            <CalendarDays size={15} strokeWidth={1.75} aria-hidden />
          </Box>
          <Box minW={0}>
            <Text fontSize="11px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-3)">
              Kalender-Event
            </Text>
            <Text fontSize="14px" lineHeight={1.45} color="var(--cc-text-soft)" mt={0.5} overflowWrap="break-word">
              {session.eventTitle}
            </Text>
          </Box>
        </Flex>
      ) : null}
    </Box>
  );
}

function SessionDescription({ text }: { text: string }) {
  return (
    <Text fontSize="15px" color="var(--cc-text-soft)" lineHeight={1.7} whiteSpace="pre-wrap" maxW="75ch">
      {text}
    </Text>
  );
}

/** Live-Session wie die Lernseite: Player rechts, Kopf und Playlist in der klebenden Seitenleiste. */
export function LiveSessionDetailClient({ playlist, session }: LiveSessionDetailClientProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = playlist[activeIndex] ?? null;

  const onSelectVideo = useCallback(
    (idx: number) => {
      if (idx === activeIndex || idx < 0 || idx >= playlist.length) return;
      setActiveIndex(idx);
    },
    [activeIndex, playlist.length],
  );

  const sessionDescription = session?.description?.trim() || null;

  if (!playlist.length) {
    return (
      <Stack spacing={5}>
        <Box className="cc-rise">
          <BackLink categoryId={session?.categoryId} categoryTitle={session?.categoryTitle} />
          {session ? (
            <Box mt={4}>
              <SessionHead session={session} />
            </Box>
          ) : null}
        </Box>
        <Stack spacing={4} className="cc-card cc-card--still cc-rise" style={{ animationDelay: "150ms" }} p={{ base: 5, md: 6 }}>
          {sessionDescription ? <SessionDescription text={sessionDescription} /> : null}
          <Text fontSize="14px" color="var(--cc-text-2)">
            Noch keine Aufzeichnung hinterlegt.
          </Text>
        </Stack>
      </Stack>
    );
  }

  const videoDescription = current?.description?.trim() || null;

  return (
    <Box data-learning-wide>
      {/* Mobil: Kopf über dem Player — die Playlist folgt darunter. */}
      <Box display={{ base: "block", lg: "none" }} mb={5} className="cc-rise">
        <BackLink categoryId={session?.categoryId} categoryTitle={session?.categoryTitle} />
        {session ? (
          <Box mt={4}>
            <SessionHead session={session} />
          </Box>
        ) : null}
      </Box>

      <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "340px minmax(0, 1fr)" }} gap={{ base: 5, lg: 6 }} alignItems="start">
        {/* Seitenleiste: Kopf und Inhalt — klebt und scrollt für sich. */}
        <GridItem
          order={{ base: 2, lg: 1 }}
          minW={0}
          position={{ lg: "sticky" }}
          top={{ lg: "calc(var(--cc-strip-h) + 24px)" }}
          className="cc-rise"
          style={{ animationDelay: "150ms" }}
        >
          <Flex className="cc-card cc-card--still" direction="column" maxH={{ lg: "calc(100dvh - var(--cc-strip-h) - 48px)" }}>
            <Box px={5} pt={5} pb={4} flexShrink={0}>
              <Box display={{ base: "none", lg: "block" }} mb={5}>
                <BackLink categoryId={session?.categoryId} categoryTitle={session?.categoryTitle} />
                {session ? (
                  <Box mt={4}>
                    <SessionHead session={session} compact />
                  </Box>
                ) : null}
              </Box>
              <Flex align="center" justify="space-between" gap={3}>
                <Text {...sectionLabel}>Inhalt</Text>
                <Box
                  as="span"
                  className="cc-num"
                  minW="22px"
                  h="22px"
                  px="6px"
                  borderRadius="6px"
                  bg="rgba(255, 255, 255, 0.06)"
                  color="var(--cc-text-2)"
                  fontSize="11px"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {playlist.length}
                </Box>
              </Flex>
            </Box>

            <Box
              px={2}
              pt={2}
              pb={3}
              borderTop="1px solid var(--cc-line)"
              overflowY="auto"
              flex="1"
              minH={0}
              maxH={{ base: "420px", lg: "none" }}
            >
              <LiveSessionPlaylist playlist={playlist} activeIndex={activeIndex} onSelect={onSelectVideo} />
            </Box>
          </Flex>
        </GridItem>

        {/* Player und Beschreibung */}
        <GridItem order={{ base: 1, lg: 2 }} minW={0} className="cc-rise" style={{ animationDelay: "80ms" }}>
          <Stack spacing={5}>
            {current ? (
              <GlassVideoPlayer
                key={current.id}
                accent="#d4b080"
                accentRgb="212, 176, 128"
                storageKey={current.storage_key}
                presignApiPath="/api/live-session-video-url"
                startAtSeconds={0}
              />
            ) : null}
            {sessionDescription || videoDescription ? (
              <Stack spacing={5} className="cc-card cc-card--still" p={{ base: 5, md: 6 }}>
                {sessionDescription ? <SessionDescription text={sessionDescription} /> : null}
                {sessionDescription && videoDescription ? <Box h="1px" bg="var(--cc-line)" aria-hidden /> : null}
                <VideoDescription description={videoDescription} />
              </Stack>
            ) : null}
          </Stack>
        </GridItem>
      </Grid>
    </Box>
  );
}
