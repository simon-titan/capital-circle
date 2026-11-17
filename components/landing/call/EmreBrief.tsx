"use client";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { emreBrief } from "@/config/call-funnel";
import { Reveal } from "../landing-ui";
import { Sektion } from "../membership/membership-ui";

/**
 * „Ein persönliches Wort von Emre." auf `/call` — Emres Vorlage (Papier mit
 * Reißzwecke, 07.11.2026) als HTML nachgebaut, nicht als Bild: Der Text bleibt
 * echter Text, lesbar auf dem Handy, für Screenreader und Suche.
 *
 * - **Papier:** heller Grund mit zwei Rauschschichten aus `feTurbulence`
 *   (feine Faser, grobe Flecken) als SVG-Data-URI, leichte Vignette.
 * - **Gerissener Rand:** `clip-path` mit einem gezackten Polygon (`RISSKANTE`,
 *   einmal deterministisch erzeugt, damit Server und Client dasselbe rendern).
 *   Den Schatten wirft `drop-shadow` am Elternelement — ein `box-shadow` am
 *   beschnittenen Element würde mit abgeschnitten.
 * - **Reißzwecke:** Messing aus `radial-gradient`, außerhalb des Beschnitts.
 * - **Schrift:** Schreibmaschinen-**Systemschrift** (`BRIEF_SCHRIFT`) — die
 *   einzige Ausnahme vom Inter-Gebot in DESIGN.md (Entscheidung Simon,
 *   08.11.2026). Bewusst **kein Webfont**: Courier New liegt auf Windows und
 *   macOS bei, sonst greift die Monospace des Systems.
 *
 * Wortlaut und Fettdruck stehen in `emreBrief` (`config/call-funnel.ts`).
 * Unter dem Papier steht `children` — auf `/call` der Buchungsknopf mit der
 * Vertrauenszeile.
 */

/** Schreibmaschine aus dem System — kein Webfont laden (DESIGN.md: keine weiteren Webfonts). */
const BRIEF_SCHRIFT = '"Courier New", Courier, "Nimbus Mono PS", monospace';

const TINTE = "#1f1b17";
const SIGNATUR_BRAUN = "#7a4a1e";

/** Feine Papierfaser und grobe Flecken, beide warmgrau, als kachelbare SVGs. */
const FASER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.33 0 0 0 0 0.28 0 0 0 0 0.22 0 0 0 0.22 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E\")";
const FLECKEN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.36 0 0 0 0 0.28 0 0 0 0.5 -0.12'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

/**
 * Gezackter Rand als `polygon()`: entlang jeder Kante ein Punkt je ~1,6 %, quer
 * dazu um einige Pixel versetzt (unten stärker, wie in der Vorlage). Fester
 * Startwert, damit die Kante bei jedem Rendern gleich ist.
 */
const RISSKANTE = (() => {
  let seed = 0x2f6b9d;
  const zufall = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const tiefe = (max: number) => (1 + zufall() * (max - 1)).toFixed(1);
  const schritte = 62;
  const punkte: string[] = [];
  for (let i = 0; i <= schritte; i++) punkte.push(`${((i / schritte) * 100).toFixed(2)}% ${tiefe(5)}px`);
  for (let i = 1; i <= schritte; i++) punkte.push(`calc(100% - ${tiefe(5)}px) ${((i / schritte) * 100).toFixed(2)}%`);
  for (let i = schritte - 1; i >= 0; i--) punkte.push(`${((i / schritte) * 100).toFixed(2)}% calc(100% - ${tiefe(10)}px)`);
  for (let i = schritte - 1; i >= 1; i--) punkte.push(`${tiefe(5)}px ${((i / schritte) * 100).toFixed(2)}%`);
  return `polygon(${punkte.join(", ")})`;
})();

export function EmreBrief({ children }: { children?: ReactNode }) {
  const b = emreBrief;
  return (
    <Sektion id="brief" aria-labelledby="brief-titel">
      <Reveal>
        <Box
          position="relative"
          maxW="800px"
          mx="auto"
          mt={{ base: 2, md: 0 }}
          transform={{ base: "rotate(-0.35deg)", md: "rotate(-0.6deg)" }}
        >
          {/* Schatten am Elternteil, damit `clip-path` ihn nicht abschneidet. */}
          <Box
            sx={{
              filter:
                "drop-shadow(0 2px 2px rgba(0, 0, 0, 0.45)) drop-shadow(0 22px 34px rgba(0, 0, 0, 0.55))",
            }}
          >
            <Box
              lang="de"
              px={{ base: 5, sm: 8, md: 14 }}
              pt={{ base: 12, md: 16 }}
              pb={{ base: 12, md: 16 }}
              color={TINTE}
              fontFamily={BRIEF_SCHRIFT}
              sx={{
                clipPath: RISSKANTE,
                backgroundColor: "#e6e0d5",
                backgroundImage: [
                  "radial-gradient(ellipse 120% 90% at 50% 45%, transparent 55%, rgba(110, 92, 66, 0.18) 100%)",
                  FLECKEN,
                  FASER,
                  "linear-gradient(172deg, #ebe6dc 0%, #e3dcd0 55%, #ddd5c7 100%)",
                ].join(", "),
                hyphens: "auto",
                WebkitHyphens: "auto",
                overflowWrap: "break-word",
              }}
            >
              <Box display="inline-block" maxW="100%" mb={{ base: 6, md: 8 }}>
                <Heading
                  as="h2"
                  id="brief-titel"
                  fontFamily={BRIEF_SCHRIFT}
                  fontSize={{ base: "21px", sm: "24px", md: "30px" }}
                  fontWeight={700}
                  lineHeight={1.25}
                  letterSpacing="0"
                  color={TINTE}
                  sx={{ hyphens: "manual" }}
                >
                  {b.titel}
                </Heading>
                {/* Unterstrich wie mit dem Lineal gezogen: leicht schräg, etwas länger als die Zeile. */}
                <Box aria-hidden h="2px" mt={2} w="104%" bg={TINTE} opacity={0.85} transform="rotate(-0.4deg)" transformOrigin="left" />
              </Box>

              <Stack spacing={{ base: 4, md: 5 }}>
                {b.absaetze.map((absatz, i) => (
                  <Text key={i} fontFamily={BRIEF_SCHRIFT} fontSize={{ base: "15px", md: "17px" }} lineHeight={1.6} color={TINTE}>
                    {absatz.map((teil, j) =>
                      teil.fett ? (
                        <Box as="strong" key={j} fontWeight={700}>
                          {teil.text}
                        </Box>
                      ) : (
                        <Box as="span" key={j}>
                          {teil.text}
                        </Box>
                      ),
                    )}
                  </Text>
                ))}
              </Stack>

              <Text
                mt={{ base: 8, md: 10 }}
                fontFamily={BRIEF_SCHRIFT}
                fontSize={{ base: "18px", md: "21px" }}
                fontStyle="italic"
                fontWeight={700}
                color={SIGNATUR_BRAUN}
              >
                {b.unterschrift}
              </Text>
            </Box>
          </Box>

          <Reisszwecke />
        </Box>
      </Reveal>

      {children ? (
        <Reveal delay={120}>
          <Stack spacing={4} align="center" mt={{ base: 10, md: 14 }}>
            {children}
          </Stack>
        </Reveal>
      ) : null}
    </Sektion>
  );
}

/** Messing-Reißzwecke oben links: Kopf mit Glanzlicht und ein kurzer Schlagschatten aufs Papier. */
function Reisszwecke() {
  return (
    <Box aria-hidden position="absolute" top={{ base: "-8px", md: "-10px" }} left={{ base: "10px", md: "18px" }} pointerEvents="none">
      <Box
        position="absolute"
        top="14px"
        left="10px"
        w={{ base: "24px", md: "30px" }}
        h={{ base: "12px", md: "14px" }}
        borderRadius="50%"
        bg="rgba(0, 0, 0, 0.35)"
        sx={{ filter: "blur(4px)" }}
      />
      <Box
        position="relative"
        w={{ base: "26px", md: "32px" }}
        h={{ base: "26px", md: "32px" }}
        borderRadius="full"
        bg="radial-gradient(circle at 34% 30%, #fff4d6 0%, #e9cd8f 14%, #c49a55 40%, #8f6a2f 70%, #5a4019 100%)"
        boxShadow="inset -2px -3px 5px rgba(40, 26, 8, 0.55), inset 1px 1px 2px rgba(255, 245, 220, 0.6), 0 2px 3px rgba(0, 0, 0, 0.45)"
      />
    </Box>
  );
}
