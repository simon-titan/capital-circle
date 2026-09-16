"use client";

import { Box, Grid, Stack, Text } from "@chakra-ui/react";
import { vergleich } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { Sektion, SektionsKopf } from "./membership-ui";

/**
 * Der Vergleich.
 *
 * ── Zwei Darstellungen, eine Quelle ────────────────────────────────────────
 * Ab `lg` eine echte `<table>`: Fünf Kriterien über drei Anbieter sind
 * tabellarische Daten, und ein Screenreader soll sie auch so vorgelesen
 * bekommen („Preis, Capital Circle, 99 € pro Monat"). Darunter wird daraus eine
 * Karte pro Kriterium — eine waagerecht scrollende Tabelle auf dem Handy liest
 * niemand, und genau die Zeile mit dem Preis wäre die, die aus dem Bild fällt.
 *
 * Beide Formen lesen dieselbe Liste aus `config/landing-membership.ts`. Zwei
 * gepflegte Kopien wären zwei Wahrheiten.
 *
 * Die eigene Spalte trägt Gold-Kante und Gold-Schein. Das ist die einzige
 * Hervorhebung im Abschnitt — die anderen beiden Spalten werden nicht
 * abgewertet, sie stehen nur ruhig daneben.
 */
export function VergleichSection() {
  const [eigene, ...andere] = vergleich.spalten;

  return (
    <Sektion id="ablauf" aria-labelledby="vergleich-titel">
      <SektionsKopf eyebrow={vergleich.eyebrow} headline={vergleich.headline} id="vergleich-titel" maxW="1000px" />

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
              "& td:nth-of-type(2), & th:nth-of-type(2)": {
                background:
                  "linear-gradient(180deg, rgba(212, 176, 128, 0.08), rgba(212, 176, 128, 0.03))",
                borderLeft: "1px solid rgba(212, 176, 128, 0.45)",
                borderRight: "1px solid rgba(212, 176, 128, 0.45)",
              },
              "& tr:first-of-type th:nth-of-type(2)": { borderTop: "1px solid rgba(212, 176, 128, 0.45)" },
              "& tr:last-of-type td:nth-of-type(2)": { borderBottom: "1px solid rgba(212, 176, 128, 0.45)" },
            }}
          >
            <Box as="thead">
              <Box as="tr">
                <Box as="th" w="22%" p={0} />
                {[eigene, ...andere].map((spalte, i) => (
                  <Box
                    key={spalte}
                    as="th"
                    scope="col"
                    px={5}
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
              {vergleich.zeilen.map((zeile) => (
                <Box as="tr" key={zeile.kriterium}>
                  <Box
                    as="th"
                    scope="row"
                    px={6}
                    py={6}
                    textAlign="left"
                    verticalAlign="middle"
                    borderTop="1px solid var(--cc-line)"
                    fontSize="12px"
                    fontWeight={500}
                    letterSpacing="0.14em"
                    textTransform="uppercase"
                    color="var(--cc-text-2)"
                  >
                    {zeile.kriterium}
                  </Box>
                  {zeile.werte.map((wert, i) => (
                    <Box
                      key={`${zeile.kriterium}-${i}`}
                      as="td"
                      px={5}
                      py={6}
                      textAlign="center"
                      verticalAlign="middle"
                      borderTop="1px solid var(--cc-line)"
                      fontSize="16px"
                      lineHeight={1.45}
                      fontWeight={i === 0 ? 500 : 400}
                      color={i === 0 ? "var(--cc-text)" : "var(--cc-text-2)"}
                    >
                      {wert}
                    </Box>
                  ))}
                </Box>
              ))}
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
        {vergleich.zeilen.map((zeile, i) => (
          <Reveal key={zeile.kriterium} delay={i * 50}>
            <Box className="cc-card" p={5}>
              <Text
                as="h3"
                fontSize="12px"
                fontWeight={500}
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="var(--cc-text-2)"
                mb={4}
              >
                {zeile.kriterium}
              </Text>

              <Stack spacing={3}>
                {vergleich.spalten.map((spalte, s) => (
                  <Grid
                    key={spalte}
                    templateColumns="minmax(0, 1fr)"
                    gap={1}
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
                    <Text
                      fontSize="15px"
                      lineHeight={1.45}
                      fontWeight={s === 0 ? 500 : 400}
                      color={s === 0 ? "var(--cc-text)" : "var(--cc-text-2)"}
                    >
                      {zeile.werte[s]}
                    </Text>
                  </Grid>
                ))}
              </Stack>
            </Box>
          </Reveal>
        ))}
      </Stack>
    </Sektion>
  );
}
