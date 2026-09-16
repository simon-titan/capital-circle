"use client";

import { Box, Button, Flex, HStack, SimpleGrid, Text, Tooltip } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import NextLink from "next/link";
import { DashCard, Meta } from "./primitives";
import type { AppointmentSummary, KalenderTag } from "./types";

const WOCHENTAGE = ["M", "D", "M", "D", "F", "S", "S"] as const;

/**
 * „Nächster Termin" mit Monatsübersicht statt eines einzelnen Datums.
 *
 * Die Karte zeigte für fast alle Mitglieder nur „Keine geplant" — der einzige
 * Termin dort ist das Bewerbungsgespräch, und das gibt es nach dem Beitritt
 * nicht mehr. Der Monatskalender füllt den Platz mit etwas, das dauerhaft
 * nützlich ist: welche Tage dieses Monats belegt sind.
 */
export function AppointmentCard({
  appointment,
  kalender,
}: {
  appointment: AppointmentSummary;
  kalender: KalenderTag[];
}) {
  const naechster = kalender.find((t) => t.istZukunft && t.termine.length > 0);

  return (
    <DashCard label="Termine" labelId="dash-appointment">
      {/* Bewerbungsgespräch, solange es eines gibt — sonst der nächste Event. */}
      {appointment.state !== "none" ? (
        <Box mb={3}>
          <Text fontSize="15px" fontWeight={500} color="var(--cc-text)">
            {appointment.title}
          </Text>
          <Meta className="cc-num">
            {appointment.state === "booked"
              ? `${appointment.dayLabel} · ${appointment.timeLabel}`
              : "Noch nicht gebucht"}
          </Meta>
        </Box>
      ) : naechster ? (
        <Box mb={3}>
          <HStack spacing={2} align="center">
            <Box
              w="7px"
              h="7px"
              borderRadius="full"
              bg={naechster.termine[0].farbe}
              flexShrink={0}
              aria-hidden
            />
            <Text fontSize="15px" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
              {naechster.termine[0].titel}
            </Text>
          </HStack>
          <Meta className="cc-num">
            {naechster.tagLabel} · {naechster.termine[0].zeitLabel}
          </Meta>
        </Box>
      ) : (
        <Box mb={3}>
          <Text fontSize="15px" color="var(--cc-text-soft)">
            Diesen Monat nichts geplant
          </Text>
        </Box>
      )}

      {/* ── Monatsraster ─────────────────────────────────────────────────── */}
      <Box mt="auto">
        <SimpleGrid columns={7} spacing="2px" mb={1}>
          {WOCHENTAGE.map((w, i) => (
            <Text
              key={`${w}-${i}`}
              fontSize="10px"
              fontWeight={500}
              textAlign="center"
              color="var(--cc-text-3)"
              aria-hidden
            >
              {w}
            </Text>
          ))}
        </SimpleGrid>

        <SimpleGrid columns={7} spacing="2px">
          {kalender.map((t) =>
            t.tag === null ? (
              // Führende Leerfelder bis zum Monatsersten.
              <Box key={t.key} h="22px" />
            ) : (
              <Tooltip
                key={t.key}
                isDisabled={t.termine.length === 0}
                label={t.termine.map((e) => `${e.zeitLabel} ${e.titel}`).join("\n")}
                placement="top"
                hasArrow
                whiteSpace="pre-line"
                bg="var(--cc-panel-solid)"
                color="var(--cc-text)"
                border="1px solid var(--cc-line-strong)"
                borderRadius="8px"
                fontSize="12px"
              >
                <Flex
                  h="22px"
                  direction="column"
                  align="center"
                  justify="center"
                  borderRadius="5px"
                  position="relative"
                  bg={t.istHeute ? "rgba(255, 255, 255, 0.1)" : "transparent"}
                  border="1px solid"
                  borderColor={t.istHeute ? "rgba(255, 255, 255, 0.28)" : "transparent"}
                  cursor={t.termine.length > 0 ? "help" : "default"}
                >
                  <Text
                    className="cc-num"
                    fontSize="11px"
                    lineHeight={1}
                    fontWeight={t.istHeute ? 600 : 400}
                    color={
                      t.istHeute
                        ? "var(--cc-text)"
                        : t.termine.length > 0
                          ? "var(--cc-text)"
                          : "var(--cc-text-3)"
                    }
                  >
                    {t.tag}
                  </Text>
                  {/* Punkt je Termin, höchstens drei — mehr wäre bei 22 px Breite Matsch. */}
                  {t.termine.length > 0 ? (
                    <HStack spacing="2px" position="absolute" bottom="1px" aria-hidden>
                      {t.termine.slice(0, 3).map((e, i) => (
                        <Box key={i} w="3px" h="3px" borderRadius="full" bg={e.farbe} />
                      ))}
                    </HStack>
                  ) : null}
                </Flex>
              </Tooltip>
            ),
          )}
        </SimpleGrid>
      </Box>

      {appointment.state === "open" ? (
        <Box pt={4}>
          <Button
            as={NextLink}
            href="/bewerbung/danke"
            variant="line"
            size="sm"
            rightIcon={<ArrowRight size={16} strokeWidth={1.75} />}
          >
            Termin buchen
          </Button>
        </Box>
      ) : (
        <Box pt={3}>
          <Button as={NextLink} href="/events" variant="line" size="sm" w="100%">
            Alle Events
          </Button>
        </Box>
      )}
    </DashCard>
  );
}
