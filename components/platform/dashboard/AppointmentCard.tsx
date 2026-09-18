"use client";

import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { ArrowRight, CalendarClock } from "lucide-react";
import NextLink from "next/link";
import { CardLink, DashCard, Meta } from "./primitives";
import type { AppointmentSummary, TerminZeile } from "./types";
import { zeitTon, zeitTonFarbe } from "./zeit-ton";

const terminIcon = <CalendarClock size={17} strokeWidth={1.5} />;

/**
 * „Nächste Termine“ als Liste (Kunden-Mockup 09/2026).
 *
 * Bis dahin stand hier ein Monatsraster. Das zeigte zwar, welche Tage belegt
 * sind, aber nicht, was ansteht — dafür musste man jede Zelle antippen. Vier
 * Zeilen „Tag · Titel · Uhrzeit“ beantworten dieselbe Frage direkt.
 */
export function AppointmentCard({
  appointment,
  termine,
}: {
  appointment: AppointmentSummary;
  termine: TerminZeile[];
}) {
  return (
    <DashCard
      label="Nächste Termine"
      labelId="dash-appointment"
      icon={terminIcon}
      badge={<CardLink href="/events">Alle Termine</CardLink>}
    >
      {/* Das Bewerbungsgespräch ist ein persönlicher Termin und steht nicht im
          Event-Kalender — deshalb vor der Liste, solange es eines gibt. */}
      {appointment.state !== "none" ? (
        <Box mb={4} pb={4} borderBottom="1px solid var(--cc-line)">
          <Text fontSize="15px" fontWeight={500} color="var(--cc-text)">
            {appointment.title}
          </Text>
          <Meta className="cc-num">
            {appointment.state === "booked"
              ? `${appointment.dayLabel} · ${appointment.timeLabel}`
              : "Noch nicht gebucht"}
          </Meta>
          {appointment.state === "open" ? (
            <Button
              as={NextLink}
              href="/bewerbung/danke"
              variant="line"
              size="sm"
              mt={3}
              rightIcon={<ArrowRight size={16} strokeWidth={1.75} />}
            >
              Termin buchen
            </Button>
          ) : null}
        </Box>
      ) : null}

      {termine.length === 0 ? (
        <Meta>Aktuell nichts geplant.</Meta>
      ) : (
        <Box as="ul" listStyleType="none">
          {termine.map((t, i) => {
            /*
             * Dieselbe Zeitfarbe wie in „Heute live“ — läuft grün, gleich in
             * Glut, sonst ruhig. „Ruhig“ heißt hier: der Punkt behält die im
             * Admin gewählte Event-Farbe, der Tag bleibt Text bzw. Text 2. Die
             * Übermalung ist bewusst nur vorübergehend; sobald der Termin
             * vorbei ist, fällt die Zeile aus der Liste.
             */
            const ton = zeitTon(t);
            return (
              <Grid
                as="li"
                key={t.id}
                templateColumns={{ base: "minmax(0, 1fr)", sm: "110px minmax(0, 1fr) auto" }}
                gap={{ base: 1, sm: 4 }}
                alignItems="baseline"
                py={3}
                borderTop={i === 0 ? "none" : "1px solid var(--cc-line)"}
              >
                <Flex align="center" gap={2} minW={0}>
                  <Box
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg={zeitTonFarbe(ton, t.farbe)}
                    flexShrink={0}
                    aria-hidden
                  />
                  <Text
                    fontSize="14px"
                    className="cc-num"
                    color={zeitTonFarbe(ton, t.istHeute ? "var(--cc-text)" : "var(--cc-text-2)")}
                    fontWeight={t.istHeute || ton !== "ruhig" ? 600 : 400}
                    whiteSpace="nowrap"
                  >
                    {t.dayLabel}
                  </Text>
                </Flex>
                <Text fontSize="15px" color="var(--cc-text)" noOfLines={1} minW={0}>
                  {t.title}
                </Text>
                <Text
                  fontSize="14px"
                  className="cc-num"
                  color="var(--cc-text-2)"
                  whiteSpace="nowrap"
                  textAlign={{ base: "left", sm: "right" }}
                >
                  {t.timeLabel}
                </Text>
              </Grid>
            );
          })}
        </Box>
      )}
    </DashCard>
  );
}
