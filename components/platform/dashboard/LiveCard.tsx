"use client";

import { Box, Button } from "@chakra-ui/react";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { CardValue, DashCard, LockedNote, Meta } from "./primitives";
import type { LiveItem } from "./types";

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

/** Gold-Punkt; läuft die Session, breitet sich ein Ring aus. */
function LiveDot({ pulsing }: { pulsing: boolean }) {
  return (
    <Box as="span" position="relative" display="inline-flex" w="8px" h="8px" flexShrink={0} aria-hidden>
      {pulsing ? (
        <Box as="span" className="cc-ping" position="absolute" inset={0} borderRadius="full" bg="var(--cc-gold)" />
      ) : null}
      <Box
        as="span"
        position="relative"
        w="8px"
        h="8px"
        borderRadius="full"
        bg="var(--cc-gold-light)"
        boxShadow="none"
      />
    </Box>
  );
}

export function LiveCard({ live, isPaid }: { live: LiveItem | null; isPaid: boolean }) {
  const stream = useFreeStream(!isPaid);

  if (stream) {
    // Gleicher Aufbau wie bei Kalender-Events: Überschrift, Zeitpunkt, Button.
    return (
      <DashCard label="Jetzt live" labelId="dash-live">
        <CardValue>{stream.title}</CardValue>
        <Meta mt={2}>
          <Box as="span" display="inline-flex" alignItems="center" gap={2}>
            <LiveDot pulsing />
            <Box as="span" color="var(--cc-text-soft)">
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
      <DashCard label="Live" labelId="dash-live">
        <LockedNote text="Live-Sessions mit Emre gehören zur Mitgliedschaft." />
      </DashCard>
    );
  }

  if (!live) {
    return (
      <DashCard label="Live" labelId="dash-live">
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
  const wann = live.state === "now" ? `läuft jetzt · seit ${live.timeLabel}` : `${live.dayLabel} · ${live.timeLabel}`;

  return (
    <DashCard
      label={label}
      labelId="dash-live"
      badge={live.eventType ? <EventBadge label={live.eventType} color={live.eventColor} /> : null}
    >
      {/* Überschrift des Events */}
      <CardValue>{live.title}</CardValue>

      {/* Wann das Event ist */}
      <Meta mt={2}>
        <Box as="span" display="inline-flex" alignItems="center" gap={2}>
          {live.state !== "upcoming" ? <LiveDot pulsing={live.state === "now"} /> : null}
          <Box as="span" color="var(--cc-text-soft)">
            {wann}
          </Box>
        </Box>
      </Meta>

      {/* Button */}
      <Box mt="auto" pt={5}>
        {live.external ? (
          // Externer Anbieter (Zoom, YouTube …): neuer Tab, kein Router-Wechsel.
          <Button as="a" href={live.href} target="_blank" rel="noopener noreferrer" variant="gold">
            Beitreten
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
