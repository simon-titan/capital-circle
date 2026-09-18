"use client";

import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { brief } from "@/config/landing-membership";
import { Signatur } from "./Signatur";
import { Reveal } from "../landing-ui";
import { Sektion } from "./membership-ui";

/**
 * Der Brief des Gründers.
 *
 * ── Warum das Porträt schwarzweiß ist ──────────────────────────────────────
 * Es ist dasselbe Foto wie in der bestehenden Meet-the-Founder-Section
 * (`/founder/founder.jpeg`). Dort steht es in Farbe hinter einem
 * Champagner-Schein und wirbt. Hier soll es das nicht: Ein Brief ist eine
 * persönliche Ansprache, und ein entsättigtes Bild, das nach allen Seiten weich
 * in den Graphitgrund ausläuft, tritt hinter den Text zurück statt vor ihn.
 *
 * Die Maske ist ein `mask-image`, kein zweites Bild — damit bleibt genau eine
 * Datei zu pflegen, und der Übergang stimmt auf jedem Hintergrund.
 *
 * ── Warum kein `cc-card` ───────────────────────────────────────────────────
 * Der Abschnitt steht als einziger direkt auf dem Himmel, getrennt nur durch
 * eine senkrechte Haarlinie zwischen Bild und Text. Eine Karte würde den Brief
 * zu einem weiteren Element unter vielen machen; hier soll die Seite kurz
 * anhalten.
 */
export function FounderBriefSection() {
  const [anrede, ...absaetze] = brief.absaetze;

  return (
    <Sektion py={{ base: 16, md: 28 }} aria-labelledby="brief-titel">
      <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 420px) 1fr" }} gap={{ base: 10, lg: 16 }}>
        {/* ── Links: Dachzeile, Überschrift, Porträt ─────────────────── */}
        <Reveal>
          <Stack spacing={{ base: 6, md: 8 }}>
            <Text
              fontSize="12px"
              fontWeight={600}
              letterSpacing="0.18em"
              textTransform="uppercase"
              color="var(--cc-gold-light)"
            >
              {brief.eyebrow}
            </Text>

            {/*
              Kleiner gesetzt als die übrigen Abschnittsüberschriften: Sie steht
              hier in einer 420px-Spalte, und ein Satz dieser Länge würde in
              52px zu einem sechszeiligen Block, der den Brief daneben erschlägt.
            */}
            <Heading
              as="h2"
              id="brief-titel"
              fontSize="clamp(30px, 4vw, 44px)"
              fontWeight={700}
              lineHeight={1.1}
              letterSpacing="-0.025em"
              color="var(--cc-text)"
            >
              {brief.headline}
            </Heading>

            {/*
              Das Foto steht in Farbe und ohne Effekte (Nutzerwunsch
              17.09.2026): keine Graustufen, keine Maske, kein Auslaufen in den
              Grund. Nur eine Haarlinie und der Kartenradius, damit es nicht
              randlos im Graphit schwebt.

              `objectPosition: center 72%` schneidet oben deutlich ab und zeigt
              dafür mehr vom unteren Bildteil — im Original nimmt die Wand über
              dem Kopf ein Drittel des Bildes ein.
            */}
            <Box
              position="relative"
              w={{ base: "230px", md: "300px", lg: "330px" }}
              h={{ base: "290px", md: "375px", lg: "415px" }}
              borderRadius="12px"
              overflow="hidden"
              border="1px solid var(--cc-line)"
            >
              <Image
                src={brief.bild}
                alt={brief.bildAlt}
                fill
                sizes="(max-width: 48em) 230px, (max-width: 64em) 300px, 330px"
                style={{ objectFit: "cover", objectPosition: "center 72%" }}
              />
            </Box>
          </Stack>
        </Reveal>

        {/* ── Rechts: der Brief ───────────────────────────────────────── */}
        <Reveal delay={90}>
          <Box
            pl={{ base: 0, lg: 12 }}
            borderLeft={{ base: "none", lg: "1px solid var(--cc-line-strong)" }}
            h="100%"
          >
            <Stack spacing={{ base: 5, md: 6 }} maxW="720px">
              <Text fontSize={{ base: "17px", md: "19px" }} lineHeight={1.7} color="var(--cc-text)" fontWeight={500}>
                {anrede}
              </Text>

              {absaetze.map((absatz) => (
                <Text
                  key={absatz}
                  fontSize={{ base: "16px", md: "17px" }}
                  lineHeight={1.75}
                  color="var(--cc-text-2)"
                  // Ein `\n` in der Config ist ein Umbruch innerhalb des Absatzes.
                  whiteSpace="pre-line"
                >
                  {absatz}
                </Text>
              ))}

              {/*
                Die Signatur steht als Text statt als Bild: Eine gescannte
                Unterschrift wäre ein weiteres Asset, das niemand pflegt, und
                sie ließe sich nicht vorlesen.

                Weiß statt Gold (Feedback 09/2026): Gold ist auf dieser Seite
                die Farbe der Aktion. Ein Name, den man nicht anklicken kann,
                sollte sie nicht tragen.
              */}
              <Box mt={2}>
                <Signatur />
              </Box>
            </Stack>
          </Box>
        </Reveal>
      </Grid>
    </Sektion>
  );
}
