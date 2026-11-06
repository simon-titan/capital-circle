"use client";

import { Box, Flex, Grid, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Sektion, SektionsKopf, SterneZeile } from "@/components/landing/membership/membership-ui";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { abschluss, buchung, callVideo, fusszeile, hero } from "@/config/call-funnel";
import { garantie } from "@/config/mentoring";
import { createVideoTracker } from "@/lib/discord-funnel/video-tracking";
import type { Bewertungsspiegel } from "@/lib/landing-reviews";
import { FunnelFooter, FunnelVideoPlaceholder } from "../DiscordFunnelChrome";
import { FunnelKopfleiste, HeroPill, MobilAktionsleiste, VideoBadge, VideoSchein } from "../funnel-rahmen";
import { GoldGlowDivider } from "../GoldGlowDivider";
import { heroRise, Reveal } from "../landing-ui";
import { CallBuchungKnopf, CallBuchungProvider, useCallBuchung } from "./CallBuchung";
import { CallCaseStudies } from "./CallCaseStudies";
import { akzentGold, readCallTracking } from "./call-ui";

/**
 * `/call` — Call-Funnel nach Emres Board vom 17.10.2026.
 *
 * Seit 06.11.2026 im Look der Verkaufsseite `/` und bewusst schlank
 * (Nutzerwunsch: „deutlich simpler, der Fokus soll wirklich auf der Buchung
 * eines Calls liegen"): Hero mit VSL und Buchungsknopf · Was im Gespräch
 * passiert · Case Studies · Abschluss. Laufzeile, Splash und die große
 * Nachweis-Wand sind raus; alle Belege stehen auf `/ergebnisse`. Jede
 * Hauptaktion — auch Kopfleiste und mobile Aktionsleiste — öffnet dasselbe
 * Buchungs-Modal mit Fragebogen und Calendly (`CallBuchung.tsx`). Texte in
 * `config/call-funnel.ts`.
 *
 * Leads landen im selben System wie `/termin` (`discord_leads`, ohne
 * Discord-Invite), markiert mit `source_origin = "call_funnel"` und — ohne
 * UTM in der Adresse — `utm_source = "call-funnel"`.
 *
 * `vorschau` (`/vorschau/mentoring/call`): dieselbe Seite ohne Besuchs- und
 * Video-Tracking, ohne Lead und ohne Calendly — siehe `CallBuchung.tsx`.
 *
 * Den Seitengrund (`FunnelHimmel`) legt die Seite darum.
 */
/** Stream-Adresse des VSL (`callVideo`); ohne Subdomain (lokal ohne .env) kein Video. */
const STREAM_SUBDOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim() || null;
const STREAM_BASIS = STREAM_SUBDOMAIN ? `https://${STREAM_SUBDOMAIN}.cloudflarestream.com/${callVideo.uid}` : null;

export function CallFunnelClient({
  vorschau = false,
  bewertungen = null,
}: {
  vorschau?: boolean;
  bewertungen?: Bewertungsspiegel;
}) {
  /*
    Ohne konfiguriertes VSL entfällt Schritt 1 ganz: „Schritt 1 von 2: Video
    ansehen" über einem Platzhalter hielte bezahlten Traffic an einer Stelle
    fest, an der es nichts zu tun gibt. Die Vorschau zeigt den Platzhalter
    trotzdem, damit sichtbar ist, wo das Video hinkommt.
  */
  const videoSrc = process.env.NEXT_PUBLIC_CALL_VIDEO_URL?.trim() || (STREAM_BASIS ? `${STREAM_BASIS}/manifest/video.m3u8` : null);
  const mitVideo = Boolean(videoSrc) || vorschau;

  // Visit-Tracking (einmal pro Mount) — reines Fire-and-forget wie auf `/termin`.
  useEffect(() => {
    if (vorschau) return;
    const t = readCallTracking();
    try {
      fetch("/api/discord-funnel/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: t.session_id,
          utm_source: t.utm_source,
          utm_medium: t.utm_medium,
          utm_campaign: t.utm_campaign,
          utm_content: t.utm_content,
          utm_term: t.utm_term,
          referrer: t.referrer,
        }),
      }).catch(() => undefined);
    } catch {
      // Tracking-Fehler still ignorieren
    }
  }, [vorschau]);

  return (
    <CallBuchungProvider vorschau={vorschau}>
        <FunnelKopfleiste
          anmelden={false}
          aktion={
            <CallBuchungKnopf label={hero.ctaKurz} w="auto" minH="40px" h="40px" px={5} fontSize="15px" whiteSpace="nowrap" rightIcon={undefined} />
          }
        />

        <Box as="main">
          <Hero videoSrc={videoSrc} mitVideo={mitVideo} vorschau={vorschau} bewertungen={bewertungen} />

          <Box pt={{ base: 16, md: 24 }}>
            <GoldGlowDivider />
          </Box>
          <Gespraech mitVideo={mitVideo} />
          <GoldGlowDivider />
          <CallCaseStudies />
          <GoldGlowDivider />
          <Abschluss bewertungen={bewertungen} />
        </Box>

        <FunnelFooter>{fusszeile}</FunnelFooter>

        <MobilAktionsleiste hinweis={hero.vertrauen} ausblendenBei={["abschluss"]}>
          {(tabIndex) => <CallBuchungKnopf w="full" minH="52px" fontSize="16px" tabIndex={tabIndex} />}
        </MobilAktionsleiste>
    </CallBuchungProvider>
  );
}

/** „Kostenlos · Unverbindlich · 1:1 per Video-Call" unter jeder Hauptaktion. */
function VertrauensZeile() {
  return (
    <HStack justify="center" spacing={3} flexWrap="wrap" rowGap={1}>
      {hero.vertrauen.map((teil, i) => (
        <HStack key={teil} spacing={3}>
          {i > 0 ? <Box aria-hidden w="1px" h="11px" bg="var(--cc-line-strong)" /> : null}
          <Text fontSize="13px" color="var(--cc-text-2)">
            {teil}
          </Text>
        </HStack>
      ))}
    </HStack>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function Hero({
  videoSrc,
  mitVideo,
  vorschau,
  bewertungen,
}: {
  videoSrc: string | null;
  mitVideo: boolean;
  vorschau: boolean;
  bewertungen: Bewertungsspiegel;
}) {
  const b = useCallBuchung();

  // Watches vor der Lead-Anlage zählen über die session_id und werden bei der
  // Anlage rückwirkend verknüpft. Steht der Token fest, bekommt der Tracker ihn
  // mit, damit auch spätere Fortschritte direkt am Lead landen.
  const tracker = useMemo(() => createVideoTracker({ token: b.leadToken, source: "call_funnel" }), [b.leadToken]);

  const videoPoster =
    process.env.NEXT_PUBLIC_CALL_VIDEO_POSTER?.trim() ||
    (STREAM_BASIS ? `${STREAM_BASIS}/thumbnails/thumbnail.jpg?time=${callVideo.posterSekunde}s&width=1280` : undefined);
  // Untertitel als WebVTT unter `public/untertitel/` (gleiche Herkunft, siehe `captionsSrc` im Player).
  const videoUntertitel = process.env.NEXT_PUBLIC_CALL_VIDEO_CAPTIONS?.trim() || undefined;

  return (
    <Box as="section" aria-labelledby="call-titel" position="relative" pt={{ base: 10, md: 16 }} px={{ base: 4, md: 8, lg: 12 }}>
      <Stack maxW="1180px" mx="auto" spacing={{ base: 10, md: 12 }} align="center">
        <Stack spacing={{ base: 6, md: 7 }} align="center" textAlign="center" maxW="940px">
          <Box {...heroRise(0)}>
            <HeroPill>{hero.pill}</HeroPill>
          </Box>
          <Heading
            as="h1"
            id="call-titel"
            {...heroRise(1)}
            fontSize="clamp(32px, 5.6vw, 60px)"
            fontWeight={700}
            lineHeight={1.08}
            letterSpacing="-0.03em"
            color="var(--cc-text)"
            overflowWrap="break-word"
            style={{ ...heroRise(1).style, textWrap: "balance" }}
          >
            {akzentGold(hero.headline)}
          </Heading>
          <Text {...heroRise(2)} fontSize={{ base: "16px", md: "18px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="720px">
            {hero.subline}
          </Text>
        </Stack>

        {mitVideo ? (
          <Box {...heroRise(3)} w="full" maxW="900px">
            <VideoBadge>{hero.schritt}</VideoBadge>
            {/* VSL mit Ton und Player: kein Autoplay, denn Autoplay ist im
                GlassVideoPlayer stumm — das Video soll per Klick mit Ton starten. */}
            {videoSrc ? (
              <VideoSchein>
                <GlassVideoPlayer
                  src={videoSrc}
                  poster={videoPoster}
                  captionsSrc={videoUntertitel}
                  onProgress={vorschau ? undefined : tracker.handleProgress}
                  onEnded={vorschau ? undefined : tracker.handleEnded}
                />
              </VideoSchein>
            ) : (
              <FunnelVideoPlaceholder />
            )}
            <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)" textAlign="center" maxW="560px" mx="auto" mt={4}>
              {hero.videoHinweis}
            </Text>
          </Box>
        ) : null}

        <Stack {...heroRise(4)} spacing={4} align="center" w={{ base: "full", sm: "auto" }} maxW="560px">
          <CallBuchungKnopf />
          <VertrauensZeile />
          <SterneZeile bewertungen={bewertungen} />

          {/* Garantiesatz nur, wenn Emre die Bedingungen abgenommen hat
              (`garantie.freigegeben` in `config/mentoring.ts`) — vorher wäre es
              ein Versprechen ohne veröffentlichte Grenzen. */}
          {garantie.freigegeben ? (
            <HStack spacing={2.5} align="flex-start" color="var(--cc-text-2)" maxW="520px">
              <Box color="var(--cc-gold-light)" pt="2px" flexShrink={0}>
                <ShieldCheck size={16} strokeWidth={1.75} aria-hidden />
              </Box>
              <Text fontSize="13px" lineHeight={1.6}>
                {garantie.kurz}{" "}
                <Box
                  as="a"
                  href="/garantie"
                  color="var(--cc-text-soft)"
                  textDecoration="underline"
                  textUnderlineOffset="2px"
                  _hover={{ color: "var(--cc-text)" }}
                >
                  {hero.garantieLink}
                </Box>
              </Text>
            </HStack>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

/* ─────────────────────────── Schritt 2: Gespräch ─────────────────────────── */

function Gespraech({ mitVideo }: { mitVideo: boolean }) {
  return (
    <Sektion id="gespraech" aria-labelledby="gespraech-titel">
      <SektionsKopf
        id="gespraech-titel"
        eyebrow={mitVideo ? buchung.schritt : buchung.punkteTitel}
        headline={akzentGold(buchung.headline)}
        sublines={[buchung.text]}
      />

      <Stack spacing={4} mt={{ base: 10, md: 14 }}>
        {mitVideo ? (
          <Text fontSize="13px" lineHeight="18px" fontWeight={500} letterSpacing="0.14em" textTransform="uppercase" color="var(--cc-text-soft)">
            {buchung.punkteTitel}
          </Text>
        ) : null}
        <Grid as="ul" listStyleType="none" templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap={{ base: 4, md: 5 }}>
          {buchung.punkte.map((punkt, i) => (
            <Reveal as="li" key={punkt} delay={i * 80} display="flex">
              <Stack className="cc-card cc-card--still" p={{ base: 6, md: 7 }} spacing={4} w="full">
                <Text className="cc-num" fontSize={{ base: "30px", md: "34px" }} fontWeight={600} lineHeight={1} color="var(--cc-gold-light)" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <Text fontSize={{ base: "16px", md: "17px" }} lineHeight={1.6} color="var(--cc-text-soft)">
                  {punkt}
                </Text>
              </Stack>
            </Reveal>
          ))}
        </Grid>
      </Stack>

      <Reveal delay={160}>
        <Stack spacing={4} align="center" mt={{ base: 10, md: 12 }}>
          <CallBuchungKnopf />
          <VertrauensZeile />
        </Stack>
      </Reveal>
    </Sektion>
  );
}

/* ─────────────────────────── Abschluss ─────────────────────────── */

function Abschluss({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  return (
    <Sektion id="abschluss" py={{ base: 20, md: 32 }}>
      <Reveal>
        <Stack spacing={{ base: 8, md: 10 }} align="center" textAlign="center">
          <HeroPill>{abschluss.pill}</HeroPill>
          <Heading
            as="h2"
            fontSize="clamp(30px, 5.2vw, 58px)"
            fontWeight={700}
            lineHeight={1.08}
            letterSpacing="-0.03em"
            color="var(--cc-text)"
            maxW="900px"
          >
            {akzentGold(abschluss.headline)}
          </Heading>
          <Text fontSize={{ base: "16px", md: "18px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="680px">
            {abschluss.text}
          </Text>
          <Flex direction="column" align="center" gap={4} w={{ base: "full", sm: "auto" }}>
            <CallBuchungKnopf />
            <VertrauensZeile />
            <SterneZeile bewertungen={bewertungen} />
          </Flex>
        </Stack>
      </Reveal>
    </Sektion>
  );
}
