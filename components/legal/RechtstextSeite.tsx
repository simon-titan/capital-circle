import type { ReactNode } from "react";
import Link from "next/link";
import { Box, Stack, Text } from "@chakra-ui/react";
import { rechtstexteStand } from "@/config/legal";
import { RechtsFusszeile } from "./RechtsFusszeile";
import { RechtsNav } from "./RechtsNav";

/**
 * Gemeinsames Lesetext-Layout für Impressum, Datenschutz, AGB und Widerruf.
 *
 * Ruhig statt werblich: ein Himmel wie überall (Sternenfeld, Champagner-Licht),
 * darauf **eine** stille Glas-Karte (`.cc-card--still`, kein Anheben beim
 * Hover — über einem langen Text wäre das nur Unruhe). Die Zeilenlänge ist
 * über die Kartenbreite auf etwa 70 Zeichen begrenzt.
 *
 * Die Seiten schreiben schlichtes HTML (`h2`, `h3`, `p`, `ul`, `ol`, `a`,
 * `address`); die Typografie kommt ausschließlich aus `lesetextSx` hier. So
 * sehen alle vier Texte gleich aus, ohne dass jeder Absatz eine Komponente
 * braucht — und ein Rechtstext bleibt als Text lesbar, auch im Quellcode.
 *
 * Server-Komponente: `Link` umschließt den Inhalt statt als `as`-Prop in eine
 * Chakra-Komponente zu wandern (Funktion über die Server-Grenze, siehe
 * `app/ergebnisse/page.tsx`).
 */

const lesetextSx = {
  fontSize: { base: "15px", md: "16px" },
  lineHeight: 1.7,
  color: "var(--cc-text-soft)",
  overflowWrap: "anywhere",
  hyphens: "auto",
  "& > :first-of-type": { mt: 0 },
  h2: {
    fontSize: { base: "18px", md: "20px" },
    lineHeight: 1.3,
    fontWeight: 600,
    color: "var(--cc-text)",
    letterSpacing: "-0.005em",
    mt: 10,
    mb: 3,
    scrollMarginTop: "24px",
  },
  h3: {
    fontSize: "16px",
    lineHeight: 1.4,
    fontWeight: 600,
    color: "var(--cc-text)",
    mt: 6,
    mb: 2,
  },
  p: { mb: 3 },
  "ul, ol": { pl: 5, mb: 3 },
  li: { mb: 1.5, pl: 1 },
  "li::marker": { color: "var(--cc-text-3)" },
  strong: { color: "var(--cc-text)", fontWeight: 600 },
  a: {
    color: "var(--cc-gold-light)",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    textDecorationColor: "rgba(232, 192, 148, 0.4)",
    transition: "text-decoration-color 150ms var(--cc-ease)",
    _hover: { textDecorationColor: "var(--cc-gold-light)" },
  },
  address: { fontStyle: "normal", mb: 3 },
  // Keine Monospace-Schrift (DESIGN.md: Inter für alles) — nur ein leiser Hinterlegungston.
  code: {
    fontFamily: "inherit",
    fontSize: "0.92em",
    color: "var(--cc-text)",
    bg: "rgba(255, 255, 255, 0.05)",
    px: "5px",
    py: "1px",
    borderRadius: "4px",
  },
  hr: { border: 0, borderTop: "1px solid var(--cc-line)", my: 8 },
  // Kasten für wortgleich übernommene Mustertexte (Widerruf) und Hinweise.
  ".rt-kasten": {
    border: "1px solid var(--cc-line-strong)",
    borderRadius: "10px",
    bg: "rgba(255, 255, 255, 0.02)",
    px: { base: 4, md: 6 },
    py: { base: 4, md: 5 },
    my: 5,
  },
  ".rt-kasten > :first-of-type": { mt: 0 },
  ".rt-kasten > :last-child": { mb: 0 },
  ".rt-klein": { fontSize: "13px", color: "var(--cc-text-2)", lineHeight: 1.6 },
  ".rt-inhalt": { pl: 0, listStyleType: "none" },
  ".rt-inhalt li": { mb: 1, pl: 0 },
  table: { w: "100%", borderCollapse: "collapse", mb: 4, fontSize: "14px" },
  "th, td": { textAlign: "left", verticalAlign: "top", py: 2, pr: 3, borderBottom: "1px solid var(--cc-line)" },
  th: { color: "var(--cc-text)", fontWeight: 600 },
} as const;

export interface RechtstextSeiteProps {
  titel: string;
  /** Ein, zwei Sätze unter der Überschrift (optional). */
  einleitung?: ReactNode;
  children: ReactNode;
}

export function RechtstextSeite({ titel, einleitung, children }: RechtstextSeiteProps) {
  return (
    <Box position="relative" minH="100vh" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Box as="main" position="relative" zIndex={1} px={{ base: 4, md: 8 }} pt={{ base: 8, md: 14 }} pb={{ base: 12, md: 16 }}>
        <Stack maxW="780px" mx="auto" gap={{ base: 7, md: 9 }}>
          <Stack gap={6} className="cc-rise">
            <Link href="/" style={{ width: "fit-content" }} aria-label="Capital Circle — zur Startseite">
              <Box
                as="span"
                display="inline-block"
                color="var(--cc-text)"
                fontSize="14px"
                letterSpacing="0.32em"
                fontWeight={400}
                lineHeight={1}
                textTransform="uppercase"
                whiteSpace="nowrap"
              >
                Capital Circle
              </Box>
            </Link>

            <RechtsNav />

            <Stack gap={3}>
              <Text
                fontSize="13px"
                lineHeight="18px"
                fontWeight={500}
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="var(--cc-gold-light)"
              >
                Rechtliches
              </Text>
              <Box
                as="h1"
                fontSize={{ base: "28px", md: "36px" }}
                lineHeight={1.15}
                fontWeight={600}
                letterSpacing="-0.01em"
                color="var(--cc-text)"
              >
                {titel}
              </Box>
              <Text fontSize="14px" color="var(--cc-text-2)">
                Stand: {rechtstexteStand}
              </Text>
              {einleitung ? (
                <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="640px">
                  {einleitung}
                </Text>
              ) : null}
            </Stack>
          </Stack>

          <Box
            as="article"
            className="cc-card cc-card--still cc-rise"
            style={{ animationDelay: "120ms" }}
            px={{ base: 5, md: 10 }}
            py={{ base: 6, md: 10 }}
            sx={lesetextSx}
          >
            {children}
          </Box>
        </Stack>
      </Box>

      <RechtsFusszeile />
    </Box>
  );
}
