"use client";

import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { brief } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { Sektion } from "./membership-ui";

/**
 * Der Brief des Gründers.
 *
 * ── Warum das Porträt schwarzweiß ist ──────────────────────────────────────
 * Es ist dasselbe Foto wie in der bestehenden Meet-the-Founder-Section
 * (`/founder/founder.jpeg`). Dort steht es in Farbe hinter einem
 * Champagner-Schein und wirbt. Hier soll es das nicht: Ein Brief ist eine
 * persönliche Ansprache, und ein entsättigtes Bild, das links weich in den
 * Graphitgrund ausläuft, tritt hinter den Text zurück statt vor ihn.
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
            <Stack spacing={2}>
              <Text
                fontSize="12px"
                fontWeight={600}
                letterSpacing="0.18em"
                textTransform="uppercase"
                color="var(--cc-gold-light)"
              >
                {brief.eyebrow}
              </Text>
              <Text
                fontSize="12px"
                fontWeight={500}
                letterSpacing="0.18em"
                textTransform="uppercase"
                color="var(--cc-text-3)"
              >
                {brief.unterzeile}
              </Text>
            </Stack>

            <Heading
              as="h2"
              id="brief-titel"
              fontSize="clamp(34px, 5vw, 56px)"
              fontWeight={700}
              lineHeight={1.05}
              letterSpacing="-0.03em"
              color="var(--cc-text)"
            >
              {brief.headline}
            </Heading>

            <Box
              position="relative"
              w={{ base: "220px", md: "300px", lg: "340px" }}
              h={{ base: "280px", md: "380px", lg: "430px" }}
              sx={{
                // Links und unten weich auslaufend, wie im Kunden-Mockup.
                maskImage:
                  "linear-gradient(90deg, transparent 0%, #000 34%), linear-gradient(0deg, transparent 0%, #000 22%)",
                maskComposite: "intersect",
                WebkitMaskImage:
                  "linear-gradient(90deg, transparent 0%, #000 34%), linear-gradient(0deg, transparent 0%, #000 22%)",
                WebkitMaskComposite: "source-in",
              }}
            >
              <Image
                src={brief.bild}
                alt={brief.bildAlt}
                fill
                sizes="(max-width: 48em) 220px, (max-width: 64em) 300px, 340px"
                style={{ objectFit: "cover", objectPosition: "center top", filter: "grayscale(1) contrast(1.05)" }}
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
                <Text key={absatz} fontSize={{ base: "16px", md: "17px" }} lineHeight={1.75} color="var(--cc-text-2)">
                  {absatz}
                </Text>
              ))}

              {/*
                Die Signatur steht kursiv und in Gold statt als Bild: Eine
                gescannte Unterschrift wäre ein weiteres Asset, das niemand
                pflegt, und sie ließe sich nicht vorlesen.
              */}
              <Text
                as="p"
                mt={2}
                fontSize={{ base: "26px", md: "30px" }}
                fontStyle="italic"
                fontWeight={500}
                letterSpacing="0.02em"
                color="var(--cc-gold-light)"
              >
                {brief.signatur}
              </Text>
            </Stack>
          </Box>
        </Reveal>
      </Grid>
    </Sektion>
  );
}
