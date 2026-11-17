"use client";

import { Box, Flex, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Sektion } from "@/components/landing/membership/membership-ui";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { abschluss, callVideo, fusszeile, hero } from "@/config/call-funnel";
import { garantie } from "@/config/mentoring";
import { createVideoTracker } from "@/lib/discord-funnel/video-tracking";
import { FunnelFooter, FunnelVideoPlaceholder } from "../DiscordFunnelChrome";
import { FunnelKopfleiste, MobilAktionsleiste, VideoSchein } from "../funnel-rahmen";
import { GoldGlowDivider } from "../GoldGlowDivider";
import { heroRise, Reveal } from "../landing-ui";
import { CallBuchungKnopf, CallBuchungProvider, useCallBuchung } from "./CallBuchung";
import { akzentGold, readCallTracking } from "./call-ui";
import { EmreBrief } from "./EmreBrief";
import { CommunityEinblicke } from "../training/CommunityEinblicke";

/**
 * `/call` — Call-Funnel nach Emres Board vom 17.10.2026.
 *
 * Im Look der Verkaufsseite `/`. Aufbau seit Feedback 14.11.2026: Hero
 * (Headline, Unterzeile, VSL, Knopf) · Brief „Ein persönliches Wort von Emre."
 * (`EmreBrief`) · Ergebnisse aus der Community (dieselbe Section wie auf
 * `/training`, `CommunityEinblicke`) · Abschluss-CTA. Case Studies,
 * Auszahlungen (`ErgebnisseSection`) und Bewertungen sind raus. Kopfleiste nur
 * mit mittiger Wortmarke. Alle CTAs in Smaragd; jede Hauptaktion — auch die
 * mobile Aktionsleiste — öffnet dasselbe Buchungs-Modal mit Fragebogen und
 * Calendly (`CallBuchung.tsx`).
 * Texte in `config/call-funnel.ts`.
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
/** Ohne Stream-Subdomain (lokal ohne .env) kein Video. */
const STREAM_SUBDOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim() || null;

/**
 * `video` kommt aus dem Admin (`ladeFunnelVideos` in `lib/funnel-videos.ts`,
 * von der Seite geladen); ohne Angabe gilt `callVideo` aus der Config.
 * Die früheren Overrides `NEXT_PUBLIC_CALL_VIDEO_URL` / `_POSTER` gibt es seit
 * 14.11.2026 nicht mehr — sie hielten lokal ein altes Video fest.
 */
export function CallFunnelClient({
  vorschau = false,
  video = callVideo,
}: {
  vorschau?: boolean;
  video?: { uid: string; posterSekunde: number };
}) {
  /*
    Ohne konfiguriertes VSL entfällt das Video ganz: Ein Platzhalter hielte
    bezahlten Traffic an einer Stelle fest, an der es nichts zu tun gibt. Die
    Vorschau zeigt ihn trotzdem, damit sichtbar ist, wo das Video hinkommt.
  */
  const basis = STREAM_SUBDOMAIN ? `https://${STREAM_SUBDOMAIN}.cloudflarestream.com/${video.uid}` : null;
  const videoSrc = basis ? `${basis}/manifest/video.m3u8` : null;
  const videoPoster = basis ? `${basis}/thumbnails/thumbnail.jpg?time=${video.posterSekunde}s&width=1280` : undefined;
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
        {/* Nur die Wortmarke, mittig — kein Knopf in der Kopfleiste (Feedback 14.11.2026). */}
        <FunnelKopfleiste anmelden={false} aktion={null} mittig />

        <Box as="main">
          <Hero videoSrc={videoSrc} videoPoster={videoPoster} mitVideo={mitVideo} vorschau={vorschau} />

          <Box pt={{ base: 16, md: 24 }}>
            <GoldGlowDivider />
          </Box>
          <EmreBrief>
            <CallBuchungKnopf />
            <VertrauensZeile />
          </EmreBrief>
          <GoldGlowDivider />
          <CommunityEinblicke />
          <GoldGlowDivider />
          <Abschluss />
        </Box>

        <FunnelFooter>{fusszeile}</FunnelFooter>

        <MobilAktionsleiste hinweis={[...hero.vertrauen, hero.knapp]} ausblendenBei={["abschluss"]}>
          {(tabIndex) => <CallBuchungKnopf w="full" minH="52px" fontSize="16px" tabIndex={tabIndex} />}
        </MobilAktionsleiste>
    </CallBuchungProvider>
  );
}

/**
 * „100 % kostenlos & unverbindlich" unter jeder Hauptaktion (`hero.vertrauen`),
 * dahinter dezent „Limitierte Plätze" mit kleinem Gold-Punkt (`hero.knapp`) —
 * seit 17.11.2026 an **jedem** CTA, auch in der mobilen Aktionsleiste.
 */
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
      <HStack spacing={3}>
        <Box aria-hidden w="1px" h="11px" bg="var(--cc-line-strong)" />
        <HStack spacing={2}>
          <Box aria-hidden w="6px" h="6px" borderRadius="full" bg="var(--cc-gold)" boxShadow="0 0 8px rgba(212, 176, 128, 0.55)" />
          <Text fontSize="13px" color="var(--cc-text-2)">
            {hero.knapp}
          </Text>
        </HStack>
      </HStack>
    </HStack>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

/** Höhe aller Hero-Teile außer dem Video (inkl. Kopfleiste), siehe `Hero`. */
const HERO_REST = 450;

function Hero({
  videoSrc,
  videoPoster,
  mitVideo,
  vorschau,
}: {
  videoSrc: string | null;
  videoPoster: string | undefined;
  mitVideo: boolean;
  vorschau: boolean;
}) {
  const b = useCallBuchung();

  // Watches vor der Lead-Anlage zählen über die session_id und werden bei der
  // Anlage rückwirkend verknüpft. Steht der Token fest, bekommt der Tracker ihn
  // mit, damit auch spätere Fortschritte direkt am Lead landen.
  const tracker = useMemo(() => createVideoTracker({ token: b.leadToken, source: "call_funnel" }), [b.leadToken]);

  // Untertitel als WebVTT unter `public/untertitel/` (gleiche Herkunft, siehe `captionsSrc` im Player).
  const videoUntertitel = process.env.NEXT_PUBLIC_CALL_VIDEO_CAPTIONS?.trim() || undefined;

  // Kompakt, damit Headline, Video, Knopf und Vertrauenszeile ab `md` in 100vh
  // passen (Feedback 14.11.2026): Das Video richtet seine Breite nach der
  // Fensterhöhe — `HERO_REST` ist alles außer dem Video (Kopfleiste 72 px,
  // Abstände, zwei Zeilen Headline, Unterzeile, Knopf, Vertrauenszeile).
  return (
    <Box as="section" id="hero" aria-labelledby="call-titel" position="relative" pt={{ base: 8, md: 8 }} px={{ base: 4, md: 8, lg: 12 }}>
      <Stack maxW="1180px" mx="auto" spacing={{ base: 7, md: 6 }} align="center">
        <Stack spacing={{ base: 3, md: 4 }} align="center" textAlign="center" maxW="980px">
          <Heading
            as="h1"
            id="call-titel"
            {...heroRise(0)}
            fontSize="clamp(28px, 4.2vw, 50px)"
            fontWeight={700}
            lineHeight={1.1}
            letterSpacing="-0.03em"
            color="var(--cc-text)"
            overflowWrap="break-word"
            style={{ ...heroRise(0).style, textWrap: "balance" }}
          >
            {akzentGold(hero.headline)}
          </Heading>
          <Text {...heroRise(1)} fontSize={{ base: "16px", md: "17px" }} lineHeight={1.5} color="var(--cc-text-2)" maxW="760px">
            {hero.subline}
          </Text>
        </Stack>

        {mitVideo ? (
          <Box {...heroRise(2)} w="full" maxW={{ base: "960px", md: `clamp(520px, calc((100svh - ${HERO_REST}px) * 16 / 9), 960px)` }}>
            {/* VSL mit Ton und Player: kein Autoplay, denn Autoplay ist im
                GlassVideoPlayer stumm — das Video soll per Klick mit Ton starten. */}
            {videoSrc ? (
              <VideoSchein ton="neutral">
                <GlassVideoPlayer
                  accentRgb="255, 255, 255"
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
          </Box>
        ) : null}

        <Stack {...heroRise(3)} spacing={3} align="center" w={{ base: "full", sm: "auto" }} maxW="560px">
          <CallBuchungKnopf />
          <VertrauensZeile />

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

/* ─────────────────────────── Abschluss ─────────────────────────── */

function Abschluss() {
  return (
    <Sektion id="abschluss" py={{ base: 20, md: 32 }}>
      <Reveal>
        <Stack spacing={{ base: 6, md: 8 }} align="center" textAlign="center">
          <Heading
            as="h2"
            fontSize="clamp(30px, 5.2vw, 56px)"
            fontWeight={700}
            lineHeight={1.1}
            letterSpacing="-0.03em"
            color="var(--cc-text)"
            maxW="960px"
            style={{ textWrap: "balance" }}
          >
            {akzentGold(abschluss.headline)}
          </Heading>
          <Text fontSize={{ base: "16px", md: "18px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="680px">
            {abschluss.text}
          </Text>
          <Flex direction="column" align="center" gap={4} w={{ base: "full", sm: "auto" }} mt={{ base: 2, md: 2 }}>
            <CallBuchungKnopf />
            <VertrauensZeile />
          </Flex>
        </Stack>
      </Reveal>
    </Sektion>
  );
}
