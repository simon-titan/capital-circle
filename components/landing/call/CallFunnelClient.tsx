"use client";

import { Box, Button, Flex, HStack, IconButton, Stack, Text } from "@chakra-ui/react";
import { ArrowUpRight, Pause, Play, ShieldCheck } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { FunnelEyebrow as FunnelPill } from "@/components/marketing/funnel-ui";
import { NachweisGalerie } from "@/components/landing/membership/NachweisGalerie";
import { abschluss, buchung, ergebnisseAuswahl, ergebnisseKopf, fusszeile, hero } from "@/config/call-funnel";
import { auszahlungenCommunity, auszahlungenEmreLanding } from "@/config/landing-membership";
import { garantie } from "@/config/mentoring";
import { createVideoTracker } from "@/lib/discord-funnel/video-tracking";
import {
  FunnelEyebrow,
  FunnelFooter,
  FunnelGround,
  FunnelHeroGlow,
  FunnelPageStyles,
  FunnelSplash,
  FunnelVideoPlaceholder,
} from "../DiscordFunnelChrome";
import { Reveal } from "../landing-ui";
import { CallBuchungKnopf, CallBuchungProvider, useCallBuchung } from "./CallBuchung";
import { CallCaseStudies } from "./CallCaseStudies";
import { CallSektion, CallSektionsKopf, readCallTracking } from "./call-ui";

/**
 * `/call` — Call-Funnel nach Emres Board vom 17.10.2026.
 *
 * Struktur: Laufzeile · Hero mit VSL (Schritt 1) · Strategie-Gespräch
 * (Schritt 2) · Case Studies · Kundenergebnisse · Abschluss · Footer. Jede
 * Hauptaktion öffnet dasselbe Buchungs-Modal mit Fragebogen und Calendly
 * (`CallBuchung.tsx`). Alle Texte in `config/call-funnel.ts`.
 *
 * Leads landen im selben System wie `/termin` (`discord_leads`, ohne
 * Discord-Invite), markiert mit `source_origin = "call_funnel"` und — ohne
 * UTM in der Adresse — `utm_source = "call-funnel"`.
 *
 * `vorschau` (`/vorschau/mentoring/call`): dieselbe Seite ohne Besuchs- und
 * Video-Tracking, ohne Lead und ohne Calendly — siehe `CallBuchung.tsx`.
 */
export function CallFunnelClient({ vorschau = false }: { vorschau?: boolean }) {
  const [laedt, setLaedt] = useState(true);
  /*
    Ohne konfiguriertes VSL entfällt Schritt 1 ganz: „Schritt 1 von 2: Video
    ansehen" über einem Platzhalter hielte bezahlten Traffic an einer Stelle
    fest, an der es nichts zu tun gibt. Die Vorschau zeigt den Platzhalter
    trotzdem, damit sichtbar ist, wo das Video hinkommt.
  */
  const videoSrc = process.env.NEXT_PUBLIC_CALL_VIDEO_URL?.trim() || null;
  const mitVideo = Boolean(videoSrc) || vorschau;

  useEffect(() => {
    const timer = setTimeout(() => setLaedt(false), 300);
    return () => clearTimeout(timer);
  }, []);

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
      <FunnelSplash visible={laedt} />
      <FunnelPageStyles />

      <FunnelGround>
        <Laufzeile />
        <Hero videoSrc={videoSrc} mitVideo={mitVideo} vorschau={vorschau} />

        <CallSektion id="gespraech" labelledBy="gespraech-titel">
          <Stack spacing={{ base: 8, md: 10 }}>
            <CallSektionsKopf
              id="gespraech-titel"
              eyebrow={mitVideo ? buchung.schritt : undefined}
              headline={buchung.headline}
              text={buchung.text}
            />
            <GespraechsPunkte />
            <Flex justify="center">
              <CallBuchungKnopf />
            </Flex>
          </Stack>
        </CallSektion>

        <CallCaseStudies />

        <Kundenergebnisse />

        <CallSektion id="abschluss" labelledBy="abschluss-titel">
          <Stack spacing={{ base: 8, md: 10 }}>
            <CallSektionsKopf
              id="abschluss-titel"
              eyebrow={<FunnelPill>{abschluss.pill}</FunnelPill>}
              headline={abschluss.headline}
              text={abschluss.text}
            />
            <Flex justify="center">
              <CallBuchungKnopf />
            </Flex>
          </Stack>
        </CallSektion>

        <FunnelFooter>{fusszeile}</FunnelFooter>
      </FunnelGround>
    </CallBuchungProvider>
  );
}

/* ─────────────────────────── Laufzeile ─────────────────────────── */

/**
 * Schmale Leiste ganz oben mit den Kernaussagen als Laufband.
 *
 * Zwei identische Hälften, `.cc-marquee` schiebt um −50 % — so schließt das
 * Band nahtlos. Die zweite Hälfte ist `aria-hidden`, Screenreader lesen jede
 * Aussage einmal. Bei reduzierter Bewegung steht das Band still (Liste in
 * `app/globals.css`), Hover pausiert es. Der Knopf am rechten Rand hält es
 * auch auf Touch-Geräten an (WCAG 2.2.2), dort gibt es kein Hover.
 */
function Laufzeile() {
  const [angehalten, setAngehalten] = useState(false);
  const haelfte = (versteckt: boolean) => (
    <HStack as="ul" spacing={0} listStyleType="none" flexShrink={0} aria-hidden={versteckt || undefined}>
      {hero.laufzeile.map((eintrag) => (
        <HStack as="li" key={eintrag} spacing={0} flexShrink={0}>
          <Box
            as="span"
            w="5px"
            h="5px"
            mx={{ base: 4, md: 5 }}
            borderRadius="full"
            bg="var(--cc-gold-light)"
            boxShadow="0 0 8px rgba(232, 192, 148, 0.7)"
            aria-hidden
          />
          <Text
            as="span"
            whiteSpace="nowrap"
            fontSize="13px"
            fontWeight={500}
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="var(--cc-text-soft)"
          >
            {eintrag}
          </Text>
        </HStack>
      ))}
    </HStack>
  );

  return (
    <Box
      as="aside"
      aria-label="Auf einen Blick"
      position="relative"
      h="40px"
      overflow="hidden"
      display="flex"
      alignItems="center"
      bg="var(--cc-bg-raised)"
      borderBottom="1px solid rgba(212, 176, 128, 0.18)"
      backdropFilter="blur(16px)"
      sx={{ WebkitBackdropFilter: "blur(16px)" }}
    >
      <Flex
        className="cc-marquee"
        w="max-content"
        style={{ animationDuration: "48s", ...(angehalten ? { animationPlayState: "paused" } : {}) }}
      >
        {haelfte(false)}
        {haelfte(true)}
      </Flex>
      {/* Steht über dem Band; der Verlauf links blendet die Schrift davor aus, statt sie hart abzuschneiden. */}
      <Flex
        position="absolute"
        insetY={0}
        right={0}
        align="center"
        pl={8}
        pr={1}
        bg="linear-gradient(to right, transparent, var(--cc-bg-raised) 40%)"
      >
        <IconButton
          aria-label={angehalten ? hero.laufzeileFortsetzen : hero.laufzeileAnhalten}
          aria-pressed={angehalten}
          icon={angehalten ? <Play size={14} strokeWidth={2} /> : <Pause size={14} strokeWidth={2} />}
          onClick={() => setAngehalten((a) => !a)}
          variant="ghost"
          size="sm"
          minW="36px"
          h="36px"
          color="var(--cc-text-2)"
          _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.06)" }}
        />
      </Flex>
    </Box>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function Hero({ videoSrc, mitVideo, vorschau }: { videoSrc: string | null; mitVideo: boolean; vorschau: boolean }) {
  const b = useCallBuchung();

  // Watches vor der Lead-Anlage zählen über die session_id und werden bei der
  // Anlage rückwirkend verknüpft. Steht der Token fest, bekommt der Tracker ihn
  // mit, damit auch spätere Fortschritte direkt am Lead landen.
  const tracker = useMemo(() => createVideoTracker({ token: b.leadToken, source: "call_funnel" }), [b.leadToken]);

  const videoPoster = process.env.NEXT_PUBLIC_CALL_VIDEO_POSTER;
  // Untertitel als WebVTT unter `public/untertitel/` (gleiche Herkunft, siehe `captionsSrc` im Player).
  const videoUntertitel = process.env.NEXT_PUBLIC_CALL_VIDEO_CAPTIONS?.trim() || undefined;

  return (
    <Box
      as="section"
      aria-labelledby="call-titel"
      position="relative"
      w="100%"
      pt={{ base: 8, md: 12 }}
      pb={{ base: 10, md: 16 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <FunnelHeroGlow />

      <Stack position="relative" zIndex={2} maxW="900px" mx="auto" spacing={{ base: 6, md: 8 }} align="center">
        <Box className="cc-rise">
          <Logo variant="onDark" width={168} />
        </Box>

        <CallSektionsKopf id="call-titel" as="h1" headline={hero.headline} text={hero.subline} />

        {mitVideo ? (
          <Stack w="full" spacing={4} align="center" className="cc-rise" style={{ animationDelay: "160ms" }}>
            <FunnelEyebrow>{hero.schritt}</FunnelEyebrow>

            {/* VSL mit Ton und Player: kein Autoplay, denn Autoplay ist im
                GlassVideoPlayer stumm — das Video soll per Klick mit Ton starten. */}
            <Box w="full" maxW="820px">
              {videoSrc ? (
                <GlassVideoPlayer
                  src={videoSrc}
                  poster={videoPoster}
                  captionsSrc={videoUntertitel}
                  onProgress={vorschau ? undefined : tracker.handleProgress}
                  onEnded={vorschau ? undefined : tracker.handleEnded}
                />
              ) : (
                <FunnelVideoPlaceholder />
              )}
            </Box>

            <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)" textAlign="center" maxW="560px">
              {hero.videoHinweis}
            </Text>
          </Stack>
        ) : null}

        <Stack w="full" maxW="560px" spacing={4} align="center">
          <CallBuchungKnopf />

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

/* ─────────────────────────── Schritt 2: Punkte ─────────────────────────── */

/** „Im Gespräch klären wir …" — drei kurze Punkte über der Karte. */
function GespraechsPunkte() {
  return (
    <Reveal>
      <Stack spacing={4} maxW="760px" mx="auto" w="full">
        <Text
          fontSize="13px"
          lineHeight="18px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-soft)"
          textAlign="center"
        >
          {buchung.punkteTitel}
        </Text>
        <Box
          as="ul"
          listStyleType="none"
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
          gap={{ base: 3, md: 4 }}
        >
          {buchung.punkte.map((punkt, i) => (
            <HStack
              as="li"
              key={punkt}
              align="flex-start"
              spacing={3}
              p={4}
              borderRadius="10px"
              border="1px solid var(--cc-line)"
              bg="rgba(255, 255, 255, 0.02)"
            >
              <Text as="span" className="cc-num" fontSize="13px" fontWeight={600} color="var(--cc-gold-light)" pt="1px">
                {String(i + 1).padStart(2, "0")}
              </Text>
              <Text as="span" fontSize="14px" lineHeight={1.55} color="var(--cc-text-soft)">
                {punkt}
              </Text>
            </HStack>
          ))}
        </Box>
      </Stack>
    </Reveal>
  );
}

/* ─────────────────────────── Kundenergebnisse ─────────────────────────── */

/**
 * Wand der belegten Auszahlungen — dieselbe Galerie wie `/ergebnisse`, aber
 * nur eine Auswahl (`ergebnisseAuswahl`) und nur Auszahlungen; der Rest steht
 * hinter „Alle Nachweise ansehen". Die Challenge-Zertifikate bleiben
 * dort: Eine Kontogröße neben einer Auszahlung wäre genau die Verwechslung,
 * gegen die `/ergebnisse` zwei Blöcke hat.
 */
// In der Reihenfolge der Auswahl; ein Pfad, den es nicht (mehr) gibt, fällt still heraus.
const COMMUNITY_AUSWAHL = ergebnisseAuswahl.community.flatMap((bild) =>
  auszahlungenCommunity.filter((a) => a.bild === bild),
);

function Kundenergebnisse() {
  const hinweisTeile = ergebnisseKopf.hinweis.split(" · ");
  return (
    <CallSektion id="ergebnisse" labelledBy="ergebnisse-titel">
      <Stack spacing={{ base: 10, md: 14 }}>
        <CallSektionsKopf
          id="ergebnisse-titel"
          eyebrow={ergebnisseKopf.eyebrow}
          headline={ergebnisseKopf.headline}
          text={ergebnisseKopf.text}
        />

        <NachweisGalerie
          bloecke={[
            { ...ergebnisseKopf.blockCommunity, zeilen: COMMUNITY_AUSWAHL },
            { ...ergebnisseKopf.blockEmre, zeilen: auszahlungenEmreLanding },
          ]}
        />

        <Stack spacing={4} align="center" textAlign="center" borderTop="1px solid var(--cc-line)" pt={6}>
          <Text fontSize="12px" lineHeight={1.7} color="var(--cc-text-3)" letterSpacing="0.02em">
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
          <Button
            as="a"
            href={ergebnisseKopf.alleLink.href}
            target="_blank"
            rel="noopener"
            variant="line"
            size="sm"
            rightIcon={<ArrowUpRight size={15} strokeWidth={1.75} />}
          >
            {ergebnisseKopf.alleLink.label}
          </Button>
        </Stack>
      </Stack>
    </CallSektion>
  );
}
