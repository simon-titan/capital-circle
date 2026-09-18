"use client";

import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { BarChart3, BookOpen, FileText, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { vergleich } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { Sektion, SektionsKopf } from "./membership-ui";

const ICONS: Record<string, LucideIcon> = {
  ziel: Target,
  lernen: BookOpen,
  anwendung: BarChart3,
  review: FileText,
  ergebnis: TrendingUp,
};

/**
 * Der Vergleich.
 *
 * ── Zwei Darstellungen, eine Quelle ────────────────────────────────────────
 * Ab `lg` eine echte `<table>`: Fünf Kriterien über drei Ansätze sind
 * tabellarische Daten, und ein Screenreader soll sie auch so vorgelesen
 * bekommen („Review, Capital Circle, Journal, Aufgaben & Feedback"). Darunter
 * wird daraus eine Karte pro Kriterium — eine waagerecht scrollende Tabelle auf
 * dem Handy liest niemand, und ausgerechnet die eigene Spalte wäre die, die aus
 * dem Bild fällt.
 *
 * Beide Formen lesen dieselbe Liste aus `config/landing-membership.ts`. Zwei
 * gepflegte Kopien wären zwei Wahrheiten.
 *
 * Die eigene Spalte trägt Gold-Kante und Gold-Schein. Das ist die einzige
 * Hervorhebung im Abschnitt — die anderen beiden Spalten werden nicht
 * abgewertet, sie stehen nur ruhig daneben.
 *
 * ── Kein `id="ablauf"` mehr ────────────────────────────────────────────────
 * Die Sprungmarke wohnt seit 09/2026 in `ProzessSection`, wohin sie gehört.
 * Dieser Abschnitt braucht keinen eigenen Nav-Punkt.
 */
export function VergleichSection() {
  return (
    <Sektion aria-labelledby="vergleich-titel">
      <SektionsKopf
        eyebrow={vergleich.eyebrow}
        headline={vergleich.headline}
        id="vergleich-titel"
        sublines={[vergleich.subline]}
        merksatz={vergleich.merksatz}
        lichtstriche
        maxW="760px"
      />

      {/* ── Ab lg: Tabelle ─────────────────────────────────────────────── */}
      <Reveal delay={60}>
        <Box
          display={{ base: "none", lg: "block" }}
          mt={12}
          className="cc-card cc-card--still"
          p={0}
          overflow="hidden"
          position="relative"
        >
          <Box
            as="table"
            w="100%"
            sx={{
              borderCollapse: "collapse",
              // Die eigene Spalte durchgehend getönt — eine Fläche statt fünf
              // einzeln gefärbter Zellen, damit die Kante nicht ausfranst.
              "& td:nth-of-type(1), & thead th:nth-of-type(2)": {
                background: "linear-gradient(180deg, rgba(212, 176, 128, 0.08), rgba(212, 176, 128, 0.03))",
                borderLeft: "1px solid rgba(212, 176, 128, 0.45)",
                borderRight: "1px solid rgba(212, 176, 128, 0.45)",
              },
              "& thead th:nth-of-type(2)": { borderTop: "1px solid rgba(212, 176, 128, 0.45)" },
              "& tbody tr:last-of-type td:nth-of-type(1)": { borderBottom: "1px solid rgba(212, 176, 128, 0.45)" },
            }}
          >
            <Box as="thead">
              <Box as="tr">
                <Box as="th" w="22%" p={0} />
                {vergleich.spalten.map((spalte, i) => (
                  <Box
                    key={spalte}
                    as="th"
                    scope="col"
                    px={6}
                    py={6}
                    w="26%"
                    fontSize="13px"
                    fontWeight={500}
                    letterSpacing="0.14em"
                    textTransform="uppercase"
                    textAlign="center"
                    color={i === 0 ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                  >
                    {spalte}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box as="tbody">
              {vergleich.zeilen.map((zeile) => {
                const Icon = ICONS[zeile.icon] ?? Target;
                return (
                  <Box as="tr" key={zeile.kriterium}>
                    <Box
                      as="th"
                      scope="row"
                      px={6}
                      py={6}
                      textAlign="left"
                      verticalAlign="middle"
                      borderTop="1px solid var(--cc-line)"
                      fontWeight={500}
                    >
                      <HStack spacing={4}>
                        {/* Linien-Icon, neutral — es benennt die Zeile, es wertet sie nicht. */}
                        <Box flexShrink={0} color="var(--cc-text-2)" aria-hidden>
                          <Icon size={22} strokeWidth={1.5} />
                        </Box>
                        <Text
                          as="span"
                          fontSize="12px"
                          letterSpacing="0.14em"
                          textTransform="uppercase"
                          color="var(--cc-text-2)"
                        >
                          {zeile.kriterium}
                        </Text>
                      </HStack>
                    </Box>

                    {zeile.werte.map((wert, i) => (
                      <Box
                        key={`${zeile.kriterium}-${i}`}
                        as="td"
                        px={6}
                        py={6}
                        textAlign="left"
                        verticalAlign="top"
                        borderTop="1px solid var(--cc-line)"
                      >
                        <Text
                          fontSize="17px"
                          lineHeight={1.35}
                          fontWeight={i === 0 ? 600 : 500}
                          color="var(--cc-text)"
                        >
                          {wert.kurz}
                        </Text>
                        <Text mt={1.5} fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)">
                          {wert.erklaerung}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Gold-Schein hinter der eigenen Spalte */}
          <Box
            aria-hidden
            position="absolute"
            top={0}
            bottom={0}
            left="22%"
            w="26%"
            pointerEvents="none"
            bg="radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212, 176, 128, 0.16), transparent 70%)"
          />
        </Box>
      </Reveal>

      {/* ── Darunter: eine Karte pro Kriterium ─────────────────────────── */}
      <Stack display={{ base: "flex", lg: "none" }} mt={10} spacing={4}>
        {vergleich.zeilen.map((zeile, i) => {
          const Icon = ICONS[zeile.icon] ?? Target;
          return (
            <Reveal key={zeile.kriterium} delay={i * 50}>
              <Box className="cc-card" p={5}>
                <HStack as="h3" spacing={3} mb={4}>
                  <Box flexShrink={0} color="var(--cc-text-2)" aria-hidden>
                    <Icon size={20} strokeWidth={1.5} />
                  </Box>
                  <Text
                    as="span"
                    fontSize="12px"
                    fontWeight={500}
                    letterSpacing="0.14em"
                    textTransform="uppercase"
                    color="var(--cc-text-2)"
                  >
                    {zeile.kriterium}
                  </Text>
                </HStack>

                <Stack spacing={3}>
                  {vergleich.spalten.map((spalte, s) => (
                    <Stack
                      key={spalte}
                      spacing={1}
                      px={s === 0 ? 4 : 0}
                      py={s === 0 ? 3 : 0}
                      borderRadius={s === 0 ? "10px" : undefined}
                      border={s === 0 ? "1px solid rgba(212, 176, 128, 0.45)" : undefined}
                      bg={s === 0 ? "var(--cc-gold-wash)" : undefined}
                    >
                      <Text
                        fontSize="11px"
                        letterSpacing="0.14em"
                        textTransform="uppercase"
                        color={s === 0 ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                      >
                        {spalte}
                      </Text>
                      <Text fontSize="16px" lineHeight={1.35} fontWeight={s === 0 ? 600 : 500} color="var(--cc-text)">
                        {zeile.werte[s].kurz}
                      </Text>
                      <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)">
                        {zeile.werte[s].erklaerung}
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Reveal>
          );
        })}
      </Stack>

      {/* Abschlusszeile zwischen zwei Haarlinien */}
      <Reveal delay={140}>
        <Flex align="center" gap={{ base: 4, md: 6 }} mt={{ base: 10, md: 12 }}>
          <Box aria-hidden flex={1} h="1px" bg="linear-gradient(90deg, transparent, var(--cc-line-strong))" />
          <Text
            fontSize={{ base: "11px", md: "12px" }}
            fontWeight={500}
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--cc-text-2)"
            textAlign="center"
          >
            {vergleich.abschluss}
          </Text>
          <Box aria-hidden flex={1} h="1px" bg="linear-gradient(90deg, var(--cc-line-strong), transparent)" />
        </Flex>
      </Reveal>
    </Sektion>
  );
}
