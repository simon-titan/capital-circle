"use client";

import { useMemo, useState } from "react";
import { Box, Flex, Grid, HStack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { CalendarDays, Clock, Film, Radio } from "lucide-react";
import { clampLines } from "@/components/platform/dashboard/primitives";
import {
  KartenAktion,
  Pill,
  formatSessionDate,
  formatSessionDuration,
  riseDelay,
} from "@/components/platform/live-session-ui";
import type { LiveSessionWithCounts } from "@/lib/live-session-overview";

/**
 * Die Aufzeichnungen einer Kategorie als Kacheln — dieselbe Form wie die
 * Modulkacheln im Institut (`InstitutAccordion.tsx`): Vorschau, Titel,
 * Kennzahlen, Gold-Aktion, die ganze Kachel ist der Link. Ein Klick führt in
 * die Detailansicht mit Player und Playlist.
 *
 * Einen Fortschrittsbalken gibt es hier bewusst nicht: Für Live-Session-Videos
 * wird kein Fortschritt gespeichert, ein Balken stünde also immer auf null.
 */
function SessionKachel({ s, mitCoverSpur }: { s: LiveSessionWithCounts; mitCoverSpur: boolean }) {
  /**
   * Ein Thumbnail-Key kann auf eine Datei zeigen, die es nicht (mehr) gibt —
   * die alten Bilder lagen auf dem verschwundenen Hetzner-Bucket. Statt einen
   * kaputten Bildrahmen zu zeigen, fällt die Kachel auf die Vorschau ohne Bild
   * zurück.
   */
  const [coverKaputt, setCoverKaputt] = useState(false);
  const coverUrl = !coverKaputt ? s.thumbnailSignedUrl : null;

  const terminIso = s.event?.start_time ?? s.recorded_at;
  const terminWort = s.event ? "Live am" : "Aufgezeichnet";

  /**
   * Eine Session ohne Videos ist noch nicht fertig: Sie wird gezeigt, aber
   * nicht verlinkt — der Klick führte sonst auf eine Detailseite, die nur
   * „Noch keine Aufzeichnung hinterlegt“ sagt.
   */
  const leer = s.videoCount === 0;

  const inhalt = (
    <Flex
      as="article"
      direction="column"
      h="100%"
      /**
       * Die Höhe richtet sich danach, ob im Raster überhaupt Vorschaubilder
       * vorkommen — sonst stünden Kacheln mit und ohne Bild unterschiedlich
       * hoch nebeneinander.
       */
      minH={{ base: "auto", md: mitCoverSpur ? "380px" : "220px" }}
      borderRadius="10px"
      bg="rgba(255, 255, 255, 0.03)"
      border="1px solid var(--cc-line)"
      opacity={leer ? 0.75 : 1}
      overflow="hidden"
      transition="background-color 180ms var(--cc-ease), border-color 180ms var(--cc-ease)"
      _hover={leer ? undefined : { bg: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.24)" }}
    >
      {mitCoverSpur ? (
        <Box
          flexShrink={0}
          position="relative"
          w="100%"
          aspectRatio="16 / 9"
          // Deckel gegen die feste Kachelhöhe: In breiten Spalten wäre 16:9
          // sonst höher als der Platz für Titel, Kennzahlen und Knopf.
          maxH="240px"
          overflow="hidden"
          borderBottom="1px solid var(--cc-line)"
          bg="radial-gradient(ellipse 70% 65% at 50% 38%, rgba(212, 176, 128, 0.14), transparent 72%), var(--cc-surface-2)"
        >
          {coverUrl ? (
            // Kein next/image: Die signierte R2-URL ist kein in next.config.ts
            // erlaubter Remote-Host, und ein Signatur-Token macht den
            // Optimizer-Cache ohnehin wertlos.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              onError={() => setCoverKaputt(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Flex align="center" justify="center" h="100%" color="var(--cc-text-3)">
              <Radio size={32} strokeWidth={1.5} aria-hidden />
            </Flex>
          )}
        </Box>
      ) : null}

      <Box flexShrink={0} py={3} px={{ base: 3, md: 4 }}>
        <Text as="h3" fontSize="15px" fontWeight={600} lineHeight={1.35} color="var(--cc-text)" sx={clampLines(2)}>
          {s.title}
        </Text>

        <HStack spacing={2} flexWrap="wrap" rowGap={2} mt={2.5}>
          {leer ? (
            <Pill tone="muted" upper>
              Noch kein Video
            </Pill>
          ) : (
            <>
              <Pill tone="neutral" icon={<Film size={12} aria-hidden />}>
                {s.videoCount} {s.videoCount === 1 ? "Video" : "Videos"}
              </Pill>
              <Pill tone="neutral" icon={<Clock size={12} aria-hidden />} className="cc-num">
                {formatSessionDuration(s.totalDurationSeconds)}
              </Pill>
            </>
          )}
          {terminIso ? (
            <Pill tone="neutral" icon={<CalendarDays size={12} aria-hidden />} className="cc-num">
              {terminWort} {formatSessionDate(terminIso)}
            </Pill>
          ) : null}
        </HStack>
      </Box>

      {/* Beschreibung nur ohne Vorschaubild — mit Bild trägt die Kachel schon genug. */}
      <Box flex="1" minH={0} px={{ base: 3, md: 4 }} pb={1}>
        {!mitCoverSpur && s.description ? (
          <Text fontSize="13px" lineHeight={1.55} color="var(--cc-text-2)" sx={clampLines(3)}>
            {s.description}
          </Text>
        ) : null}
      </Box>

      {leer ? null : (
        <Box flexShrink={0} mx={{ base: 3, md: 4 }} my={3}>
          <KartenAktion>Session ansehen</KartenAktion>
        </Box>
      )}
    </Flex>
  );

  if (leer) return <Box h="100%">{inhalt}</Box>;

  return (
    <Link href={`/live-session/${s.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      {inhalt}
    </Link>
  );
}

export function LiveSessionTiles({ sessions }: { sessions: LiveSessionWithCounts[] }) {
  /** Hat irgendeine Session ein Vorschaubild? Dann bekommen alle Kacheln die Bildspur. */
  const mitCoverSpur = useMemo(() => sessions.some((s) => Boolean(s.thumbnailSignedUrl)), [sessions]);

  return (
    <Grid
      templateColumns={{ base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }}
      gap={{ base: 4, md: 5 }}
      alignItems="stretch"
    >
      {sessions.map((s, i) => (
        <Box key={s.id} className="cc-rise" style={riseDelay(i)} minW={0}>
          <SessionKachel s={s} mitCoverSpur={mitCoverSpur} />
        </Box>
      ))}
    </Grid>
  );
}
