"use client";

import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { Clock, Radio } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { CardValue, DashCard, LockedNote, Meta } from "./primitives";
import type { LiveItem } from "./types";
import { zeitTon, zeitTonFarbe } from "./zeit-ton";

/** Free-Mitglieder: einmal prüfen, ob Emres Stream gerade läuft. */
function useFreeStream(enabled: boolean): { title: string } | null {
  const [stream, setStream] = useState<{ title: string } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/stream/status", { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) return;
        const json = (await res.json()) as { ok: boolean; status?: { isLive: boolean; title: string } };
        if (!cancelled && json.ok && json.status?.isLive) setStream({ title: json.status.title });
      } catch {
        // bleibt im gesperrten Zustand
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return stream;
}

/**
 * Punkt vor der Zeitangabe; läuft die Session, breitet sich ein Ring aus.
 *
 * Die Farbe kommt aus der Restzeit (siehe `zeit-ton.ts`): grün, solange es
 * läuft, Glut kurz davor, sonst Gold hell. Rot bleibt aus — es ist laut
 * DESIGN.md ausschließlich Verlust und Überfälligkeit, auch wenn das
 * Kunden-Mockup den Live-Punkt rot zeichnet.
 */
function LiveDot({ pulsing, color }: { pulsing: boolean; color: string }) {
  return (
    <Box as="span" position="relative" display="inline-flex" w="8px" h="8px" flexShrink={0} aria-hidden>
      {pulsing ? (
        <Box as="span" className="cc-ping" position="absolute" inset={0} borderRadius="full" bg={color} />
      ) : null}
      <Box as="span" position="relative" w="8px" h="8px" borderRadius="full" bg={color} boxShadow="none" />
    </Box>
  );
}

const liveIcon = <Radio size={17} strokeWidth={1.5} />;

export function LiveCard({ live, isPaid }: { live: LiveItem | null; isPaid: boolean }) {
  const stream = useFreeStream(!isPaid);

  if (stream) {
    // Gleicher Aufbau wie bei Kalender-Events: Überschrift, Zeitpunkt, Button.
    return (
      <DashCard label="Jetzt live" labelId="dash-live" icon={liveIcon}>
        <CardValue>{stream.title}</CardValue>
        <Meta mt={2}>
          <Box as="span" display="inline-flex" alignItems="center" gap={2}>
            {/* Der Stream läuft per Definition — also derselbe grüne Ton wie bei Kalender-Events. */}
            <LiveDot pulsing color={zeitTonFarbe("live", "var(--cc-gold-light)")} />
            <Box as="span" color={zeitTonFarbe("live", "var(--cc-text-soft)")}>
              läuft jetzt
            </Box>
          </Box>
        </Meta>
        <Box mt="auto" pt={5}>
          <Button as={NextLink} href="/stream" variant="gold">
            Stream beitreten
          </Button>
        </Box>
      </DashCard>
    );
  }

  if (!isPaid) {
    return (
      <DashCard label="Live" labelId="dash-live" icon={liveIcon}>
        <LockedNote text="Live-Sessions mit Emre gehören zur Mitgliedschaft." />
      </DashCard>
    );
  }

  if (!live) {
    return (
      <DashCard label="Live" labelId="dash-live" icon={liveIcon}>
        <CardValue>Kein Termin geplant</CardValue>
        <Meta mt={1}>Neue Live-Sessions erscheinen hier.</Meta>
        <Box mt="auto" pt={5}>
          <Button as={NextLink} href="/events" variant="line">
            Alle Events
          </Button>
        </Box>
      </DashCard>
    );
  }

  const label = live.state === "now" ? "Jetzt live" : live.state === "today" ? "Heute live" : "Nächstes Live";
  const ton = zeitTon(live);
  // Der Countdown ersetzt die Tagesangabe, solange er aussagekräftig ist —
  // „In 28 Minuten“ sagt mehr als „Heute“, wenn es gleich losgeht. Dieselbe
  // Schwelle färbt die Zeile warm, Wortlaut und Ton springen gemeinsam.
  const status =
    ton === "live"
      ? "läuft jetzt"
      : ton === "bald" && live.minutesUntilStart != null
        ? minutenLabel(live.minutesUntilStart)
        : live.dayLabel;
  // Ohne Dringlichkeit („Fr, 19. Sep“) trägt der Punkt nichts bei und bleibt weg.
  const zeigePunkt = live.state !== "upcoming" || ton !== "ruhig";

  return (
    <DashCard
      label={label}
      labelId="dash-live"
      icon={liveIcon}
      badge={live.eventType ? <EventBadge label={live.eventType} color={live.eventColor} /> : null}
    >
      <Flex align="center" gap={2} mb={3}>
        {zeigePunkt ? <LiveDot pulsing={ton === "live"} color={zeitTonFarbe(ton, "var(--cc-gold-light)")} /> : null}
        <Text fontSize="14px" fontWeight={500} color={zeitTonFarbe(ton, "var(--cc-text-soft)")}>
          {status}
        </Text>
      </Flex>

      <CardValue>{live.title}</CardValue>

      <Meta mt={2}>
        <Box as="span" display="inline-flex" alignItems="center" gap={2}>
          <Box as="span" display="inline-flex" color="var(--cc-text-3)" aria-hidden>
            <Clock size={14} strokeWidth={1.75} />
          </Box>
          <Box as="span" className="cc-num">
            {live.dayLabel}, {live.timeRangeLabel}
          </Box>
        </Box>
      </Meta>

      <Box mt="auto" pt={5}>
        {live.external ? (
          // Externer Anbieter (Zoom, YouTube …): neuer Tab, kein Router-Wechsel.
          <Button as="a" href={live.href} target="_blank" rel="noopener noreferrer" variant="gold">
            Jetzt beitreten
          </Button>
        ) : (
          <Button as={NextLink} href="/events" variant="line">
            Details
          </Button>
        )}
      </Box>
    </DashCard>
  );
}

/**
 * „In 28 Minuten“ / „In 2 Stunden“ — Vokabular wie im Rest der Plattform.
 * Weiter als die Glut-Schwelle (`zeit-ton.ts`) weg fragt der Aufrufer gar nicht
 * erst an, dort steht der Tag.
 */
function minutenLabel(minuten: number): string {
  if (minuten <= 1) return "Gleich";
  if (minuten < 60) return `In ${minuten} Minuten`;
  const stunden = Math.round(minuten / 60);
  return stunden === 1 ? "In einer Stunde" : `In ${stunden} Stunden`;
}

/** Art des Events, oben rechts in der Karte — in der im Admin gewählten Farbe. */
function EventBadge({ label, color }: { label: string; color: string }) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      px={2.5}
      py={1}
      borderRadius="full"
      fontSize="11px"
      fontWeight={600}
      letterSpacing="0.06em"
      textTransform="uppercase"
      whiteSpace="nowrap"
      // Farbe trägt nur Kontur, Punkt und Schrift — eine volle Fläche würde
      // neben dem Gold der Karte um Aufmerksamkeit konkurrieren.
      color={color}
      borderWidth="1px"
      borderStyle="solid"
      borderColor={color}
      bg="rgba(255, 255, 255, 0.03)"
    >
      <Box as="span" w="6px" h="6px" borderRadius="full" bg={color} flexShrink={0} aria-hidden />
      {label}
    </Box>
  );
}
