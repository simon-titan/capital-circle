"use client";

import { Box, Button, Flex, Grid, Heading, Stack, Text, type BoxProps, type ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { ctaAnker, ctaLabel } from "@/config/landing-membership";
import type { Bewertungsspiegel } from "@/lib/landing-reviews";
import { Eyebrow, Reveal } from "../landing-ui";

/*
 * Bausteine der Sales-Landing auf `/` im Schema v3.2 „Champagner auf Graphit"
 * (DESIGN.md → Marketing). Farben ausschließlich über `--cc-*`; rgba-Werte nur
 * für Licht und Schatten der Champagner-Familie.
 */

/**
 * Dachzeile über einer Abschnittsüberschrift.
 *
 * Linksbündig und ohne die beiden Lichtstriche der zentrierten `Eyebrow` aus
 * `landing-ui.tsx`: Diese Seite setzt jeden Abschnitt links an, und ein
 * zentriertes Element darüber würde die Kante brechen.
 */
export function SektionsEyebrow({ children }: { children: ReactNode }) {
  return (
    <Text
      as="p"
      fontSize="12px"
      lineHeight="18px"
      fontWeight={600}
      letterSpacing="0.16em"
      textTransform="uppercase"
      color="var(--cc-gold-light)"
    >
      {children}
    </Text>
  );
}

/**
 * Der dreizeilige Merksatz neben einem Abschnittskopf.
 *
 * Er steht an einer senkrechten Haarlinie und fasst in drei gesperrten Zeilen
 * zusammen, was die Überschrift daneben behauptet. Ab `lg`, weil die Linie
 * darunter keine zweite Spalte mehr trennt — dann rutscht er unter den Kopf
 * und trägt sich als eigener kleiner Block.
 */
function Merksatz({ zeilen }: { zeilen: readonly string[] }) {
  return (
    <Stack
      as="p"
      spacing={2}
      pt={{ base: 0, lg: 2 }}
      pl={{ base: 0, lg: 8 }}
      borderLeft={{ base: "none", lg: "1px solid var(--cc-line-strong)" }}
    >
      {zeilen.map((zeile) => (
        <Text
          key={zeile}
          as="span"
          fontSize={{ base: "11px", md: "12px" }}
          fontWeight={500}
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="var(--cc-text-2)"
        >
          {zeile}
        </Text>
      ))}
    </Stack>
  );
}

/**
 * Abschnittskopf: Dachzeile, Überschrift, optional ein bis zwei ruhige Zeilen.
 *
 * `lichtstriche` setzt die Dachzeile zwischen zwei auslaufende Gold-Linien
 * (`Eyebrow` aus `landing-ui`), `merksatz` stellt rechts daneben drei gesperrte
 * Zeilen an eine Haarlinie. Beides kommt aus den Kunden-Mockups für „Der
 * Unterschied" und „Für wen ist das?" — die übrigen Abschnitte bleiben schlicht.
 */
export function SektionsKopf({
  eyebrow,
  headline,
  id,
  sublines,
  maxW = "820px",
  merksatz,
  lichtstriche = false,
}: {
  eyebrow: string;
  headline: ReactNode;
  id?: string;
  sublines?: readonly string[];
  maxW?: string;
  merksatz?: readonly string[];
  lichtstriche?: boolean;
}) {
  const kopf = (
    <Stack spacing={{ base: 4, md: 5 }} maxW={maxW}>
      {lichtstriche ? (
        <Eyebrow justify="flex-start">{eyebrow}</Eyebrow>
      ) : (
        <SektionsEyebrow>{eyebrow}</SektionsEyebrow>
      )}
      <Heading
        as="h2"
        id={id}
        fontSize="clamp(30px, 4.6vw, 52px)"
        fontWeight={700}
        lineHeight={1.08}
        letterSpacing="-0.025em"
        color="var(--cc-text)"
        overflowWrap="break-word"
      >
        {headline}
      </Heading>
      {sublines?.length ? (
        <Stack spacing={1}>
          {sublines.map((zeile) => (
            <Text key={zeile} fontSize={{ base: "16px", md: "17px" }} lineHeight={1.6} color="var(--cc-text-2)">
              {zeile}
            </Text>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );

  if (!merksatz?.length) return <Reveal>{kopf}</Reveal>;

  return (
    <Reveal>
      <Grid
        templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) auto" }}
        gap={{ base: 8, lg: 12 }}
        alignItems="start"
      >
        {kopf}
        <Merksatz zeilen={merksatz} />
      </Grid>
    </Reveal>
  );
}

/**
 * Einheitlicher Rahmen aller Abschnitte: gleiche Breite, gleicher Rhythmus.
 *
 * `scrollMarginTop` ist kein Detail: Die Kopfleiste klebt oben, und ohne den
 * Abstand landet jede Sprungmarke aus der Navigation genau darunter — der
 * Besucher klickt „Preis" und sieht die Mitte des Abschnitts.
 */
export function Sektion({ id, children, ...rest }: BoxProps & { id?: string }) {
  return (
    <Box
      as="section"
      id={id}
      w="100%"
      py={{ base: 16, md: 24 }}
      px={{ base: 4, md: 8, lg: 12 }}
      scrollMarginTop={{ base: "80px", md: "96px" }}
      {...rest}
    >
      <Box maxW="1180px" mx="auto">
        {children}
      </Box>
    </Box>
  );
}

/**
 * Der Schnitt der Hauptaktion — Maße, Größe, Sperrung.
 *
 * Steht getrennt von `GoldCta`, weil die Hauptaktion auf dieser Seite in zwei
 * Formen vorkommt: als Anker in die Kasse (`GoldCta`) und als Knopf, der das
 * Beitritts-Modal öffnet (`BeitrittCta` in `BeitrittModal.tsx`). Beide müssen
 * gleich aussehen — sie stehen auf derselben Seite und tragen dieselbe
 * Beschriftung.
 *
 * Die Trennung verläuft hier und nicht andersherum: `membership-ui.tsx` darf
 * nichts aus `BeitrittModal.tsx` holen, sonst schließt sich der Importkreis
 * (das Modal braucht diesen Schnitt).
 */
export const goldCtaSchnitt = {
  variant: "gold",
  h: { base: "52px", md: "56px" },
  px: { base: 7, md: 9 },
  fontSize: { base: "16px", md: "17px" },
  letterSpacing: "0.01em",
} as const;

/**
 * Die Hauptaktion als Weg in die Kasse.
 *
 * **Immer ein bares `<a href>`, niemals `next/link`.** Der Router holt interne
 * Ziele vorsorglich ab, sobald sie ins Bild kommen — und `/go/<plan>` legt bei
 * jedem Aufruf eine echte Stripe-Kasse an. Aus drei Preiskarten im Viewport
 * würden so drei leere Kassen, ohne dass jemand geklickt hat. `Button as="a"`
 * rendert genau einen gewöhnlichen Anker.
 *
 * Seit 09/2026 nur noch im Angebots-Abschnitt: Dort ist die Laufzeit über den
 * Preiskarten direkt darüber schon gewählt. Überall sonst steht `BeitrittCta`,
 * weil ein Knopf im Kopfbereich nicht wissen kann, welche der drei Laufzeiten
 * jemand will.
 */
export function GoldCta({ href = ctaAnker, children = ctaLabel, ...rest }: ButtonProps & { href?: string }) {
  return (
    <Button as="a" href={href} {...goldCtaSchnitt} {...rest}>
      {children}
    </Button>
  );
}

/** „5,0 ★ · 21 Bewertungen" — steht unter jeder Hauptaktion. */
export function SterneZeile({
  bewertungen,
  justify = "center",
}: {
  bewertungen: Bewertungsspiegel;
  justify?: "center" | "flex-start";
}) {
  // Ohne echte Bewertungen steht hier nichts. Eine erfundene Sternezahl neben
  // einer Liste, die sie nicht hergibt, kostet mehr Glaubwuerdigkeit als eine
  // fehlende Zeile — siehe `lib/landing-reviews.ts`.
  if (!bewertungen) return null;

  const wort = bewertungen.anzahl === 1 ? "Bewertung" : "Bewertungen";

  return (
    <Flex align="center" justify={justify} gap={2} fontSize="15px" color="var(--cc-text-2)">
      <Text as="span" className="cc-num" color="var(--cc-text)" fontWeight={500}>
        {bewertungen.schnitt}
      </Text>
      <Box as="span" aria-hidden color="var(--cc-gold-light)" fontSize="14px">
        ★
      </Box>
      <Box as="span" aria-hidden color="var(--cc-text-3)">
        ·
      </Box>
      <Text as="span">
        <Box as="span" className="cc-num">
          {bewertungen.anzahl}
        </Box>{" "}
        {wort}
      </Text>
    </Flex>
  );
}

/**
 * Die Lichtschiene am linken Rand, wie in den Kunden-Mockups: eine Haarlinie,
 * die zur Mitte hin golden wird, mit einem wandernden Funken. Dieselbe Geste
 * wie an der Sidebar im Mitgliederbereich — sie verbindet Marketing und
 * Plattform zu einem Himmel.
 *
 * Ab `lg`, weil auf schmalen Bildschirmen keine Kante frei bleibt.
 */
export function LichtSchiene() {
  return (
    <Box
      aria-hidden
      display={{ base: "none", lg: "block" }}
      position="absolute"
      top={0}
      bottom={0}
      left="42px"
      w="1px"
      pointerEvents="none"
      bg="linear-gradient(180deg, transparent 0%, rgba(212, 176, 128, 0.28) 18%, rgba(212, 176, 128, 0.28) 82%, transparent 100%)"
    >
      <Box
        className="cc-spark"
        position="absolute"
        left="-2px"
        w="5px"
        h="5px"
        borderRadius="full"
        bg="var(--cc-gold-light)"
        boxShadow="0 0 12px rgba(232, 192, 148, 0.9)"
      />
    </Box>
  );
}
