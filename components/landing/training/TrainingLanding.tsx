"use client";

import { Box, Flex, Grid, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { ErgebnisseSection } from "@/components/landing/membership/ErgebnisseSection";
import { FaqSection } from "@/components/landing/membership/FaqSection";
import { Sektion, SektionsKopf } from "@/components/landing/membership/membership-ui";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { fusszeile } from "@/config/call-funnel";
import { landing, landingVideo, registrierung } from "@/config/training";
import type { Bewertungsspiegel } from "@/lib/landing-reviews";
import { merkeHerkunft } from "@/lib/training/herkunft";
import { FunnelFooter } from "../DiscordFunnelChrome";
import {
  FunnelKopfleiste,
  HeroPill,
  MobilAktionsleiste,
  SchrittMarke,
  VideoSchein,
} from "../funnel-rahmen";
import { GoldGlowDivider } from "../GoldGlowDivider";
import { heroRise, Reveal } from "../landing-ui";
import { ReviewSection } from "../ReviewSection";
import { akzentGold } from "../call/call-ui";
import { TrainingRegistrierungProvider, TrainingStartKnopf } from "./TrainingRegistrierung";

/**
 * `/training` — Landingpage des kostenlosen Trainings (Board, Spalte 2).
 *
 * Seit 06.11.2026 im Look der Verkaufsseite `/` (Nutzerwunsch): klebende
 * Kopfleiste, zentrierter Hero (Pill, Headline, Video, Punkte, Knopf, Sterne),
 * linksbündige Abschnittsköpfe, Gold-Lichtlinien zwischen den Abschnitten,
 * dieselben Ergebnis-, Bewertungs- und FAQ-Abschnitte und die mobile
 * Aktionsleiste. Die Sektion „Das Training" (fünf Videokacheln) ist auf
 * Nutzerwunsch raus.
 *
 * Reihenfolge: Versprechen (Hero + Video) → Beweis (Auszahlungen,
 * Bewertungen) → Ablauf → Einwände (FAQ) → Abschluss.
 * Jede Hauptaktion öffnet dasselbe Registrierungs-Modal. Texte in
 * `config/training.ts`.
 *
 * Den Seitengrund (`FunnelHimmel`) legt `app/training/page.tsx` darum.
 */

/** Die Bewertungen der Verkaufsseite (Kategorie `global`). */
export const TRAINING_BEWERTUNGEN = "global";

export function TrainingLanding({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  useEffect(() => {
    // Herkunft (YouTube, Instagram, …) für die Registrierung merken.
    merkeHerkunft();
  }, []);

  return (
    <TrainingRegistrierungProvider>
        <FunnelKopfleiste
          anker={landing.nav}
          aktion={
            <TrainingStartKnopf w="auto" minH="40px" h="40px" px={5} fontSize="15px" whiteSpace="nowrap" rightIcon={undefined}>
              {landing.ctaKurz}
            </TrainingStartKnopf>
          }
          menueAktion={
            <TrainingStartKnopf w="full" minH="48px" fontSize="16px">
              {landing.ctaKurz}
            </TrainingStartKnopf>
          }
        />

        <Box as="main">
          {/* `?fehler=` im Client in einer Suspense-Grenze — so bleibt die Seite statisch. */}
          <Suspense fallback={null}>
            <LinkAbgelaufen />
          </Suspense>

          <Hero bewertungen={bewertungen} />

          <Box pt={{ base: 16, md: 24 }}>
            <GoldGlowDivider />
          </Box>
          <ErgebnisseSection />
          <GoldGlowDivider />
          <ReviewSection landingSlug={TRAINING_BEWERTUNGEN} />
          <GoldGlowDivider />
          <Ablauf />
          <GoldGlowDivider />
          <FaqSection inhalt={{ ...landing.faq, headline: akzentGold(landing.faq.headline) }} />
          <GoldGlowDivider />
          <Abschluss bewertungen={bewertungen} />
        </Box>

        <FunnelFooter>{fusszeile}</FunnelFooter>

        <MobilAktionsleiste hinweis={landing.mobilHinweis} ausblendenBei={["abschluss"]}>
          {(tabIndex) => (
            <TrainingStartKnopf w="full" minH="52px" fontSize="16px" tabIndex={tabIndex}>
              {landing.hero.cta}
            </TrainingStartKnopf>
          )}
        </MobilAktionsleiste>
    </TrainingRegistrierungProvider>
  );
}

function LinkAbgelaufen() {
  const t = registrierung.linkAbgelaufen;
  if (useSearchParams().get("fehler") !== "link_abgelaufen") return null;
  return (
    <Box px={{ base: 4, md: 8, lg: 12 }} pt={4} position="relative" zIndex={3}>
      <Flex
        role="alert"
        maxW="1180px"
        mx="auto"
        className="cc-card cc-card--still"
        p={{ base: 4, md: 5 }}
        gap={4}
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
      >
        <Box>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
            {t.titel}
          </Text>
          <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
            {t.text}
          </Text>
        </Box>
        <TrainingStartKnopf size="sm" minH="44px" fontSize="15px" w={{ base: "full", md: "auto" }}>
          {t.knopf}
        </TrainingStartKnopf>
      </Flex>
    </Box>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

/**
 * Emres Funnel-Video (`landingVideo`) ist unsigniert: Die Seite ist statisch,
 * ein Token liefe ab. Ohne Stream-Subdomain (lokal ohne .env) entfällt es.
 */
const STREAM_SUBDOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim() || null;

function Hero({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  const h = landing.hero;
  const basis = STREAM_SUBDOMAIN ? `https://${STREAM_SUBDOMAIN}.cloudflarestream.com/${landingVideo.uid}` : null;

  return (
    <Box
      as="section"
      aria-labelledby="training-titel"
      position="relative"
      pt={{ base: 10, md: 16 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <Stack maxW="1180px" mx="auto" spacing={{ base: 8, md: 10 }} align="center" textAlign="center">
        <Box {...heroRise(0)}>
          <HeroPill>{h.eyebrow}</HeroPill>
        </Box>

        <Heading
          as="h1"
          id="training-titel"
          {...heroRise(1)}
          maxW="980px"
          fontSize="clamp(32px, 5.6vw, 60px)"
          fontWeight={700}
          lineHeight={1.08}
          letterSpacing="-0.03em"
          color="var(--cc-text)"
          overflowWrap="break-word"
          style={{ ...heroRise(1).style, textWrap: "balance" }}
        >
          {akzentGold(h.headline)}
        </Heading>

        {/* Das Video steht seit 06.11.2026 direkt unter der Headline (Nutzerwunsch), ohne Badge darüber. */}
        {basis ? (
          <Box {...heroRise(2)} w="full" maxW="960px" textAlign="left">
            <VideoSchein>
              <GlassVideoPlayer
                src={`${basis}/manifest/video.m3u8`}
                poster={`${basis}/thumbnails/thumbnail.jpg?time=${landingVideo.posterSekunde}s&width=1280`}
              />
            </VideoSchein>
          </Box>
        ) : null}

        <Flex
          {...heroRise(3)}
          as="ul"
          listStyleType="none"
          wrap="wrap"
          justify="center"
          columnGap={{ base: 5, md: 7 }}
          rowGap={2}
        >
          {h.punkte.map((p) => (
            <HStack as="li" key={p} spacing={2}>
              <Box color="var(--cc-gold-light)" flexShrink={0}>
                <Check size={17} strokeWidth={2.25} aria-hidden />
              </Box>
              <Text fontSize={{ base: "15px", md: "17px" }} color="var(--cc-text-soft)">
                {p}
              </Text>
            </HStack>
          ))}
        </Flex>

        <Stack {...heroRise(4)} spacing={5} align="center" w={{ base: "full", sm: "auto" }}>
          <TrainingStartKnopf />
          <Sterne bewertungen={bewertungen} />
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * Nur die Sterne, ohne Schnitt und Anzahl (Nutzerwunsch 06.11.2026). Die Zahl
 * der Sterne kommt trotzdem aus den echten Bewertungen (gerundeter Schnitt) —
 * ohne Bewertungen steht hier nichts.
 */
function Sterne({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  if (!bewertungen) return null;
  const anzahl = Math.round(Number(bewertungen.schnitt.replace(",", ".")));
  if (!Number.isFinite(anzahl) || anzahl < 1) return null;
  return (
    <HStack spacing={1} role="img" aria-label={`${bewertungen.schnitt} von 5 Sternen`} color="var(--cc-gold-light)" fontSize="18px" lineHeight={1}>
      {Array.from({ length: Math.min(anzahl, 5) }, (_, i) => (
        <Box as="span" key={i} aria-hidden>
          ★
        </Box>
      ))}
    </HStack>
  );
}

/* ─────────────────────────── Ablauf ─────────────────────────── */

/**
 * Drei Schritte als Karten: Nummer mit Gold-Marke (wie der Prozess auf `/`),
 * Titel, ein Satz, unten hinter einer Haarlinie die Kurzform mit Haken. Ab `md`
 * verbindet eine Lichtlinie die Karten zu einem Weg. Der Knopf darunter holt
 * den Leser dort ab, wo er gerade verstanden hat, wie wenig es braucht.
 */
function Ablauf() {
  const a = landing.ablauf;
  return (
    <Sektion id="ablauf" aria-labelledby="ablauf-titel">
      <SektionsKopf id="ablauf-titel" eyebrow={a.eyebrow} headline={akzentGold(a.headline)} sublines={a.sublines} />
      <Box position="relative" mt={{ base: 10, md: 14 }}>
        <Box
          aria-hidden
          display={{ base: "none", md: "block" }}
          position="absolute"
          top="58px"
          left="8%"
          right="8%"
          h="1px"
          bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.45) 20%, rgba(232, 192, 148, 0.45) 80%, transparent)"
        />
        <Grid
          as="ol"
          listStyleType="none"
          position="relative"
          templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
          gap={{ base: 4, md: 5 }}
        >
          {a.schritte.map((s, i) => (
            <Reveal as="li" key={s.titel} delay={i * 80} display="flex">
              <Stack className="cc-card" p={{ base: 6, md: 7 }} spacing={5} w="full">
                <SchrittMarke nummer={String(i + 1).padStart(2, "0")} marke={s.marke} as="p" />
                <Stack spacing={2} flex={1}>
                  <Text as="h3" fontSize={{ base: "19px", md: "21px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
                    {s.titel}
                  </Text>
                  <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.65} color="var(--cc-text-2)">
                    {s.text}
                  </Text>
                </Stack>
                <HStack spacing={2} pt={4} borderTop="1px solid var(--cc-line)">
                  <Box color="var(--cc-gold-light)" flexShrink={0}>
                    <Check size={16} strokeWidth={2.25} aria-hidden />
                  </Box>
                  <Text fontSize="14px" fontWeight={500} color="var(--cc-text-soft)">
                    {s.kurz}
                  </Text>
                </HStack>
              </Stack>
            </Reveal>
          ))}
        </Grid>
      </Box>
      <Reveal delay={200}>
        <Flex justify="center" mt={{ base: 10, md: 12 }}>
          <TrainingStartKnopf />
        </Flex>
      </Reveal>
    </Sektion>
  );
}

/* ─────────────────────────── Abschluss ─────────────────────────── */

function Abschluss({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  const a = landing.abschluss;
  return (
    <Sektion id="abschluss" py={{ base: 20, md: 32 }}>
      <Reveal>
        <Stack spacing={{ base: 8, md: 10 }} align="center" textAlign="center">
          <Heading
            as="h2"
            fontSize="clamp(30px, 5.2vw, 58px)"
            fontWeight={700}
            lineHeight={1.08}
            letterSpacing="-0.03em"
            color="var(--cc-text)"
            maxW="900px"
          >
            {akzentGold(a.headline)}
            <Box as="span" display="block">
              {akzentGold(a.zeile2)}
            </Box>
          </Heading>
          <Stack spacing={5} align="center" w={{ base: "full", sm: "auto" }}>
            <TrainingStartKnopf />
            <Sterne bewertungen={bewertungen} />
          </Stack>
        </Stack>
      </Reveal>
    </Sektion>
  );
}
