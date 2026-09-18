"use client";

import { Box, Flex, Grid, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { angebot, ctaLabel, preiskarten, type Preiskarte } from "@/config/landing-membership";
import type { MembershipPlan } from "@/lib/stripe/plan-map";
import { Reveal } from "../landing-ui";
import { GoldCta, Sektion, SektionsKopf } from "./membership-ui";

/**
 * Leistung und Preis.
 *
 * ── Warum die Karten eine Auswahl sind und kein Link je Karte ──────────────
 * Im Kunden-Mockup stehen drei Preiskarten und darunter genau ein Knopf. Das
 * ist die richtige Reihenfolge: erst entscheiden, dann handeln. Drei Knöpfe
 * nebeneinander würden die Entscheidung in den Moment des Klicks verschieben,
 * und der teuerste Plan säße gleichberechtigt neben dem günstigsten.
 *
 * Voreingestellt ist die vierteljährliche Laufzeit — dieselbe, die das Mockup
 * als „beliebteste Wahl" markiert. Wer nichts anfasst, kauft also das, was die
 * Seite empfiehlt.
 *
 * ── Warum der Knopf ein bares `<a>` ist ────────────────────────────────────
 * Sein Ziel `/go/<plan>` legt bei jedem Aufruf eine echte Stripe-Kasse an.
 * Über `next/link` würde der Router das Ziel vorsorglich abrufen, sobald der
 * Abschnitt ins Bild kommt — eine Kasse ohne Klick, bei jedem Besucher. Siehe
 * `lib/checkout/vorabruf.ts`.
 */
export function AngebotSection() {
  const [gewaehlt, setGewaehlt] = useState<MembershipPlan>(
    preiskarten.find((k) => k.beliebt)?.plan ?? preiskarten[0].plan,
  );

  /**
   * `/go/<plan>` legt serverseitig eine Stripe-Session an, bevor es
   * weiterleitet — dazwischen liegen je nach Verbindung 0,3 bis 1,5 Sekunden,
   * in denen ohne diesen Zustand sichtbar nichts passiert. Wer dann ein
   * zweites Mal tippt, erzeugt eine zweite Kasse.
   */
  const [oeffnet, setOeffnet] = useState(false);

  /**
   * Zuruecksetzen, wenn der Besucher aus der Kasse zurueckkommt. Der Browser
   * holt die Seite dann aus dem Vor-/Zurueck-Cache statt sie neu zu bauen —
   * ohne das bliebe der Knopf fuer immer auf „wird geoeffnet" stehen.
   */
  useEffect(() => {
    const zurueck = (e: PageTransitionEvent) => {
      if (e.persisted) setOeffnet(false);
    };
    window.addEventListener("pageshow", zurueck);
    return () => window.removeEventListener("pageshow", zurueck);
  }, []);

  return (
    <Sektion id="angebot" aria-labelledby="angebot-titel">
      <SektionsKopf eyebrow={angebot.eyebrow} headline={angebot.headline} id="angebot-titel" />

      {/* ── Drei Spalten Leistung ──────────────────────────────────────── */}
      <Grid
        mt={{ base: 10, md: 14 }}
        templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
        gap={{ base: 8, md: 10 }}
      >
        {angebot.spalten.map((spalte, i) => (
          <Reveal key={spalte.titel} delay={i * 70}>
            <Stack spacing={5}>
              <Heading as="h3" fontSize={{ base: "22px", md: "26px" }} fontWeight={600} letterSpacing="-0.02em">
                {spalte.titel}
              </Heading>
              <Stack as="ul" listStyleType="none" spacing={4}>
                {spalte.punkte.map((punkt) => (
                  <Flex as="li" key={punkt.stark} gap={3} align="flex-start">
                    <Box
                      aria-hidden
                      flexShrink={0}
                      mt="11px"
                      w="14px"
                      h="1px"
                      bg="var(--cc-gold)"
                      boxShadow="0 0 8px rgba(212, 176, 128, 0.5)"
                    />
                    <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.6} color="var(--cc-text-2)">
                      <Box as="span" color="var(--cc-text)" fontWeight={500}>
                        {punkt.stark}
                      </Box>{" "}
                      {punkt.rest}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            </Stack>
          </Reveal>
        ))}
      </Grid>

      {/* ── Abgrenzung ─────────────────────────────────────────────────── */}
      <Reveal delay={200}>
        <Stack align="center" spacing={6} mt={{ base: 12, md: 16 }}>
          <Box
            aria-hidden
            w="100%"
            maxW="360px"
            h="1px"
            bg="linear-gradient(90deg, transparent, var(--cc-line-strong), transparent)"
          />
          <Text fontSize={{ base: "15px", md: "17px" }} color="var(--cc-text-2)" textAlign="center" maxW="640px">
            {angebot.abgrenzung}
          </Text>
        </Stack>
      </Reveal>

      {/* ── Preiskarten ────────────────────────────────────────────────── */}
      <Reveal delay={260}>
        <Grid
          role="radiogroup"
          aria-label="Laufzeit wählen"
          mt={{ base: 10, md: 14 }}
          templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
          gap={5}
        >
          {preiskarten.map((karte) => (
            <PreisKarte
              key={karte.plan}
              karte={karte}
              aktiv={gewaehlt === karte.plan}
              onWaehlen={() => setGewaehlt(karte.plan)}
            />
          ))}
        </Grid>
      </Reveal>

      {/* ── Aktion ─────────────────────────────────────────────────────── */}
      <Reveal delay={320}>
        <Stack align="center" spacing={4} mt={{ base: 10, md: 12 }}>
          <GoldCta
            href={`/go/${gewaehlt}?src=angebot`}
            minW={{ base: "100%", sm: "320px" }}
            aria-busy={oeffnet}
            aria-disabled={oeffnet}
            opacity={oeffnet ? 0.8 : 1}
            cursor={oeffnet ? "progress" : undefined}
            onClick={(e) => {
              // Der Anker navigiert selbst; hier wird nur der zweite Klick
              // abgefangen und der Zustand sichtbar gemacht.
              if (oeffnet) {
                e.preventDefault();
                return;
              }
              setOeffnet(true);
            }}
          >
            {oeffnet ? "Kasse wird geöffnet …" : ctaLabel}
          </GoldCta>
          {/*
            Aus der gewaehlten Karte abgeleitet, nicht fest verdrahtet: Unter
            diesem Knopf kauft man auch Quartal und Jahr, und dort gilt
            „monatlich kuendbar" nicht — die eigene FAQ sagt zwei Abschnitte
            weiter das Gegenteil. Eine Zusicherung, die beim ersten
            Kuendigungsversuch auffliegt, ist an der teuersten Stelle der Seite
            der schlechteste Satz.
          */}
          <Text fontSize="14px" color="var(--cc-text-3)">
            {preiskarten.find((k) => k.plan === gewaehlt)?.bindung ?? angebot.feinabdruck} · Sofortiger Zugang
          </Text>
        </Stack>
      </Reveal>
    </Sektion>
  );
}

/**
 * Eine Laufzeit zur Auswahl.
 *
 * `role="radio"` statt eines Knopfes: Für den Screenreader ist das genau das,
 * was es ist — eine Auswahl aus dreien, von denen eine gesetzt ist. Ein
 * `<button>` würde drei unabhängige Aktionen ansagen und verschweigen, welche
 * gerade gilt.
 */
function PreisKarte({
  karte,
  aktiv,
  onWaehlen,
}: {
  karte: Preiskarte;
  aktiv: boolean;
  onWaehlen: () => void;
}) {
  return (
    <Stack
      role="radio"
      aria-checked={aktiv}
      tabIndex={0}
      onClick={onWaehlen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onWaehlen();
        }
      }}
      className={aktiv ? "cc-card cc-card--hero" : "cc-card"}
      p={{ base: 6, md: 7 }}
      spacing={4}
      align="center"
      textAlign="center"
      cursor="pointer"
      userSelect="none"
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "3px" }}
    >
      <Text
        fontSize="12px"
        fontWeight={500}
        letterSpacing="0.16em"
        textTransform="uppercase"
        color={aktiv ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
      >
        {karte.laufzeit}
      </Text>

      <Text
        className="cc-num"
        fontSize={{ base: "42px", md: "50px" }}
        fontWeight={600}
        lineHeight={1}
        letterSpacing="-0.03em"
        color="var(--cc-text)"
      >
        {karte.preis}
      </Text>

      <Text fontSize="15px" color="var(--cc-text-2)">
        {karte.periode}
      </Text>

      <Text className="cc-num" fontSize="13px" color="var(--cc-text-3)">
        {karte.hinweis}
      </Text>

      {karte.beliebt ? (
        <HStack spacing={2} pt={1}>
          <Box
            aria-hidden
            w="6px"
            h="6px"
            borderRadius="full"
            bg="var(--cc-gold-light)"
            boxShadow="0 0 10px rgba(232, 192, 148, 0.8)"
          />
          <Text fontSize="11px" fontWeight={600} letterSpacing="0.16em" textTransform="uppercase" color="var(--cc-gold-light)">
            Beliebteste Wahl
          </Text>
        </HStack>
      ) : (
        <Box h="18px" pt={1} />
      )}
    </Stack>
  );
}
