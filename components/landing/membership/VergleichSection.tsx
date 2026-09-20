"use client";

import { Box, Flex, HStack, Text } from "@chakra-ui/react";
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
 * ── Zwei Tabellen, eine Quelle ─────────────────────────────────────────────
 * Ab `lg` eine breite `<table>` mit Kriterien in der ersten Spalte. Fünf
 * Kriterien über drei Ansätze sind tabellarische Daten, und ein Screenreader
 * soll sie auch so vorgelesen bekommen („Review, Capital Circle, Journal,
 * Aufgaben & Feedback“).
 *
 * Darunter (Handy und Tablet) ebenfalls eine echte `<table>`, aber schmal
 * gebaut: drei gleich breite Spalten, die volle Breite gehört den Ansätzen.
 * Das Kriterium steht nicht als vierte Spalte daneben, sondern als schmales Band
 * über jeder Zeile. So bleiben alle drei Ansätze nebeneinander vergleichbar, und
 * es scrollt nichts seitwärts. Die frühere Kartenliste (15 Blöcke untereinander)
 * war lang und ließ nichts mehr vergleichen.
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

      {/* ── Darunter: kompakte Tabelle ─────────────────────────────────── */}
      <Reveal delay={60}>
        <Box
          display={{ base: "block", lg: "none" }}
          mt={10}
          className="cc-card cc-card--still"
          p={0}
          overflow="hidden"
          position="relative"
        >
          <Box
            as="table"
            lang="de"
            w="100%"
            sx={{
              borderCollapse: "collapse",
              tableLayout: "fixed",
              // Schmale Spalten: lange deutsche Wörter trennen statt überlaufen.
              hyphens: "auto",
              overflowWrap: "break-word",
              // Die eigene Spalte getönt und gerahmt, wie in der breiten Tabelle.
              "& thead th:nth-of-type(1), & td:nth-of-type(1)": {
                background: "linear-gradient(180deg, rgba(212, 176, 128, 0.08), rgba(212, 176, 128, 0.03))",
                borderLeft: "1px solid rgba(212, 176, 128, 0.45)",
                borderRight: "1px solid rgba(212, 176, 128, 0.45)",
              },
              "& thead th:nth-of-type(1)": { borderTop: "1px solid rgba(212, 176, 128, 0.45)" },
              "& tbody:last-of-type td:nth-of-type(1)": { borderBottom: "1px solid rgba(212, 176, 128, 0.45)" },
              // Sehr schmale Geräte (320px): Spalten ~96px breit. Etwas kleinere Schrift und
              // weniger Innenabstand, damit „Eigenständig“ und „Bereitstellen“ nicht mitten im Wort brechen.
              "@media (max-width: 359px)": {
                "& th, & td": { paddingInline: "6px" },
                "& thead th": { fontSize: "9px", letterSpacing: "0.04em" },
                "& td > p:first-of-type": { fontSize: "12px" },
                "& td > p:last-of-type": { fontSize: "11px" },
              },
            }}
          >
            <Box as="thead">
              <Box as="tr">
                {vergleich.spalten.map((spalte, i) => (
                  <Box
                    key={spalte}
                    as="th"
                    scope="col"
                    w="33.333%"
                    px={{ base: 2.5, md: 4 }}
                    py={{ base: 3.5, md: 4 }}
                    fontSize={{ base: "10px", md: "12px" }}
                    fontWeight={500}
                    letterSpacing={{ base: "0.08em", md: "0.12em" }}
                    textTransform="uppercase"
                    textAlign="left"
                    verticalAlign="bottom"
                    lineHeight={1.35}
                    color={i === 0 ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                  >
                    {spalte}
                  </Box>
                ))}
              </Box>
            </Box>

            {vergleich.zeilen.map((zeile) => {
              const Icon = ICONS[zeile.icon] ?? Target;
              return (
                <Box as="tbody" key={zeile.kriterium}>
                  {/* Kriterium als Band über der Zeile, damit alle drei Ansätze die volle Breite bekommen. */}
                  <Box as="tr">
                    <Box
                      as="th"
                      scope="colgroup"
                      colSpan={3}
                      px={{ base: 2.5, md: 4 }}
                      pt={{ base: 4, md: 5 }}
                      pb={{ base: 2, md: 2.5 }}
                      textAlign="left"
                      fontWeight={500}
                      borderTop="1px solid var(--cc-line)"
                      background="rgba(255, 255, 255, 0.02)"
                    >
                      <HStack spacing={2.5}>
                        <Box flexShrink={0} color="var(--cc-text-2)" aria-hidden>
                          <Icon size={16} strokeWidth={1.5} />
                        </Box>
                        <Text
                          as="span"
                          fontSize={{ base: "11px", md: "12px" }}
                          letterSpacing="0.14em"
                          textTransform="uppercase"
                          color="var(--cc-text-2)"
                        >
                          {zeile.kriterium}
                        </Text>
                      </HStack>
                    </Box>
                  </Box>

                  <Box as="tr">
                    {zeile.werte.map((wert, i) => (
                      <Box
                        key={`${zeile.kriterium}-${i}`}
                        as="td"
                        verticalAlign="top"
                        textAlign="left"
                        px={{ base: 2.5, md: 4 }}
                        pt={{ base: 1, md: 1.5 }}
                        pb={{ base: 4, md: 5 }}
                      >
                        <Text
                          fontSize={{ base: "13px", md: "16px" }}
                          lineHeight={1.3}
                          fontWeight={i === 0 ? 600 : 500}
                          color="var(--cc-text)"
                        >
                          {wert.kurz}
                        </Text>
                        <Text
                          mt={{ base: 1.5, md: 2 }}
                          fontSize={{ base: "12px", md: "14px" }}
                          lineHeight={1.45}
                          color="var(--cc-text-2)"
                        >
                          {wert.erklaerung}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Gold-Schein hinter der eigenen Spalte */}
          <Box
            aria-hidden
            position="absolute"
            top={0}
            bottom={0}
            left={0}
            w="33.333%"
            pointerEvents="none"
            bg="radial-gradient(ellipse 90% 30% at 50% 0%, rgba(212, 176, 128, 0.16), transparent 70%)"
          />
        </Box>
      </Reveal>

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
