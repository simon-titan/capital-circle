"use client";

import { Box, Flex, Grid, Heading, Stack, Text } from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { FaqSection } from "@/components/landing/membership/FaqSection";
import { Sektion, SektionsKopf } from "@/components/landing/membership/membership-ui";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { fusszeile } from "@/config/call-funnel";
import { landing, landingVideo, registrierung } from "@/config/training";
import { merkeHerkunft } from "@/lib/training/herkunft";
import { FunnelFooter } from "../DiscordFunnelChrome";
import { FunnelKopfleiste, MobilAktionsleiste, SchrittMarke, VideoSchein } from "../funnel-rahmen";
import { GoldGlowDivider } from "../GoldGlowDivider";
import { heroRise, Reveal } from "../landing-ui";
import { akzentGold } from "../call/call-ui";
import { CommunityEinblicke } from "./CommunityEinblicke";
import { TrainingRegistrierungProvider, TrainingStartKnopf } from "./TrainingRegistrierung";

/**
 * `/training` — Landingpage des kostenlosen Trainings (Board, Spalte 2).
 *
 * Im Look der Verkaufsseite `/`: klebende Kopfleiste, linksbündige
 * Abschnittsköpfe, Gold-Lichtlinien zwischen den Abschnitten, mobile
 * Aktionsleiste.
 *
 * Reihenfolge nach Emres Feedback (08.11.2026): Hero (Headline, Video, Knopf,
 * „100 % kostenlos. Nicht für jeden zugänglich.") → Ergebnisse aus der
 * Community (alle Nachweise, ohne Filter) → So erhältst du Zugang → FAQ. Die
 * Bewertungen und der Schluss-CTA sind seit 14.11.2026 raus, ebenso Hero-Pill,
 * -Punkte und Sterne. Jede Hauptaktion öffnet dasselbe
 * Bewerbungs-Modal. Texte in `config/training.ts` → `landing`.
 *
 * **Smaragd** ist hier zweiter Akzent neben Gold (Feedback 14.11.2026):
 * Bewerbungsknöpfe im Inhalt (Variante `smaragd`), Weg-Linie und
 * Freischaltungs-Karte im Zugang, Ausklapp-Knopf der Ergebnisse,
 * Bewerbungs-Modal. Gold bleibt in den Headlines und am Knopf der Kopfleiste
 * (Desktop); der Hinweis unter den Knöpfen steht in Weiß. Gilt nur für den Funnel, nicht für Plattform oder `/`.
 *
 * Den Seitengrund (`FunnelHimmel`) legt `app/training/page.tsx` darum.
 */

/**
 * `video` kommt aus dem Admin (`ladeFunnelVideos` in `lib/funnel-videos.ts`,
 * von der Seite geladen); ohne Angabe gilt `landingVideo` aus der Config.
 */
export function TrainingLanding({ video = landingVideo }: { video?: { uid: string; posterSekunde: number } }) {
  useEffect(() => {
    // Herkunft (YouTube, Instagram, …) für die Registrierung merken.
    merkeHerkunft();
  }, []);

  return (
    <TrainingRegistrierungProvider>
        <FunnelKopfleiste
          anker={landing.nav}
          aktion={
            // Kopfleiste (Desktop) in Gold, die Bewerbungsknöpfe im Inhalt in Smaragd (Feedback 14.11.2026).
            <TrainingStartKnopf variant="gold" w="auto" minH="40px" h="40px" px={5} fontSize="15px" whiteSpace="nowrap" rightIcon={undefined}>
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

          <Hero video={video} />

          <Box pt={{ base: 16, md: 24 }}>
            <GoldGlowDivider />
          </Box>
          <CommunityEinblicke />
          <GoldGlowDivider />
          <Zugang />
          <GoldGlowDivider />
          <FaqSection inhalt={{ ...landing.faq, headline: akzentGold(landing.faq.headline) }} />
        </Box>

        <FunnelFooter>{fusszeile}</FunnelFooter>

        <MobilAktionsleiste hinweis={landing.mobilHinweis} hinweisFarbe="var(--cc-text)">
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

/** Knopf und darunter klein in Weiß „100 % kostenlos. Nicht für jeden zugänglich." */
function Bewerbungsaktion() {
  return (
    <Stack spacing={3} align="center" w={{ base: "full", sm: "auto" }}>
      <TrainingStartKnopf />
      <Text fontSize={{ base: "13px", md: "14px" }} fontWeight={500} color="var(--cc-text)" textAlign="center">
        {landing.hero.hinweis}
      </Text>
    </Stack>
  );
}

/** Nach Emres Mockup: Headline, Video, Knopf, Hinweis — nichts dazwischen. */
function Hero({ video }: { video: { uid: string; posterSekunde: number } }) {
  const h = landing.hero;
  const basis = STREAM_SUBDOMAIN ? `https://${STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}` : null;

  return (
    <Box
      as="section"
      id="hero"
      aria-labelledby="training-titel"
      position="relative"
      pt={{ base: 8, md: 14 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <Stack maxW="1180px" mx="auto" spacing={{ base: 7, md: 10 }} align="center" textAlign="center">
        <Heading
          as="h1"
          id="training-titel"
          {...heroRise(0)}
          maxW="980px"
          fontSize="clamp(30px, 5.4vw, 58px)"
          fontWeight={700}
          lineHeight={1.1}
          letterSpacing="-0.03em"
          color="var(--cc-text)"
          overflowWrap="break-word"
          style={{ ...heroRise(0).style, textWrap: "balance" }}
        >
          {akzentGold(h.headline)}
        </Heading>

        {basis ? (
          <Box {...heroRise(1)} w="full" maxW="960px" textAlign="left">
            <VideoSchein ton="neutral">
              <GlassVideoPlayer
                accentRgb="255, 255, 255"
                src={`${basis}/manifest/video.m3u8`}
                poster={`${basis}/thumbnails/thumbnail.jpg?time=${video.posterSekunde}s&width=1280`}
              />
            </VideoSchein>
          </Box>
        ) : null}

        <Box {...heroRise(2)} w={{ base: "full", sm: "auto" }}>
          <Bewerbungsaktion />
        </Box>
      </Stack>
    </Box>
  );
}

/* ─────────────────────────── So erhältst du Zugang ─────────────────────────── */

/**
 * Drei Schritte als Grafik: Bewerben → Prüfung → Freischaltung. Je Karte die
 * Nummer mit Gold-Marke (wie der Prozess auf `/`) und ein Satz. Eine
 * Lichtlinie verbindet die Karten zu einem Weg — waagerecht ab `md`, mobil
 * senkrecht hinter dem Stapel.
 */
function Zugang() {
  const z = landing.zugang;
  return (
    <Sektion id="zugang" aria-labelledby="zugang-titel">
      <SektionsKopf id="zugang-titel" eyebrow={z.eyebrow} headline={akzentGold(z.headline)} />
      <Box position="relative" mt={{ base: 10, md: 14 }}>
        <Box
          aria-hidden
          display={{ base: "none", md: "block" }}
          position="absolute"
          top="50%"
          left="6%"
          right="6%"
          h="1px"
          bg="linear-gradient(90deg, transparent, rgba(111, 208, 166, 0.45) 18%, rgba(111, 208, 166, 0.45) 82%, transparent)"
        />
        <Box
          aria-hidden
          display={{ base: "block", md: "none" }}
          position="absolute"
          top="4%"
          bottom="4%"
          left="50%"
          w="1px"
          bg="linear-gradient(180deg, transparent, rgba(111, 208, 166, 0.4) 15%, rgba(111, 208, 166, 0.4) 85%, transparent)"
        />
        <Grid
          as="ol"
          listStyleType="none"
          position="relative"
          templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
          gap={{ base: 4, md: 5 }}
        >
          {z.schritte.map((s, i) => {
            // Der letzte Schritt (Freischaltung) steht in Smaragd — das Ziel des Wegs.
            const ziel = i === z.schritte.length - 1;
            return (
            <Reveal as="li" key={s.marke} delay={i * 90} display="flex">
              <Stack className={ziel ? "cc-card cc-card--smaragd" : "cc-card"} p={{ base: 6, md: 7 }} spacing={4} w="full">
                <SchrittMarke nummer={String(i + 1).padStart(2, "0")} marke={s.marke} ton={ziel ? "smaragd" : "gold"} />
                <Text fontSize={{ base: "16px", md: "17px" }} lineHeight={1.6} color={ziel ? "var(--cc-text)" : "var(--cc-text-soft)"}>
                  {s.text}
                </Text>
              </Stack>
            </Reveal>
            );
          })}
        </Grid>
      </Box>
      <Reveal delay={200}>
        <Flex justify="center" mt={{ base: 10, md: 12 }}>
          <Bewerbungsaktion />
        </Flex>
      </Reveal>
    </Sektion>
  );
}
