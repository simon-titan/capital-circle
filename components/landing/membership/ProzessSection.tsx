"use client";

import { Box, Flex, Grid, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { prozess } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { BeitrittCta } from "./BeitrittModal";
import { Sektion, SektionsEyebrow } from "./membership-ui";

/**
 * Lernen → Anwenden → Reviewen.
 *
 * ── Warum dieser Abschnitt hier steht ──────────────────────────────────────
 * Die Seite belegt vorher, *dass* etwas funktioniert (Auszahlungen,
 * Bewertungen) und grenzt danach ab, *wovon* es sich unterscheidet
 * (Vergleich). Dazwischen fehlte die Antwort auf die Frage, die ein Besucher
 * an genau dieser Stelle stellt: „Und wie läuft das konkret ab?" Der Nav-Punkt
 * „Ablauf" zeigt seit 09/2026 hierher statt auf die Vergleichstabelle.
 *
 * ── Zwei Nachbauten, ein Screenshot ────────────────────────────────────────
 * 01 und 03 sind Markup (wie `PlattformVorschau`): Sie altern mit dem
 * Designsystem statt gegen es und bleiben auf jedem Display scharf. 02 ist ein
 * echter Screenshot aus einer Live-Session — den ließe sich nicht nachbauen,
 * ohne genau das zu verlieren, was ihn glaubwürdig macht: dass dort echte
 * Menschen mit Namen im Raum sitzen.
 *
 * ── Warum Container-Queries ────────────────────────────────────────────────
 * Die beiden Nachbauten rechnen ihre Größen in `cqw`, also in Prozent der
 * Kachelbreite. In festen Pixeln wäre die Vorschau auf einem 1440er-Bildschirm
 * stimmig und in der dreispaltigen Ansicht bei 1024px ein Gedränge aus
 * abgeschnittenen Zeilen — es sind Maßstabsmodelle, keine Layouts.
 */

/** Zwei Zeilen Rahmen: gesperrte Nummer, Lichtstrich, Marke in Gold. */
function SchrittKopf({ nummer, marke }: { nummer: string; marke: string }) {
  return (
    <HStack spacing={{ base: 3, md: 4 }} align="center">
      <Text
        className="cc-num"
        fontSize={{ base: "30px", md: "38px" }}
        fontWeight={600}
        lineHeight={1}
        letterSpacing="-0.02em"
        color="var(--cc-text-3)"
        opacity={0.6}
        aria-hidden
      >
        {nummer}
      </Text>
      <Box
        aria-hidden
        w={{ base: "28px", md: "44px" }}
        h="1px"
        flexShrink={0}
        bg="linear-gradient(90deg, transparent, var(--cc-gold-line))"
      />
      <Text
        as="h3"
        fontSize={{ base: "12px", md: "13px" }}
        fontWeight={600}
        letterSpacing="0.22em"
        textTransform="uppercase"
        color="var(--cc-gold-light)"
      >
        {marke}
      </Text>
    </HStack>
  );
}

/**
 * Rahmen jeder Vorschau: Glas-Karte, 3:2, Container für die `cqw`-Maße darin.
 *
 * `dekorativ` schaltet `aria-hidden`. Die beiden Nachbauten sind erfundene
 * Zahlen und gehören nicht in den Vorlesefluss; der Screenshot dagegen trägt
 * eine echte Bildbeschreibung und bleibt hörbar.
 */
function VorschauKachel({ children, dekorativ = false }: { children: ReactNode; dekorativ?: boolean }) {
  return (
    <Box className="cc-card cc-card--still" p={{ base: 2, md: 2.5 }} overflow="hidden">
      <Box
        aria-hidden={dekorativ || undefined}
        position="relative"
        w="100%"
        borderRadius="10px"
        overflow="hidden"
        bg="linear-gradient(180deg, rgba(16, 20, 25, 0.9), rgba(13, 17, 21, 0.9))"
        border="1px solid var(--cc-line)"
        sx={{ aspectRatio: "3 / 2", containerType: "inline-size" }}
      >
        {children}
      </Box>
    </Box>
  );
}

/**
 * 01 — die Lektionsansicht des Instituts als Nachbau.
 *
 * Anders als 02 und 03 bleibt hier die Kachel ein Nachbau: Der Schritt heisst
 * „Lernen", und was ihn traegt, ist der **Aufbau** — links der Lernpfad, rechts
 * die Lektion. Ein Vollbild-Screenshot zeigte davon nur einen Ausschnitt.
 * In der Videovorschau steckt dafuer eine echte Aufnahme aus dem Unterricht.
 *
 * Masse in `cqw` (Container-Queries): Die Kachel ist ein Massstabsmodell, ihre
 * Innenmasse skalieren mit der Spaltenbreite. Wer hier etwas aendert, aendert
 * Prozent der Kachelbreite, keine Pixel.
 */
function LernenVorschau() {
  const { module, aktiv, meta, titel } = prozess.lernenVorschau;

  return (
    <Flex h="100%" w="100%">
      {/* Lernpfad */}
      <Stack
        display={{ base: "none", sm: "flex" }}
        w="34%"
        spacing="1.4cqw"
        px="3cqw"
        py="3.4cqw"
        bg="rgba(22, 26, 32, 0.6)"
        borderRight="1px solid var(--cc-line)"
        flexShrink={0}
      >
        <Text
          fontSize="2.1cqw"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="var(--cc-text-3)"
          noOfLines={1}
        >
          Capital Circle
        </Text>
        {module.map((name, i) => (
          <Text
            key={name}
            fontSize="2.6cqw"
            lineHeight={1.35}
            noOfLines={1}
            color={i === aktiv ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
            fontWeight={i === aktiv ? 500 : 400}
          >
            {name}
          </Text>
        ))}
      </Stack>

      {/* Lektion */}
      <Stack flex="1" minW={0} spacing="2cqw" px="3.4cqw" py="3.4cqw">
        <Text fontSize="2.2cqw" color="var(--cc-text-3)" noOfLines={1}>
          {meta}
        </Text>
        <Text fontSize="3.4cqw" fontWeight={600} color="var(--cc-text)" lineHeight={1.25} noOfLines={1}>
          {titel}
        </Text>

        {/* Die Videovorschau — hier steckt das echte Bild. */}
        <Box
          position="relative"
          flex="1"
          minH={0}
          borderRadius="1.6cqw"
          overflow="hidden"
          border="1px solid var(--cc-line)"
        >
          {/* Rechter Bildrand sichtbar: Das Bild wird nach links geschoben, in
              der Vorschau steht damit die rechte Chartseite statt der
              Werkzeugleiste. */}
          <Image
            src={prozess.bilder[0].pfad}
            alt={prozess.bilder[0].alt}
            fill
            sizes="(max-width: 62em) 62vw, 240px"
            style={{ objectFit: "cover", objectPosition: "right top" }}
          />
        </Box>
      </Stack>
    </Flex>
  );
}

/**
 * Alle drei Schritte tragen echte Aufnahmen aus dem Betrieb.
 *
 * `objectPosition: left top` statt mittig: Alle drei sind breite
 * Bildschirmfotos, und das, worauf es ankommt — Chart, Kennzahlen, Chat —
 * steht links oben. Ein mittiger Ausschnitt schnitte genau das weg.
 */
function SchrittBild({ index }: { index: number }) {
  const bild = prozess.bilder[index];
  return (
    <Image
      src={bild.pfad}
      alt={bild.alt}
      fill
      sizes="(max-width: 62em) 92vw, 360px"
      style={{ objectFit: "cover", objectPosition: "left top" }}
    />
  );
}

export function ProzessSection() {
  return (
    <Sektion id="ablauf" aria-labelledby="prozess-titel">
      <Reveal>
        <Stack spacing={{ base: 4, md: 5 }} align="center" textAlign="center" maxW="860px" mx="auto">
          <SektionsEyebrow>{prozess.eyebrow}</SektionsEyebrow>
          <Heading
            as="h2"
            id="prozess-titel"
            fontSize="clamp(30px, 4.6vw, 52px)"
            fontWeight={700}
            lineHeight={1.08}
            letterSpacing="-0.025em"
            color="var(--cc-text)"
            overflowWrap="break-word"
          >
            {prozess.headline}
          </Heading>
          <Stack spacing={1}>
            {prozess.sublines.map((zeile) => (
              <Text key={zeile} fontSize={{ base: "16px", md: "17px" }} lineHeight={1.6} color="var(--cc-text-2)">
                {zeile}
              </Text>
            ))}
          </Stack>
        </Stack>
      </Reveal>

      {/*
        Ab `lg` ein Raster aus drei Schritt-Spalten und zwei Pfeil-Spalten. Die
        Schritt-Hülle wird dort zu `display: contents`, damit ihre drei Teile
        (Kopf, Kachel, Text) in *derselben* Rasterzeile stehen wie die der
        Nachbarn — sonst fluchten weder die Kacheln noch die Fließtexte, sobald
        eine Überschrift zweizeilig wird. Darunter ist jede Hülle wieder ein
        gewöhnlicher Stapel mit eigenem Innenabstand.
      */}
      <Reveal delay={80}>
        <Grid
          mt={{ base: 12, md: 16 }}
          templateColumns={{ base: "1fr", lg: "1fr auto 1fr auto 1fr" }}
          templateRows={{ lg: "auto auto 1fr" }}
          columnGap={{ lg: 6 }}
          rowGap={{ base: 12, lg: 5 }}
        >
          {prozess.schritte.map((schritt, i) => {
            const spalte = 2 * i + 1;
            return (
              <Fragment key={schritt.marke}>
                {i > 0 ? (
                  <Flex
                    aria-hidden
                    display={{ base: "none", lg: "flex" }}
                    gridColumn={{ lg: `${spalte - 1}` }}
                    gridRow={{ lg: "2" }}
                    align="center"
                    justify="center"
                    color="var(--cc-gold-light)"
                    opacity={0.55}
                  >
                    <ArrowRight size={22} strokeWidth={1.5} />
                  </Flex>
                ) : null}

                <Stack display={{ base: "flex", lg: "contents" }} spacing={5}>
                  <Box gridColumn={{ lg: `${spalte}` }} gridRow={{ lg: "1" }}>
                    <SchrittKopf nummer={String(i + 1).padStart(2, "0")} marke={schritt.marke} />
                  </Box>

                  <Box gridColumn={{ lg: `${spalte}` }} gridRow={{ lg: "2" }}>
                    <VorschauKachel>
                      {i === 0 ? <LernenVorschau /> : <SchrittBild index={i} />}
                    </VorschauKachel>
                  </Box>

                  <Stack gridColumn={{ lg: `${spalte}` }} gridRow={{ lg: "3" }} spacing={3}>
                    <Text
                      fontSize={{ base: "20px", md: "22px" }}
                      fontWeight={600}
                      lineHeight={1.25}
                      letterSpacing="-0.01em"
                      color="var(--cc-text)"
                    >
                      {schritt.titel}
                    </Text>
                    <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.65} color="var(--cc-text-2)">
                      {schritt.text}
                    </Text>
                  </Stack>
                </Stack>
              </Fragment>
            );
          })}
        </Grid>
      </Reveal>

      {/* Abschlusszeile zwischen zwei Haarlinien */}
      <Reveal delay={140}>
        <Flex align="center" gap={{ base: 4, md: 6 }} mt={{ base: 12, md: 16 }}>
          <Box aria-hidden flex={1} h="1px" bg="linear-gradient(90deg, transparent, var(--cc-line-strong))" />
          <Text
            fontSize={{ base: "11px", md: "12px" }}
            fontWeight={500}
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--cc-text-2)"
            textAlign="center"
          >
            {prozess.abschluss}
          </Text>
          <Box aria-hidden flex={1} h="1px" bg="linear-gradient(90deg, var(--cc-line-strong), transparent)" />
        </Flex>
      </Reveal>

      <Reveal delay={200}>
        <Flex justify="center" mt={{ base: 10, md: 12 }}>
          <BeitrittCta />
        </Flex>
      </Reveal>
    </Sektion>
  );
}
