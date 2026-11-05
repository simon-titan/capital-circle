"use client";

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Flex,
  Grid,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Check, Lock, PlayCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { NachweisGalerie } from "@/components/landing/membership/NachweisGalerie";
import { ergebnisseAuswahl, ergebnisseKopf, fusszeile } from "@/config/call-funnel";
import { auszahlungenCommunity } from "@/config/landing-membership";
import { landing, landingVideo, registrierung, videoPlatzhalter } from "@/config/training";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { merkeHerkunft } from "@/lib/training/herkunft";
import { FunnelFooter, FunnelGround, FunnelHeroGlow, FunnelPageStyles, FunnelSplash } from "../DiscordFunnelChrome";
import { Reveal } from "../landing-ui";
import { CallSektion, CallSektionsKopf, akzentGold } from "../call/call-ui";
import { TrainingRegistrierungProvider, TrainingStartKnopf } from "./TrainingRegistrierung";

/**
 * `/training` — Landingpage des kostenlosen Trainings (Board, Spalte 2).
 *
 * Aufbau: Kopfleiste · Hero mit Einführungsvideo · Die 4 Videos · Ablauf ·
 * Ergebnisse · FAQ · Abschluss · Footer. Alle Texte in `config/training.ts`.
 * Jede Hauptaktion öffnet dasselbe Registrierungs-Modal.
 */

const COMMUNITY_AUSWAHL = ergebnisseAuswahl.community.flatMap((bild) =>
  auszahlungenCommunity.filter((a) => a.bild === bild),
);

export function TrainingLanding() {
  const [laedt, setLaedt] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLaedt(false), 300);
    // Herkunft (YouTube, Instagram, …) für die Registrierung merken.
    merkeHerkunft();
    return () => clearTimeout(t);
  }, []);

  return (
    <TrainingRegistrierungProvider>
      <FunnelSplash visible={laedt} />
      <FunnelPageStyles />
      <FunnelGround>
        <Kopfleiste />
        {/* `?fehler=` im Client in einer Suspense-Grenze — so bleibt die Seite statisch. */}
        <Suspense fallback={null}>
          <LinkAbgelaufen />
        </Suspense>
        <Hero />
        <Videos />
        <Ablauf />
        <Ergebnisse />
        <Faq />
        <CallSektion id="abschluss" labelledBy="abschluss-titel">
          <Stack spacing={{ base: 8, md: 10 }} align="center">
            <CallSektionsKopf id="abschluss-titel" headline={landing.abschluss.headline} text={landing.abschluss.text} />
            <TrainingStartKnopf />
          </Stack>
        </CallSektion>
        <FunnelFooter>{fusszeile}</FunnelFooter>
      </FunnelGround>
    </TrainingRegistrierungProvider>
  );
}

function LinkAbgelaufen() {
  const t = registrierung.linkAbgelaufen;
  if (useSearchParams().get("fehler") !== "link_abgelaufen") return null;
  return (
    <Box px={{ base: 4, md: 8, lg: 12 }} position="relative" zIndex={3}>
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

function Kopfleiste() {
  return (
    <Box as="header" px={{ base: 4, md: 8, lg: 12 }} py={5} position="relative" zIndex={3}>
      <Flex maxW="1180px" mx="auto" align="center" justify="space-between" gap={6}>
        <Logo variant="onDark" width={150} />
        <HStack as="nav" aria-label="Seitenabschnitte" spacing={8} display={{ base: "none", md: "flex" }}>
          {landing.nav.map((p) => (
            <Box
              as="a"
              key={p.href}
              href={p.href}
              fontSize="14px"
              color="var(--cc-text-2)"
              _hover={{ color: "var(--cc-text)" }}
            >
              {p.label}
            </Box>
          ))}
        </HStack>
        <Box as="a" href="/login" fontSize="14px" color="var(--cc-text-2)" _hover={{ color: "var(--cc-text)" }}>
          Anmelden
        </Box>
      </Flex>
    </Box>
  );
}

function Hero() {
  const h = landing.hero;
  return (
    <Box as="section" aria-labelledby="training-titel" position="relative" px={{ base: 4, md: 8, lg: 12 }} pt={{ base: 6, md: 12 }} pb={{ base: 14, md: 20 }}>
      <FunnelHeroGlow />
      <Grid
        position="relative"
        zIndex={2}
        maxW="1180px"
        mx="auto"
        templateColumns={{ base: "1fr", lg: "1fr 1.05fr" }}
        gap={{ base: 10, lg: 14 }}
        alignItems="center"
      >
        <Stack spacing={{ base: 6, md: 7 }} className="cc-rise">
          <Text fontSize="13px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-gold-light)">
            {h.eyebrow}
          </Text>
          <Box
            as="h1"
            id="training-titel"
            fontSize={{ base: "30px", sm: "36px", md: "44px", lg: "48px" }}
            fontWeight={600}
            lineHeight={1.12}
            letterSpacing="-0.02em"
            color="var(--cc-text)"
            style={{ textWrap: "balance" }}
          >
            {akzentGold(h.headline)}
          </Box>
          <Stack as="ul" listStyleType="none" spacing={3}>
            {h.punkte.map((p) => (
              <HStack as="li" key={p} spacing={3} align="flex-start">
                <Box color="var(--cc-gold-light)" pt="3px" flexShrink={0}>
                  <Check size={18} strokeWidth={2.25} aria-hidden />
                </Box>
                <Text fontSize={{ base: "16px", md: "17px" }} color="var(--cc-text-soft)">
                  {p}
                </Text>
              </HStack>
            ))}
          </Stack>
          <Box pt={2}>
            <TrainingStartKnopf />
          </Box>
        </Stack>

        <EinfuehrungsVideo />
      </Grid>
    </Box>
  );
}

/**
 * Rechte Seite des Hero: Emres Einführungsvideo (`landingVideo` in
 * `config/training.ts`) mit Ton — kein Autoplay, Start per Klick. Darunter die
 * Kennzahl aus dem Board („$5M+ · 5 Monate"), die vorher allein hier stand.
 *
 * Das Video ist unsigniert: Die Seite ist statisch, ein Token liefe ab.
 * Ohne Stream-Subdomain (lokal ohne .env) bleibt nur die Kennzahl stehen.
 */
const STREAM_SUBDOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim() || null;

function EinfuehrungsVideo() {
  const h = landing.hero;
  const basis = STREAM_SUBDOMAIN ? `https://${STREAM_SUBDOMAIN}.cloudflarestream.com/${landingVideo.uid}` : null;
  return (
    <Stack spacing={4} className="cc-rise" style={{ animationDelay: "160ms" }} minW={0}>
      {basis ? (
        <Box borderRadius="16px" boxShadow="0 0 60px rgba(212,176,128,0.16), 0 0 120px rgba(255,255,255,0.04)">
          <GlassVideoPlayer
            src={`${basis}/manifest/video.m3u8`}
            poster={`${basis}/thumbnails/thumbnail.jpg?time=${landingVideo.posterSekunde}s&width=1280`}
          />
        </Box>
      ) : null}
      <HStack
        alignSelf={{ base: "stretch", sm: "flex-start" }}
        spacing={4}
        border="1px solid var(--cc-gold-line)"
        borderRadius="12px"
        bg="rgba(15,19,23,0.72)"
        px={5}
        py={3}
        boxShadow="0 0 32px rgba(212,176,128,0.14)"
      >
        <Text className="cc-num" fontSize={{ base: "28px", md: "32px" }} fontWeight={700} lineHeight={1} color="var(--cc-gold-light)">
          {h.badgeZahl}
        </Text>
        <Text fontSize="14px" color="var(--cc-text-soft)" lineHeight={1.4}>
          {h.badgeText}
        </Text>
      </HStack>
    </Stack>
  );
}

function Videos() {
  const v = landing.videos;
  return (
    <CallSektion id="videos" labelledBy="videos-titel">
      <Stack spacing={{ base: 10, md: 12 }}>
        <CallSektionsKopf id="videos-titel" eyebrow={v.eyebrow} headline={v.headline} text={v.text} />
        <Reveal>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }} gap={{ base: 4, md: 5 }}>
            {videoPlatzhalter.map((video, i) => (
              <Stack key={video.titel} className="cc-card cc-card--still" p={6} spacing={4}>
                <HStack justify="space-between">
                  <Text className="cc-num" fontSize="13px" fontWeight={600} color="var(--cc-gold-light)" letterSpacing="0.08em">
                    VIDEO {i + 1}
                  </Text>
                  <Box color={i === 0 ? "var(--cc-gold-light)" : "var(--cc-text-3)"}>
                    {i === 0 ? <PlayCircle size={20} strokeWidth={1.75} aria-hidden /> : <Lock size={17} strokeWidth={1.75} aria-hidden />}
                  </Box>
                </HStack>
                <Text fontSize="18px" fontWeight={600} lineHeight={1.35} color="var(--cc-text)">
                  {video.titel}
                </Text>
                {video.untertitel ? (
                  <Text fontSize="14px" color="var(--cc-text-2)">
                    {video.untertitel}
                  </Text>
                ) : null}
                <Text fontSize="13px" color="var(--cc-text-3)" mt="auto">
                  {i === 0 ? "Direkt nach der Registrierung" : `Schaltet sich nach Video ${i} frei`}
                </Text>
              </Stack>
            ))}
          </Grid>
        </Reveal>
        <Flex justify="center">
          <TrainingStartKnopf />
        </Flex>
      </Stack>
    </CallSektion>
  );
}

function Ablauf() {
  const a = landing.ablauf;
  return (
    <CallSektion id="ablauf" labelledBy="ablauf-titel">
      <Stack spacing={{ base: 10, md: 12 }}>
        <CallSektionsKopf id="ablauf-titel" eyebrow={a.eyebrow} headline={a.headline} />
        <Reveal>
          <Grid as="ol" listStyleType="none" templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap={{ base: 4, md: 5 }}>
            {a.schritte.map((s, i) => (
              <Stack as="li" key={s.titel} spacing={3} p={6} borderRadius="12px" border="1px solid var(--cc-line)" bg="rgba(255,255,255,0.02)">
                <Text className="cc-num" fontSize="28px" fontWeight={600} color="var(--cc-gold-light)" lineHeight={1}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <Text fontSize="17px" fontWeight={600} color="var(--cc-text)">
                  {s.titel}
                </Text>
                <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
                  {s.text}
                </Text>
              </Stack>
            ))}
          </Grid>
        </Reveal>
      </Stack>
    </CallSektion>
  );
}

function Ergebnisse() {
  const e = landing.ergebnisse;
  const hinweisTeile = ergebnisseKopf.hinweis.split(" · ");
  return (
    <CallSektion id="ergebnisse" labelledBy="ergebnisse-titel">
      <Stack spacing={{ base: 10, md: 14 }}>
        <CallSektionsKopf id="ergebnisse-titel" eyebrow={e.eyebrow} headline={e.headline} text={e.text} />
        <NachweisGalerie bloecke={[{ ...ergebnisseKopf.blockCommunity, zeilen: COMMUNITY_AUSWAHL }]} />
        <Text fontSize="12px" lineHeight={1.7} color="var(--cc-text-3)" textAlign="center">
          {hinweisTeile.map((teil, i) => (
            <Fragment key={teil}>
              {i > 0 ? (
                <Box as="span" aria-hidden mx={2}>
                  ·
                </Box>
              ) : null}
              <Box as="span" display="inline-block">
                {teil}
              </Box>
            </Fragment>
          ))}
        </Text>
      </Stack>
    </CallSektion>
  );
}

function Faq() {
  const f = landing.faq;
  return (
    <CallSektion id="faq" labelledBy="faq-titel">
      <Stack spacing={{ base: 8, md: 10 }} maxW="760px" mx="auto">
        <CallSektionsKopf id="faq-titel" eyebrow={f.eyebrow} headline={f.headline} />
        <Accordion allowToggle>
          {f.eintraege.map((e) => (
            <AccordionItem key={e.frage} borderColor="var(--cc-line)">
              <h3>
                <AccordionButton py={5} px={1} _hover={{ bg: "transparent", color: "var(--cc-text)" }}>
                  <Box flex="1" textAlign="left" fontSize="16px" fontWeight={500} color="var(--cc-text)">
                    {e.frage}
                  </Box>
                  <AccordionIcon color="var(--cc-gold-light)" />
                </AccordionButton>
              </h3>
              <AccordionPanel px={1} pb={5} fontSize="15px" lineHeight={1.65} color="var(--cc-text-2)">
                {e.antwort}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </Stack>
    </CallSektion>
  );
}
