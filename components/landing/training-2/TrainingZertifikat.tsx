"use client";

import { Box, Flex, Grid, Heading, HStack, IconButton, Stack, Text, useDisclosure } from "@chakra-ui/react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Plus, Star } from "lucide-react";
import { Fragment, useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { ZertifikatLightbox } from "@/components/landing/membership/ErgebnisseSection";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { fusszeile } from "@/config/call-funnel";
import { ergebnisse, type Auszahlung } from "@/config/landing-membership";
import { landing, landingVideo } from "@/config/training";
import type { Bewertungsspiegel } from "@/lib/landing-reviews";
import { merkeHerkunft } from "@/lib/training/herkunft";
import { FunnelFooter } from "../DiscordFunnelChrome";
import { FunnelKopfleiste, MobilAktionsleiste } from "../funnel-rahmen";
import { TrainingRegistrierungProvider, TrainingStartKnopf } from "../training/TrainingRegistrierung";
import { Rosette, Siegel, Wellenband } from "./guilloche";
import { bodoni } from "./schrift";
import "./zertifikat.css";

/**
 * `/vorschau/training-2` — Version 2 der Training-Landingpage: „Das Zertifikat".
 *
 * Gleiche Inhalte und dieselbe Registrierung wie `/training` (Texte aus
 * `config/training.ts`), aber als graviertes Wertpapier: Bodoni Moda für
 * Headlines und Beträge, Smaragd als zweite Druckfarbe neben Champagner,
 * Guilloche-Rosetten und Wellenbänder statt Glaskarten, die Auszahlungen als
 * Kontoauszug. Den Seitengrund legt `ZertifikatGrund` (Server-Komponente).
 *
 * Smaragd trägt hier zwei Rollen, die zusammenpassen: Akzent der Seite und
 * „Geld ist geflossen" (die Beträge). Grün für Gewinn bleibt damit stimmig.
 */

const SMARAGD = "#0b3d2e";
const SMARAGD_HELL = "#5fc79a";
const LINIE_GOLD = "rgba(232, 192, 148, 0.55)";
const LINIE_LEISE = "rgba(232, 192, 148, 0.22)";

/**
 * Bodoni Moda (Google-Fonts-Ausgabe) hat für „W“ vor Kleinbuchstaben kein
 * Unterschneidungspaar — „W as“, „W eg“ klaffen. Ein großes W vor einem
 * Kleinbuchstaben bekommt deshalb rechts einen negativen Rand.
 */
function kernW(text: string): ReactNode[] {
  return text.split(/(W(?=[a-zäöü]))/).map((teil, i) =>
    teil === "W" ? (
      <Box as="span" key={`w${i}`} mr="-0.08em">
        W
      </Box>
    ) : (
      teil
    ),
  );
}

/** Serifen-Text mit W-Unterschneidung, auch ohne Akzent. */
function serif(text: string): ReactNode[] {
  return kernW(text);
}

/** `{…}` in Config-Texten: kursiv in Champagner (statt Gold-Wort wie auf `/training`). */
function akzentKursiv(text: string): ReactNode[] {
  return text.split(/(\{[^}]+\})/g).flatMap((teil, i): ReactNode[] => {
    if (!(teil.startsWith("{") && teil.endsWith("}"))) {
      return kernW(teil).map((t, j) => (typeof t === "string" ? t : <Fragment key={`${i}-${j}`}>{t}</Fragment>));
    }
    return [
      <Box key={i} as="em" fontStyle="italic" color="var(--cc-gold-light)">
        {/* Bodonis „+“ ist eine lose Haarlinie, auch aufrecht: das Zeichen in Inter (leicht) setzen. */}
        {teil
          .slice(1, -1)
          .split("+")
          .map((stueck, k) => (
            <Fragment key={k}>
              {k > 0 ? (
                <Box as="span" fontStyle="normal" fontFamily="var(--font-inter), sans-serif" fontWeight={300} fontSize="0.82em" ml="0.02em" mr="0.04em" verticalAlign="0.06em">
                  +
                </Box>
              ) : null}
              {kernW(stueck)}
            </Fragment>
          ))}
      </Box>,
    ];
  });
}

const STREAM_SUBDOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim() || null;

export function TrainingZertifikat({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  useEffect(() => {
    merkeHerkunft();
  }, []);

  return (
    <TrainingRegistrierungProvider>
      <Box className={`cz-root ${bodoni.variable}`}>
      <FunnelKopfleiste
        anker={landing.nav}
        aktion={<LuxusKnopf klein>{landing.ctaKurz}</LuxusKnopf>}
        menueAktion={<LuxusKnopf voll>{landing.ctaKurz}</LuxusKnopf>}
      />

      <Box as="main">
        <Hero bewertungen={bewertungen} />
        <Trenner />
        <Kontoauszug />
        {/* Stimmen bringt seinen Trenner selbst mit: Ohne Bewertungen entfällt beides. */}
        <Stimmen />
        <Trenner />
        <Ablauf />
        <Trenner />
        <Fragen />
        <Abschluss bewertungen={bewertungen} />
      </Box>

      <FunnelFooter>{fusszeile}</FunnelFooter>

      <MobilAktionsleiste hinweis={landing.mobilHinweis} ausblendenBei={["abschluss"]}>
        {(tabIndex) => (
          <LuxusKnopf voll tabIndex={tabIndex}>
            {landing.hero.cta}
          </LuxusKnopf>
        )}
      </MobilAktionsleiste>
      </Box>
    </TrainingRegistrierungProvider>
  );
}

/* ─────────────────────────── Bausteine ─────────────────────────── */

/** Die Hauptaktion im Zertifikat-Schnitt: kantig, gesperrte Versalien, Glanz, der einmal darüberläuft. */
function LuxusKnopf({
  children,
  klein = false,
  voll = false,
  tabIndex,
}: {
  children?: ReactNode;
  klein?: boolean;
  voll?: boolean;
  tabIndex?: number;
}) {
  return (
    <TrainingStartKnopf
      className={klein ? undefined : "cz-glanz"}
      tabIndex={tabIndex}
      borderRadius="2px"
      textTransform="uppercase"
      letterSpacing="0.14em"
      fontWeight={600}
      w={voll ? "full" : klein ? "auto" : { base: "full", sm: "auto" }}
      h={klein ? "40px" : "auto"}
      minH={klein ? "40px" : { base: "56px", md: "60px" }}
      px={klein ? 5 : { base: 8, md: 12 }}
      fontSize={klein ? "12px" : { base: "13px", md: "14px" }}
      whiteSpace="nowrap"
      rightIcon={klein ? undefined : <ArrowRight size={16} strokeWidth={2} />}
    >
      {children ?? landing.hero.cta}
    </TrainingStartKnopf>
  );
}

/** Fünf gefüllte Sterne aus den echten Bewertungen (gerundeter Schnitt); ohne Bewertungen nichts. */
function Sterne({ bewertungen, groesse = 16 }: { bewertungen: Bewertungsspiegel; groesse?: number }) {
  if (!bewertungen) return null;
  const anzahl = Math.min(5, Math.round(Number(bewertungen.schnitt.replace(",", "."))));
  if (!Number.isFinite(anzahl) || anzahl < 1) return null;
  return (
    <HStack spacing={1.5} role="img" aria-label={`${bewertungen.schnitt} von 5 Sternen`} color="var(--cc-gold-light)">
      {Array.from({ length: anzahl }, (_, i) => (
        <Star key={i} size={groesse} strokeWidth={1.25} fill="currentColor" aria-hidden />
      ))}
    </HStack>
  );
}

/** Wellenband zwischen den Abschnitten, schmal und mittig. */
function Trenner() {
  return (
    <Box px={{ base: 6, md: 12 }} aria-hidden>
      <Box maxW="760px" mx="auto" opacity={0.9}>
        <Wellenband />
      </Box>
    </Box>
  );
}

/** Abschnittsrahmen: gleiche Breite, gleicher Rhythmus, mehr Luft über als unter der Überschrift. */
function Abschnitt({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <Box as="section" id={id} aria-labelledby={label} scrollMarginTop="88px" px={{ base: 5, md: 10, lg: 12 }} py={{ base: 20, md: 28 }}>
      <Box maxW="1120px" mx="auto">
        {children}
      </Box>
    </Box>
  );
}

function AbschnittsTitel({ id, children, zeile }: { id: string; children: ReactNode; zeile?: string }) {
  return (
    <Stack spacing={4} align="center" textAlign="center" maxW="760px" mx="auto">
      <Heading
        as="h2"
        id={id}
        className="cz-serif"
        fontWeight={500}
        fontSize="clamp(34px, 5vw, 58px)"
        lineHeight={1.06}
        letterSpacing="-0.01em"
        color="var(--cc-text)"
        style={{ textWrap: "balance" }}
      >
        {children}
      </Heading>
      {zeile ? (
        <Text fontSize={{ base: "16px", md: "17px" }} lineHeight={1.65} color="var(--cc-text-2)" maxW="58ch">
          {zeile}
        </Text>
      ) : null}
    </Stack>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

/**
 * Das Zertifikat: Doppelrahmen mit Eckmarken und Randvermerken, dahinter die
 * Rosette, die sich beim Laden zeichnet. Reihenfolge wie auf `/training`:
 * Headline, Video, Punkte, Knopf, Sterne.
 */
function Hero({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  const h = landing.hero;
  const basis = STREAM_SUBDOMAIN ? `https://${STREAM_SUBDOMAIN}.cloudflarestream.com/${landingVideo.uid}` : null;

  return (
    <Box as="section" aria-labelledby="zertifikat-titel" px={{ base: 3, md: 8, lg: 12 }} pt={{ base: 3, md: 6 }}>
      <Box position="relative" maxW="1240px" mx="auto" px={{ base: 4, sm: 8, md: 14 }} pt={{ base: 14, md: 20 }} pb={{ base: 12, md: 16 }}>
        <ZertifikatRahmen />

        {/* Randvermerke wie auf einem Wertpapier. */}
        <Flex
          position="absolute"
          top={{ base: "14px", md: "22px" }}
          left={{ base: "18px", md: "34px" }}
          right={{ base: "18px", md: "34px" }}
          justify="space-between"
          display={{ base: "none", sm: "flex" }}
          aria-hidden
        >
          {["Capital Circle Institut", h.eyebrow].map((t) => (
            <Text key={t} fontSize={{ base: "9px", md: "11px" }} fontWeight={500} letterSpacing="0.28em" textTransform="uppercase" color="var(--cc-text-3)">
              {t}
            </Text>
          ))}
        </Flex>

        {/* Rosette hinter der Headline */}
        <Box position="absolute" left="50%" top={{ base: "40px", md: "10px" }} transform="translateX(-50%)" pointerEvents="none" opacity={0.75} zIndex={0}>
          <Rosette groesse="min(760px, 128vw)" />
        </Box>

        <Stack position="relative" zIndex={1} spacing={{ base: 9, md: 12 }} align="center" textAlign="center">
          <Heading
            as="h1"
            id="zertifikat-titel"
            className="cz-serif cz-auf"
            fontWeight={500}
            fontSize="clamp(38px, 5.6vw, 72px)"
            lineHeight={1.02}
            letterSpacing="-0.015em"
            color="var(--cc-text)"
            maxW="1100px"
            mt={{ base: 6, md: 10 }}
            style={{ textWrap: "balance", animationDelay: "150ms" }}
          >
            {akzentKursiv(h.headline)}
          </Heading>

          {basis ? (
            <Box w="full" maxW="920px" className="cz-auf" style={{ animationDelay: "350ms" }}>
              <VideoPlakette>
                <GlassVideoPlayer
                  src={`${basis}/manifest/video.m3u8`}
                  poster={`${basis}/thumbnails/thumbnail.jpg?time=${landingVideo.posterSekunde}s&width=1280`}
                />
              </VideoPlakette>
            </Box>
          ) : null}

          <Flex
            as="ul"
            listStyleType="none"
            wrap="wrap"
            justify="center"
            columnGap={{ base: 5, md: 9 }}
            rowGap={3}
            className="cz-auf"
            style={{ animationDelay: "450ms" }}
          >
            {h.punkte.map((p) => (
              <HStack as="li" key={p} spacing={2.5}>
                <Box color={SMARAGD_HELL} flexShrink={0}>
                  <Check size={16} strokeWidth={2} aria-hidden />
                </Box>
                <Text fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-soft)">
                  {p}
                </Text>
              </HStack>
            ))}
          </Flex>

          <Stack spacing={5} align="center" w={{ base: "full", sm: "auto" }} className="cz-auf" style={{ animationDelay: "500ms" }}>
            <LuxusKnopf />
            <Sterne bewertungen={bewertungen} />
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

/** Doppelte Gold-Haarlinie mit Eckmarken; die Linien öffnen sich beim Laden aus der Mitte. */
function ZertifikatRahmen() {
  const ecke = (pos: Record<string, string>) => (
    <Box position="absolute" w="9px" h="9px" border={`1px solid ${LINIE_GOLD}`} transform="rotate(45deg)" bg="#0f1317" {...pos} />
  );
  return (
    <Box aria-hidden position="absolute" inset={0} pointerEvents="none">
      <Box position="absolute" inset={0} border={`1px solid ${LINIE_GOLD}`} className="cz-linie-auf" />
      <Box position="absolute" inset={{ base: "5px", md: "7px" }} border={`1px solid ${LINIE_LEISE}`} className="cz-linie-auf" style={{ animationDelay: "120ms" }} />
      {ecke({ top: "-5px", left: "-5px" })}
      {ecke({ top: "-5px", right: "-5px" })}
      {ecke({ bottom: "-5px", left: "-5px" })}
      {ecke({ bottom: "-5px", right: "-5px" })}
    </Box>
  );
}

/** Das Video als eingelassene Plakette: Gold-Doppelrahmen, tiefer Schatten, Smaragd-Schein. */
function VideoPlakette({ children }: { children: ReactNode }) {
  return (
    <Box
      p={{ base: "5px", md: "8px" }}
      border={`1px solid ${LINIE_GOLD}`}
      bg="rgba(11, 61, 46, 0.35)"
      boxShadow="0 30px 80px rgba(0, 0, 0, 0.6), 0 40px 120px rgba(31, 122, 90, 0.2), inset 0 1px 0 rgba(232, 192, 148, 0.25)"
    >
      <Box border={`1px solid ${LINIE_LEISE}`} sx={{ "& > *": { borderRadius: "0 !important" } }}>
        {children}
      </Box>
    </Box>
  );
}

/* ─────────────────────────── Kontoauszug ─────────────────────────── */

/**
 * Die Auszahlungen als Kontoauszug: Datum, Prop-Firma, Betrag in Bodoni mit
 * festen Ziffern. Jede Zeile öffnet den Beleg (dieselbe Lightbox wie auf `/`).
 * Dieselbe Auswahl wie auf der Verkaufsseite (`ergebnisse.spalten`).
 */
function Kontoauszug() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [offen, setOffen] = useState<Auszahlung | null>(null);
  const zeige = (z: Auszahlung) => {
    setOffen(z);
    onOpen();
  };

  return (
    <Abschnitt id="ergebnisse" label="auszug-titel">
      <AbschnittsTitel id="auszug-titel" zeile={ergebnisse.sublines.join(" ")}>
        {serif(ergebnisse.headline)}
      </AbschnittsTitel>

      <Box mt={{ base: 12, md: 16 }} position="relative" border={`1px solid ${LINIE_LEISE}`} bg="rgba(15, 19, 23, 0.7)">
        <Box position="absolute" inset="5px" border={`1px solid rgba(232, 192, 148, 0.1)`} pointerEvents="none" aria-hidden />
        <Box px={{ base: 5, md: 10 }} py={{ base: 6, md: 9 }}>
          {ergebnisse.spalten.map((spalte, s) => (
            <Box key={spalte.titel} mt={s === 0 ? 0 : { base: 9, md: 11 }}>
              <Flex justify="space-between" align="baseline" pb={3} borderBottom={`1px solid ${LINIE_GOLD}`}>
                <Text as="h3" fontSize="12px" fontWeight={600} letterSpacing="0.24em" textTransform="uppercase" color="var(--cc-gold-light)">
                  {spalte.titel}
                </Text>
                <Text fontSize="12px" letterSpacing="0.2em" textTransform="uppercase" color="var(--cc-text-3)" display={{ base: "none", md: "block" }}>
                  Betrag
                </Text>
              </Flex>
              <Box as="ul" listStyleType="none">
                {spalte.zeilen.map((z, i) => (
                  <Box as="li" key={`${spalte.titel}-${z.quelle}-${i}`} borderBottom="1px dashed rgba(255, 255, 255, 0.08)">
                    <Grid
                      as="button"
                      type="button"
                      onClick={() => zeige(z)}
                      disabled={!z.bild}
                      w="full"
                      textAlign="left"
                      templateColumns={{ base: "1fr auto", md: "120px 1fr auto auto" }}
                      columnGap={{ base: 4, md: 8 }}
                      rowGap={1}
                      alignItems="center"
                      py={{ base: 4, md: 5 }}
                      px={2}
                      transition="background-color 220ms var(--cc-ease)"
                      _hover={{ bg: "rgba(31, 122, 90, 0.12)" }}
                      _disabled={{ cursor: "default", _hover: { bg: "transparent" } }}
                      aria-label={`Beleg ansehen: ${z.quelle}, ${z.betrag}, ${z.datum}`}
                    >
                      <Text className="cc-num" fontSize="13px" color="var(--cc-text-3)" gridColumn={{ base: "1", md: "auto" }} gridRow={{ base: "2", md: "auto" }}>
                        {z.datum}
                      </Text>
                      <Text fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-soft)">
                        {z.quelle}
                      </Text>
                      <Text
                        className="cz-serif"
                        fontSize={{ base: "22px", md: "26px" }}
                        fontWeight={500}
                        color={SMARAGD_HELL}
                        textAlign="right"
                        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                        gridColumn={{ base: "2", md: "auto" }}
                        gridRow={{ base: "1 / span 2", md: "auto" }}
                      >
                        {z.betrag}
                      </Text>
                      <Text
                        // Auch mobil sichtbar: Die Zeile öffnet den Beleg, das muss man ihr ansehen.
                        gridColumn={{ base: "2", md: "auto" }}
                        gridRow={{ base: "3", md: "auto" }}
                        textAlign="right"
                        fontSize={{ base: "10px", md: "12px" }}
                        letterSpacing="0.16em"
                        textTransform="uppercase"
                        color={z.bild ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                      >
                        {z.bild ? "Beleg" : "—"}
                      </Text>
                    </Grid>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Flex justify="center" mt={8}>
        <HStack
          as="a"
          href={ergebnisse.fussLink.href}
          spacing={2}
          fontSize="13px"
          fontWeight={600}
          letterSpacing="0.16em"
          textTransform="uppercase"
          color="var(--cc-gold-light)"
          _hover={{ color: "var(--cc-text)" }}
        >
          <Text as="span">{ergebnisse.fussLink.label}</Text>
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </HStack>
      </Flex>

      <ZertifikatLightbox zeile={offen} isOpen={isOpen} onClose={onClose} />
    </Abschnitt>
  );
}

/* ─────────────────────────── Stimmen ─────────────────────────── */

type Stimme = { name: string; rating: number; text: string; date: string };

/**
 * Eine Stimme groß in Bodoni kursiv, die nächste blendet nach 8 s über; Pfeile
 * zum Blättern, Hover/Fokus hält an, bei reduzierter Bewegung kein Autoplay.
 * Quelle wie überall: `landing_reviews`, Kategorie `global`.
 */
function Stimmen() {
  const [stimmen, setStimmen] = useState<Stimme[]>([]);
  const [index, setIndex] = useState(0);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    let weg = false;
    fetch("/api/reviews?landing=global")
      .then((r) => r.json())
      .then((json) => {
        if (weg || !json?.ok || !Array.isArray(json.items)) return;
        const alle = (json.items as { name: string; rating: number; body: string; date_label: string }[])
          .map((r) => ({ name: r.name, rating: r.rating, text: r.body, date: r.date_label }))
          // Im Datenbestand schon gekürzte Texte („…“ am Ende) nicht auf die Zitatbühne.
          .filter((r) => r.text && r.text.length >= 60 && !/(…|\.\.\.)\s*$/.test(r.text));
        // Kurze Stimmen zuerst: Eine Zitatbühne trägt keine 800 Zeichen.
        const kurz = alle.filter((r) => r.text.length <= 340);
        // Reichen die kurzen nicht, kommen längere dazu — gekürzt nur am Satzende (`bisSatzende`).
        setStimmen((kurz.length >= 3 ? kurz : alle).slice(0, 8));
      })
      .catch(() => undefined);
    return () => {
      weg = true;
    };
  }, []);

  const weiter = useCallback((schritt: number) => setIndex((i) => (stimmen.length ? (i + schritt + stimmen.length) % stimmen.length : 0)), [stimmen.length]);

  useEffect(() => {
    if (pause || stimmen.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => weiter(1), 8000);
    return () => clearInterval(t);
  }, [pause, stimmen.length, weiter]);

  if (stimmen.length === 0) return null;
  const s = stimmen[index];
  const text = bisSatzende(s.text, 340);

  return (
    <>
    <Trenner />
    <Abschnitt id="stimmen" label="stimmen-titel">
      <AbschnittsTitel id="stimmen-titel">{serif("Was Mitglieder sagen.")}</AbschnittsTitel>
      <Stack
        mt={{ base: 12, md: 16 }}
        align="center"
        textAlign="center"
        spacing={8}
        maxW="880px"
        mx="auto"
        onMouseEnter={() => setPause(true)}
        onMouseLeave={() => setPause(false)}
        onFocus={() => setPause(true)}
        onBlur={() => setPause(false)}
      >
        <Box
          key={index}
          as="blockquote"
          className="cz-serif cz-wechsel"
          fontStyle="italic"
          fontSize={{ base: "23px", md: "31px" }}
          lineHeight={1.38}
          color="var(--cc-text)"
          minH={{ base: "220px", md: "200px" }}
          aria-live="polite"
        >
          <Box as="span" aria-hidden color="var(--cc-gold-light)">
            „
          </Box>
          {text}
          <Box as="span" aria-hidden color="var(--cc-gold-light)">
            “
          </Box>
        </Box>
        <Stack spacing={2} align="center">
          <HStack spacing={1} color="var(--cc-gold-light)" role="img" aria-label={`${s.rating} von 5 Sternen`}>
            {Array.from({ length: Math.max(0, Math.min(5, s.rating)) }, (_, i) => (
              <Star key={i} size={13} strokeWidth={1.25} fill="currentColor" aria-hidden />
            ))}
          </HStack>
          <Text fontSize="13px" fontWeight={600} letterSpacing="0.2em" textTransform="uppercase" color="var(--cc-text-soft)">
            {s.name}
          </Text>
          {s.date ? (
            <Text fontSize="12px" color="var(--cc-text-3)">
              {s.date}
            </Text>
          ) : null}
        </Stack>
        <HStack spacing={5}>
          <IconButton aria-label="Vorherige Stimme" icon={<ChevronLeft size={18} strokeWidth={1.5} />} onClick={() => weiter(-1)} {...pfeilStil} />
          <Text className="cc-num" fontSize="13px" color="var(--cc-text-3)" minW="64px">
            {index + 1} / {stimmen.length}
          </Text>
          <IconButton aria-label="Nächste Stimme" icon={<ChevronRight size={18} strokeWidth={1.5} />} onClick={() => weiter(1)} {...pfeilStil} />
        </HStack>
      </Stack>
    </Abschnitt>
    </>
  );
}

/**
 * Kürzt eine Bewertung am letzten Satzende bis `max` Zeichen — nie mitten im
 * Satz (ein abgeschnittenes Zitat legt dem Mitglied Worte in den Mund, die so
 * nicht dastehen). Findet sich kein Satzende, bleibt der Text ganz.
 */
function bisSatzende(text: string, max: number): string {
  if (text.length <= max) return text;
  const teil = text.slice(0, max);
  const ende = Math.max(teil.lastIndexOf(". "), teil.lastIndexOf("! "), teil.lastIndexOf("? "));
  return ende > 80 ? teil.slice(0, ende + 1) : text;
}

const pfeilStil = {
  variant: "unstyled",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "44px",
  h: "44px",
  minW: "44px",
  borderRadius: "full",
  border: `1px solid ${LINIE_LEISE}`,
  color: "var(--cc-text-soft)",
  transition: "border-color 200ms var(--cc-ease), color 200ms var(--cc-ease)",
  _hover: { borderColor: LINIE_GOLD, color: "var(--cc-gold-light)" },
} as const;

/* ─────────────────────────── Ablauf ─────────────────────────── */

const ROEMISCH = ["I", "II", "III"];

/** Drei Schritte als Spalten zwischen Gold-Haarlinien, römische Ziffern in Bodoni. Keine Karten. */
function Ablauf() {
  const a = landing.ablauf;
  return (
    <Abschnitt id="ablauf" label="ablauf-titel">
      <AbschnittsTitel id="ablauf-titel" zeile={a.sublines[0]}>
        {akzentKursiv(a.headline)}
      </AbschnittsTitel>
      <Grid
        as="ol"
        listStyleType="none"
        mt={{ base: 12, md: 16 }}
        templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
        borderTop={`1px solid ${LINIE_GOLD}`}
        borderBottom={`1px solid ${LINIE_LEISE}`}
      >
        {a.schritte.map((s, i) => (
          <Stack
            as="li"
            key={s.titel}
            spacing={5}
            px={{ base: 2, md: 8 }}
            py={{ base: 9, md: 12 }}
            borderLeft={{ base: "none", md: i === 0 ? "none" : `1px solid ${LINIE_LEISE}` }}
            borderTop={{ base: i === 0 ? "none" : `1px solid ${LINIE_LEISE}`, md: "none" }}
          >
            <Text className="cz-serif" fontSize={{ base: "54px", md: "64px" }} lineHeight={0.9} fontWeight={400} color="var(--cc-gold-light)" aria-hidden>
              {ROEMISCH[i]}
            </Text>
            <Text as="h3" className="cz-serif" fontSize={{ base: "25px", md: "27px" }} fontWeight={500} lineHeight={1.2} color="var(--cc-text)">
              {serif(s.titel)}
            </Text>
            <Text fontSize="15px" lineHeight={1.7} color="var(--cc-text-2)" flex={1}>
              {s.text}
            </Text>
            <HStack spacing={2}>
              <Box color={SMARAGD_HELL}>
                <Check size={15} strokeWidth={2} aria-hidden />
              </Box>
              <Text fontSize="13px" fontWeight={500} color="var(--cc-text-soft)">
                {s.kurz}
              </Text>
            </HStack>
          </Stack>
        ))}
      </Grid>
      <Flex justify="center" mt={{ base: 12, md: 14 }}>
        <LuxusKnopf />
      </Flex>
    </Abschnitt>
  );
}

/* ─────────────────────────── Fragen ─────────────────────────── */

function Fragen() {
  const f = landing.faq;
  const [offen, setOffen] = useState<number | null>(0);
  const praefix = useId();
  return (
    <Abschnitt id="faq" label="faq-titel">
      <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 340px) 1fr" }} gap={{ base: 10, lg: 20 }}>
        <Heading
          as="h2"
          id="faq-titel"
          className="cz-serif"
          fontWeight={500}
          fontSize="clamp(34px, 5vw, 58px)"
          lineHeight={1.06}
          color="var(--cc-text)"
          position={{ lg: "sticky" }}
          top={{ lg: "120px" }}
          alignSelf="start"
        >
          {akzentKursiv(f.headline)}
        </Heading>
        <Box as="ul" listStyleType="none" borderTop={`1px solid ${LINIE_GOLD}`}>
          {f.eintraege.map((e, i) => {
            const auf = offen === i;
            const knopf = `${praefix}-f-${i}`;
            const panel = `${praefix}-a-${i}`;
            return (
              <Box as="li" key={e.frage} borderBottom={`1px solid ${LINIE_LEISE}`}>
                <Flex
                  as="button"
                  type="button"
                  id={knopf}
                  aria-expanded={auf}
                  aria-controls={panel}
                  onClick={() => setOffen(auf ? null : i)}
                  w="full"
                  align="center"
                  justify="space-between"
                  gap={6}
                  py={{ base: 6, md: 7 }}
                  textAlign="left"
                  _hover={{ "& .cz-frage": { color: "var(--cc-gold-light)" } }}
                >
                  <Text className="cz-serif cz-frage" fontSize={{ base: "21px", md: "25px" }} fontWeight={500} lineHeight={1.3} color="var(--cc-text)" transition="color 200ms var(--cc-ease)">
                    {serif(e.frage)}
                  </Text>
                  <Box
                    flexShrink={0}
                    color={auf ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
                    transform={auf ? "rotate(45deg)" : "none"}
                    transition="transform 320ms cubic-bezier(0.16, 1, 0.3, 1), color 200ms"
                  >
                    <Plus size={20} strokeWidth={1.25} aria-hidden />
                  </Box>
                </Flex>
                <Box
                  id={panel}
                  role="region"
                  aria-labelledby={knopf}
                  display="grid"
                  gridTemplateRows={auf ? "1fr" : "0fr"}
                  transition="grid-template-rows 420ms cubic-bezier(0.16, 1, 0.3, 1)"
                >
                  <Box overflow="hidden">
                    <Text pb={7} pr={{ md: 14 }} fontSize="16px" lineHeight={1.75} color="var(--cc-text-2)" maxW="62ch" visibility={auf ? "visible" : "hidden"}>
                      {e.antwort}
                    </Text>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Grid>
    </Abschnitt>
  );
}

/* ─────────────────────────── Abschluss ─────────────────────────── */

/** Das Smaragd-Feld: volle Breite, Rosette in Gold, Siegel, Headline, Knopf. */
function Abschluss({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  const a = landing.abschluss;
  return (
    <Box
      as="section"
      id="abschluss"
      aria-labelledby="abschluss-titel"
      position="relative"
      overflow="hidden"
      mt={{ base: 8, md: 12 }}
      bg={`radial-gradient(ellipse 80% 70% at 50% 40%, #12523d 0%, ${SMARAGD} 55%, #082a20 100%)`}
      borderTop={`1px solid ${LINIE_GOLD}`}
      borderBottom={`1px solid ${LINIE_GOLD}`}
      px={{ base: 5, md: 10 }}
      py={{ base: 24, md: 32 }}
    >
      <Box position="absolute" left="50%" top="50%" transform="translate(-50%, -50%)" opacity={0.35} pointerEvents="none">
        <Rosette groesse="min(1100px, 170vw)" ton="gold" zeichnen={false} />
      </Box>
      <Stack position="relative" spacing={{ base: 9, md: 10 }} align="center" textAlign="center" maxW="900px" mx="auto">
        <Siegel groesse={150} />
        <Heading
          as="h2"
          id="abschluss-titel"
          className="cz-serif"
          fontWeight={500}
          fontSize="clamp(36px, 5.6vw, 68px)"
          lineHeight={1.06}
          color="#f2f3f5"
          style={{ textWrap: "balance" }}
        >
          {akzentKursiv(a.headline)}
          <Box as="span" display="block">
            {akzentKursiv(a.zeile2)}
          </Box>
        </Heading>
        <Stack spacing={5} align="center" w={{ base: "full", sm: "auto" }}>
          <LuxusKnopf />
          <Sterne bewertungen={bewertungen} />
        </Stack>
      </Stack>
    </Box>
  );
}
