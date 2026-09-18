"use client";

import { Box, Flex, Grid, HStack, Stack, Text } from "@chakra-ui/react";
import { ArrowRight, BookMarked, Check, Flame, LayoutGrid, Package, Play, Radio, School } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { plattformVorschau } from "@/config/landing-membership";

/**
 * Die Plattform-Vorschau unter dem Hero.
 *
 * **Echtes Markup statt Screenshot.** Ein Bild wäre schneller gebaut und wäre
 * spätestens beim nächsten Dashboard-Umbau eine Lüge — dazu unscharf auf
 * Retina-Displays und stumm für Screenreader. Nachgebaut sind exakt die
 * Bausteine des echten Dashboards (Glas-Karten, Datentinte für Werte, Gold nur
 * für Aktion und aktive Navigation), deshalb altert es mit dem Designsystem
 * mit statt gegen es.
 *
 * Der ganze Block ist Dekoration: `aria-hidden`, damit ein Screenreader nicht
 * durch erfundene Zahlen läuft. Die Aussage („so sieht es drinnen aus") trägt
 * die Bildunterschrift darüber im Hero, nicht dieser Nachbau.
 */

const NAV_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutGrid,
  Institut: School,
  Journal: BookMarked,
  Live: Radio,
  Ressourcen: Package,
};

/** Kartentitel im Dashboard: klein, versal, gesperrt. */
function KartenTitel({ children, gold = false }: { children: string; gold?: boolean }) {
  return (
    <Text
      fontSize="11px"
      lineHeight="16px"
      fontWeight={500}
      letterSpacing="0.14em"
      textTransform="uppercase"
      color={gold ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
    >
      {children}
    </Text>
  );
}

export function PlattformVorschau() {
  const { begruessung, frage, navPunkte, lektion, streak, fortschritt } = plattformVorschau;

  return (
    <Box
      aria-hidden
      // `cc-neutral` nimmt Gold-Kante, Hover-Glow und das Atmen aus allen
      // Karten darin — genau wie im echten Dashboard, das seit 16.09.2026
      // unter derselben Klasse laeuft. Ohne das verspricht die Vorschau einen
      // Gold-Look, den das Produkt nach dem Kauf nicht einloest.
      className="cc-neutral cc-card cc-card--still"
      overflow="hidden"
      p={0}
      // Unten offen: Die Vorschau taucht in den Abschnitt darunter ab, statt
      // mit einer Kante zu enden. Genau so steht sie im Kunden-Mockup.
      borderBottomRadius={0}
      borderBottom="none"
    >
      <Grid templateColumns={{ base: "1fr", md: "200px 1fr" }} minH={{ base: "auto", md: "420px" }}>
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <Stack
          display={{ base: "none", md: "flex" }}
          spacing={1}
          px={4}
          py={5}
          bg="rgba(22, 26, 32, 0.6)"
          borderRight="1px solid var(--cc-line)"
        >
          <Text
            px={2}
            pb={4}
            fontSize="12px"
            fontWeight={400}
            letterSpacing="0.3em"
            textTransform="uppercase"
            color="var(--cc-text-soft)"
          >
            Capital Circle
          </Text>

          {navPunkte.map((punkt, i) => {
            const Icon = NAV_ICONS[punkt] ?? LayoutGrid;
            const aktiv = i === 0;
            return (
              <HStack
                key={punkt}
                h="42px"
                px={3}
                spacing={3}
                borderRadius="8px"
                border="1px solid"
                borderColor={aktiv ? "var(--cc-gold-line)" : "transparent"}
                bg={aktiv ? "linear-gradient(90deg, rgba(212, 176, 128, 0.16), rgba(212, 176, 128, 0.03))" : "transparent"}
                boxShadow={aktiv ? "0 0 16px rgba(212, 176, 128, 0.12)" : undefined}
                color={aktiv ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
              >
                <Icon size={17} strokeWidth={1.5} />
                <Text fontSize="14px">{punkt}</Text>
              </HStack>
            );
          })}
        </Stack>

        {/* ── Inhalt ───────────────────────────────────────────────────── */}
        <Stack spacing={5} px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }} minW={0}>
          <Stack spacing={1}>
            <Text fontSize={{ base: "22px", md: "27px" }} fontWeight={600} letterSpacing="-0.01em" color="var(--cc-text)">
              Hallo <Box as="span" color="var(--cc-gold-light)">{begruessung}</Box>.
            </Text>
            <Text fontSize="14px" color="var(--cc-text-2)">
              {frage}
            </Text>
          </Stack>

          <Grid templateColumns={{ base: "1fr", lg: "1.7fr 1fr" }} gap={4} minW={0}>
            {/* Weiterlernen — die Hero-Karte des Dashboards */}
            <Box className="cc-card cc-card--hero" p={4} minW={0}>
              <Stack spacing={4}>
                <KartenTitel gold>Als nächstes</KartenTitel>

                <Flex direction={{ base: "column", sm: "row" }} gap={4} align={{ sm: "center" }}>
                  {/* Videovorschau mit Play-Knopf */}
                  <Flex
                    position="relative"
                    flexShrink={0}
                    w={{ base: "100%", sm: "180px" }}
                    h="104px"
                    align="center"
                    justify="center"
                    borderRadius="10px"
                    overflow="hidden"
                    border="1px solid rgba(212, 176, 128, 0.28)"
                    bg="linear-gradient(160deg, rgba(36, 42, 49, 0.95), rgba(20, 25, 30, 0.95))"
                    boxShadow="0 10px 28px rgba(0, 0, 0, 0.45)"
                  >
                    <Kerzenband />
                    <Flex
                      position="relative"
                      w="40px"
                      h="40px"
                      align="center"
                      justify="center"
                      borderRadius="full"
                      bg="var(--cc-gold-grad)"
                      color="var(--cc-on-gold)"
                      boxShadow="0 0 22px rgba(212, 176, 128, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
                    >
                      <Play size={16} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />
                    </Flex>
                  </Flex>

                  <Stack spacing={3} flex={1} minW={0}>
                    <Text fontSize="15px" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                      {lektion.titel}{" "}
                      <Box as="span" fontWeight={400} color="var(--cc-text-2)">
                        · {lektion.meta}
                      </Box>
                    </Text>

                    {/* Datentinte, nicht Gold: Daten im Dashboard bleiben neutral. */}
                    <Box h="8px" w="full" borderRadius="full" bg="rgba(255, 255, 255, 0.07)" overflow="hidden">
                      <Box h="full" w={`${lektion.fortschrittProzent}%`} borderRadius="full" bg="var(--cc-ink)" />
                    </Box>

                    <HStack
                      alignSelf="flex-start"
                      h="32px"
                      px={3}
                      spacing={2}
                      borderRadius="8px"
                      border="1px solid var(--cc-line-strong)"
                      bg="rgba(255, 255, 255, 0.02)"
                      color="var(--cc-text)"
                    >
                      <Text fontSize="13px" fontWeight={500}>
                        Weiterlernen
                      </Text>
                      <ArrowRight size={14} strokeWidth={2} />
                    </HStack>
                  </Stack>
                </Flex>
              </Stack>
            </Box>

            {/* Rechte Spalte: eine Karte, wie im echten Dashboard seit 17.09.2026.
                Die fruehere getrennte Streak-Karte mit der Siebenerreihe aus
                Kreisen gibt es dort nicht mehr; die Streak sitzt jetzt im Fuss
                der Fortschrittskarte. */}
            <Stack spacing={4} minW={0}>
              <Box className="cc-card" p={4}>
                <Stack spacing={3}>
                  <KartenTitel>Dein Fortschritt</KartenTitel>

                  <Stack spacing={1}>
                    <Text
                      className="cc-num"
                      fontSize={{ base: "30px", md: "36px" }}
                      lineHeight={1}
                      fontWeight={600}
                      letterSpacing="-0.02em"
                      color="var(--cc-text)"
                    >
                      {fortschritt.prozent} %
                    </Text>
                    <Text fontSize="12px" color="var(--cc-text-2)" className="cc-num">
                      {fortschritt.lektionen}
                    </Text>
                  </Stack>

                  <HStack spacing="4px">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Box
                        key={i}
                        flex={1}
                        h="18px"
                        borderRadius="4px"
                        bg={i < fortschritt.segmenteGefuellt ? "var(--cc-ink)" : "transparent"}
                        border={i < fortschritt.segmenteGefuellt ? "none" : "1px solid rgba(255, 255, 255, 0.14)"}
                      />
                    ))}
                  </HStack>

                  <Flex pt={3} gap={4} borderTop="1px solid var(--cc-line)" align="center">
                    <HStack spacing={2.5} flex={1} minW={0}>
                      <Flex
                        w="34px"
                        h="34px"
                        flexShrink={0}
                        align="center"
                        justify="center"
                        borderRadius="10px"
                        bg="linear-gradient(145deg, rgba(255, 140, 60, 0.3), rgba(212, 176, 128, 0.16))"
                        border="1px solid rgba(255, 160, 80, 0.45)"
                        color="#ffb454"
                      >
                        <Flame className="cc-flame" size={16} fill="currentColor" strokeWidth={0} />
                      </Flex>
                      <Stack spacing={0} minW={0}>
                        <Text className="cc-num" fontSize="17px" lineHeight={1.1} fontWeight={600}>
                          {streak.tage}
                        </Text>
                        <Text fontSize="11px" lineHeight={1.3} color="var(--cc-text-2)">
                          Tage aktiv
                        </Text>
                      </Stack>
                    </HStack>

                    <HStack spacing={2.5} flex={1} minW={0} borderLeft="1px solid var(--cc-line)" pl={4}>
                      <Flex
                        w="24px"
                        h="24px"
                        flexShrink={0}
                        align="center"
                        justify="center"
                        borderRadius="full"
                        border="1px solid var(--cc-line-strong)"
                        color="var(--cc-ink)"
                      >
                        <Check size={13} strokeWidth={2.25} />
                      </Flex>
                      <Stack spacing={0} minW={0}>
                        <Text className="cc-num" fontSize="12px" lineHeight={1.3} fontWeight={600}>
                          {streak.wocheAktiv} von {streak.wocheGesamt} Tagen
                        </Text>
                        <Text fontSize="11px" lineHeight={1.3} color="var(--cc-text-2)">
                          diese Woche
                        </Text>
                      </Stack>
                    </HStack>
                  </Flex>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Stack>
      </Grid>
    </Box>
  );
}

/**
 * Angedeutete Kerzen hinter dem Play-Knopf.
 *
 * Reines SVG statt eines Chartbilds: Es geht um die Anmutung „hier läuft ein
 * Chart-Video", nicht um Daten. Feste Werte, damit bei jedem Laden dasselbe
 * Bild steht — ein zufälliges Muster würde bei jedem Rendering flackern.
 *
 * Exportiert, weil die Lektionsvorschau in `ProzessSection` dieselbe Anmutung
 * braucht. Zwei Kerzenbänder wären zwei Stellen, an denen jemand die Farbe
 * nachzieht, und eine, an der er es vergisst.
 */
export function Kerzenband() {
  const kerzen = [
    [6, 34, 18], [14, 28, 24], [22, 40, 14], [30, 22, 30], [38, 30, 22],
    [46, 16, 38], [54, 26, 26], [62, 12, 42], [70, 20, 32], [78, 8, 46],
    [86, 18, 34], [94, 10, 40],
  ];
  return (
    <Box
      as="svg"
      position="absolute"
      inset={0}
      w="100%"
      h="100%"
      viewBox="0 0 104 64"
      preserveAspectRatio="none"
      opacity={0.42}
      sx={{ "& rect": { fill: "rgba(212, 176, 128, 0.55)" } }}
    >
      {kerzen.map(([x, y, h]) => (
        <rect key={x} x={x} y={y} width="3.5" height={h} rx="1" />
      ))}
    </Box>
  );
}
