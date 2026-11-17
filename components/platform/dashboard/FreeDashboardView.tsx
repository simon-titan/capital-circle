"use client";

import { Box, Button, Flex, Grid, Heading, Stack, Text, type BoxProps } from "@chakra-ui/react";
import { ArrowRight, Check, CirclePlay, Download, FileText, Layers, Lock, MessageCircle, Play, Trophy } from "lucide-react";
import NextLink from "next/link";
import { BlueprintCover } from "@/components/platform/blueprint/BlueprintCover";
import { BLUEPRINT_DOWNLOAD_PFAD, BLUEPRINT_PFAD, VITRINE_PFAD, freeDashboard } from "@/config/free-bereich";
import { FREE_PROGRAMME_PFAD, TRAINING_VIDEOS_PFAD, mitglied, programme, zugangTexte } from "@/config/training";
import { ApplyPrompt, rise } from "./DashboardView";
import { TerminKarte } from "./TerminKarte";
import { UmzugCard } from "./UmzugCard";
import { DashCard, IconTile, ProgressBar, clampLines } from "./primitives";
import type { FreeDashboardDaten, FreeLektion } from "./types";
import type { TerminKarteDaten } from "@/lib/training/nach-buchung";

const t = freeDashboard;

/** Kopfzeile rechts in einer Karte („Noch 24 Tage Zugang“) — normale Schrift, nicht versal. */
function KopfNotiz({ children }: { children: string }) {
  return (
    <Text className="cc-num" fontSize={{ base: "13px", md: "14px" }} color="var(--cc-text-2)" textAlign="right" lineHeight={1.35}>
      {children}
    </Text>
  );
}

/** Vorschaubild der nächsten Lektion mit Play-Knopf; ohne Bild ein ruhiger Platzhalter. */
function Vorschau({ src, href, label }: { src: string | null; href: string; label: string }) {
  return (
    <Box
      as={NextLink}
      href={href}
      aria-label={label}
      role="group"
      position="relative"
      display="block"
      w="100%"
      pt="56.25%"
      borderRadius="10px"
      overflow="hidden"
      bg="linear-gradient(135deg, #1d2227 0%, #14181c 100%)"
      border="1px solid var(--cc-line)"
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : null}
      <Flex position="absolute" inset={0} align="center" justify="center" bg={src ? "rgba(8, 10, 12, 0.18)" : undefined}>
        <Flex
          w="52px"
          h="52px"
          borderRadius="full"
          align="center"
          justify="center"
          // Weiß mit dunklem Symbol (Feedback 14.11.2026) — Fläche, kein Schein.
          bg="linear-gradient(135deg, #ffffff 0%, #e6e8eb 55%, #c4c8ce 100%)"
          color="#15181c"
          transition="transform 200ms var(--cc-ease)"
          _groupHover={{ transform: "scale(1.06)" }}
        >
          <Play size={20} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} aria-hidden />
        </Flex>
      </Flex>
    </Box>
  );
}

/* ─── Karte „Deine Ausbildung“ ──────────────────────────────────────────── */

function AusbildungKarte({ daten, ...rest }: BoxProps & { daten: FreeDashboardDaten }) {
  const { training: tr, zugang } = daten;
  const a = t.ausbildung;
  const mitZugang = zugang.art === "aktiv" || zugang.art === "offen";
  // Der Countdown steht in der Seitenleiste unter „Free Member" (`ZugangCountdown`).
  const kopf =
    zugang.art === "aktiv"
      ? zugangTexte.restTage(zugang.restTage)
      : zugang.art === "beendet"
        ? a.zugangBeendet
        : null;

  const text = !mitZugang
    ? zugang.art === "keine"
      ? zugangTexte.keinZugangText
      : zugang.art === "beendet"
        ? zugangTexte.beendetTitel
        : a.wartet
    : tr.abgeschlossen
      ? a.textFertig
      : tr.gesehen === 0
        ? a.textStart
        : a.text;

  // Hauptknopf je Zustand — die Weichen aus der früheren TrainingKarte.
  const knopf: { text: string; href: string; extern?: boolean; icon?: "whatsapp" } | null =
    zugang.art === "keine"
      ? { text: zugangTexte.bewerben, href: `${TRAINING_VIDEOS_PFAD}?bewerben=1` }
      : zugang.art === "beendet"
        ? zugang.whatsappUrl
          ? { text: zugangTexte.whatsapp, href: zugang.whatsappUrl, extern: true, icon: "whatsapp" }
          : { text: a.ansehen, href: TRAINING_VIDEOS_PFAD }
        : zugang.art === "wartet"
          ? null
          : tr.abgeschlossen
            ? { text: programme.navLabel, href: FREE_PROGRAMME_PFAD }
            : { text: tr.gesehen === 0 ? a.starten : a.fortsetzen, href: tr.weiterHref };

  const naechsteZeile = (() => {
    if (zugang.art === "beendet") {
      return zugang.whatsappUrl ? zugangTexte.beendetText : zugangTexte.beendetVerlaengertText;
    }
    if (zugang.art === "keine") return zugangTexte.keinZugangTitel;
    if (tr.abgeschlossen) return a.allesFertig;
    if (tr.naechste) return null; // eigene Darstellung unten
    return mitglied.videosFolgen;
  })();

  return (
    <DashCard
      label={a.label}
      labelId="free-ausbildung"
      icon={<CirclePlay size={17} strokeWidth={1.6} />}
      badge={kopf ? <KopfNotiz>{kopf}</KopfNotiz> : undefined}
      {...rest}
    >
      <Grid templateColumns={{ base: "minmax(0, 1fr)", md: "minmax(0, 0.9fr) minmax(0, 1fr)" }} gap={{ base: 4, md: 5 }} alignItems="center">
        <Vorschau
          src={tr.thumbnailUrl}
          href={zugang.art === "keine" ? `${TRAINING_VIDEOS_PFAD}?bewerben=1` : tr.weiterHref}
          label={tr.naechste ? `${a.lektion(tr.naechste.nummer)} ansehen: ${tr.naechste.titel}` : a.ansehen}
        />
        <Stack spacing={3} minW={0}>
          <Box>
            <Text fontSize={{ base: "18px", md: "20px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
              {a.titel}
            </Text>
            <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)" mt={1.5}>
              {text}
            </Text>
          </Box>
          {zugang.art === "keine" || zugang.art === "wartet" ? null : (
            <Stack spacing={2} pt={1}>
              <Flex justify="space-between" className="cc-num" fontSize="14px" color="var(--cc-text-soft)">
                <span>{a.lektionen(tr.gesehen, tr.gesamt)}</span>
                <Box as="span" color="var(--cc-smaragd-hell)" fontWeight={600}>
                  {tr.prozent} %
                </Box>
              </Flex>
              <ProgressBar value={tr.prozent} label="Fortschritt im kostenlosen Training" maxW="none" tone="smaragd" />
            </Stack>
          )}
        </Stack>
      </Grid>

      <Flex
        mt={5}
        pt={4}
        borderTop="1px solid var(--cc-line)"
        direction={{ base: "column", sm: "row" }}
        align={{ base: "stretch", sm: "center" }}
        justify="space-between"
        gap={4}
      >
        <Box minW={0}>
          {naechsteZeile === null && tr.naechste ? (
            <>
              <Text fontSize="12px" fontWeight={600} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-gold-light)">
                {a.alsNaechstes}
              </Text>
              <Text fontSize="15px" color="var(--cc-text)" mt={1} sx={clampLines(2)}>
                <Box as="span" className="cc-num" color="var(--cc-text-soft)">
                  {a.lektion(tr.naechste.nummer)}
                </Box>
                <Box as="span" color="var(--cc-text-3)" mx={2} aria-hidden>
                  ·
                </Box>
                {tr.naechste.titel}
              </Text>
            </>
          ) : (
            <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)">
              {naechsteZeile}
            </Text>
          )}
        </Box>
        {knopf ? (
          <Button
            as={knopf.extern ? "a" : NextLink}
            href={knopf.href}
            {...(knopf.extern ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            // Smaragd ohne Glow: das Dashboard läuft auf `.cc-neutral`.
            variant="smaragd"
            boxShadow="none"
            _hover={{ boxShadow: "none", filter: "brightness(1.1)" }}
            flexShrink={0}
            leftIcon={knopf.icon === "whatsapp" ? <MessageCircle size={17} strokeWidth={2} /> : undefined}
            rightIcon={knopf.icon ? undefined : <ArrowRight size={17} strokeWidth={2} />}
          >
            {knopf.text}
          </Button>
        ) : null}
      </Flex>
    </DashCard>
  );
}

/* ─── Karte „Dein Trading Blueprint“ ────────────────────────────────────── */

/** Auch auf `/kostenloses-training` unter Player und Lektionsliste (volle Breite, `kompakt`). */
export function BlueprintKarte({
  pdf,
  video,
  frei,
  kompakt = false,
  ...rest
}: BoxProps & { pdf: boolean; video: boolean; frei: boolean; kompakt?: boolean }) {
  const b = t.blueprint;
  if (kompakt) return <BlueprintLeiste pdf={pdf} video={video} frei={frei} {...rest} />;
  return (
    <DashCard label={b.label} labelId="free-blueprint" icon={<FileText size={17} strokeWidth={1.6} />} {...rest}>
      <Flex gap={{ base: 4, md: 5 }} align={{ base: "flex-start", sm: "center" }} direction={{ base: "column", sm: "row" }} flex="1">
        <Box as={NextLink} href={BLUEPRINT_PFAD} aria-label="Zum Trading Blueprint" flexShrink={0} alignSelf={{ base: "center", sm: "auto" }}>
          <BlueprintCover breite={140} />
        </Box>
        <Stack spacing={3} minW={0} flex="1">
          <Text fontSize={{ base: "18px", md: "20px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
            {b.titel}
          </Text>
          {/* Gesperrt: statt der Beschreibung steht hier, wann freigeschaltet wird. */}
          <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)">
            {frei ? b.text : b.gesperrtErklaerung}
          </Text>
          <Stack spacing={3} pt={1} align="flex-start">
            {!frei ? (
              // Erst nach dem kompletten kostenlosen Kurs (Feedback 14.11.2026). Kurzer Text, damit nichts übersteht.
              <Button
                as={NextLink}
                href={TRAINING_VIDEOS_PFAD}
                variant="line"
                w="100%"
                h="auto"
                minH="44px"
                py={2}
                whiteSpace="normal"
                leftIcon={<Lock size={16} strokeWidth={1.8} />}
              >
                {b.gesperrtKurz}
              </Button>
            ) : pdf ? (
              <Button
                as="a"
                href={BLUEPRINT_DOWNLOAD_PFAD}
                variant="line"
                w="100%"
                color="var(--cc-gold-light)"
                borderColor="var(--cc-gold-line)"
                leftIcon={<Download size={17} strokeWidth={1.8} />}
              >
                {b.herunterladen}
              </Button>
            ) : (
              <Button variant="line" w="100%" isDisabled leftIcon={<Download size={17} strokeWidth={1.8} />}>
                {b.inKuerze}
              </Button>
            )}
            {video && frei ? (
              <Flex
                as={NextLink}
                href={`${BLUEPRINT_PFAD}#video`}
                role="group"
                align="center"
                gap={2}
                px={3}
                py={1.5}
                borderRadius="full"
                border="1px solid var(--cc-line-strong)"
                fontSize="14px"
                color="var(--cc-text-soft)"
                transition="color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)"
                _hover={{ color: "var(--cc-text)", borderColor: "rgba(255, 255, 255, 0.28)" }}
              >
                <CirclePlay size={16} strokeWidth={1.6} aria-hidden />
                {b.video}
                <Box as="span" display="inline-flex" transition="transform 200ms var(--cc-ease)" _groupHover={{ transform: "translateX(2px)" }}>
                  <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
                </Box>
              </Flex>
            ) : null}
          </Stack>
        </Stack>
      </Flex>
    </DashCard>
  );
}

/**
 * Kompakte Blueprint-Karte für `/kostenloses-training` (Feedback 14.11.2026):
 * steht in der Lektionsspalte direkt unter der Videoliste (≈ 340 px breit).
 * Cover links, daneben Titel und Satz, die Aktionen darunter in voller Breite.
 * Kante und Lichtlinie oben in Smaragd (`.cc-card--smaragd`, grauer Grund).
 * Dieselben Zustände wie die Karte (gesperrt, PDF, in Kürze).
 */
function BlueprintLeiste({ pdf, video, frei, ...rest }: BoxProps & { pdf: boolean; video: boolean; frei: boolean }) {
  const b = t.blueprint;
  return (
    <Stack as="section" aria-label={b.label} className="cc-card cc-card--smaragd" p={5} spacing={4} {...rest}>
      <Flex gap={4} align="center">
        <Box as={NextLink} href={BLUEPRINT_PFAD} aria-label="Zum Trading Blueprint" flexShrink={0}>
          <BlueprintCover breite={110} />
        </Box>
        <Box minW={0}>
          <Text fontSize="11px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-smaragd-hell)">
            {b.label}
          </Text>
          <Text fontSize="16px" fontWeight={600} lineHeight={1.3} color="var(--cc-text)" mt={1.5}>
            {b.titel}
          </Text>
          {/* Gesperrt: statt der Beschreibung steht hier, wann freigeschaltet wird. */}
          <Text fontSize="13px" lineHeight={1.5} color="var(--cc-text-2)" mt={1.5} sx={clampLines(4)}>
            {frei ? b.text : b.gesperrtErklaerung}
          </Text>
        </Box>
      </Flex>
      <Stack spacing={2}>
        {!frei ? (
          <Button as={NextLink} href={TRAINING_VIDEOS_PFAD} variant="line" size="sm" h="auto" minH="40px" py={2} w="100%" whiteSpace="normal" textAlign="center" leftIcon={<Lock size={15} strokeWidth={1.8} />}>
            {b.gesperrtKurz}
          </Button>
        ) : pdf ? (
          <Button
            as="a"
            href={BLUEPRINT_DOWNLOAD_PFAD}
            variant="line"
            size="sm"
            h="auto"
            minH="40px"
            py={2}
            w="100%"
            whiteSpace="normal"
            color="var(--cc-gold-light)"
            borderColor="var(--cc-gold-line)"
            leftIcon={<Download size={15} strokeWidth={1.8} />}
          >
            {b.herunterladen}
          </Button>
        ) : (
          <Button variant="line" size="sm" h="auto" minH="40px" py={2} w="100%" whiteSpace="normal" textAlign="center" isDisabled leftIcon={<Download size={15} strokeWidth={1.8} />}>
            {b.inKuerze}
          </Button>
        )}
        {video && frei ? (
          <Button as={NextLink} href={`${BLUEPRINT_PFAD}#video`} variant="ghost" size="sm" h="auto" minH="40px" py={2} w="100%" whiteSpace="normal" textAlign="center" color="var(--cc-text-soft)" leftIcon={<CirclePlay size={15} strokeWidth={1.6} />}>
            {b.video}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}

/* ─── Karte „Dein Lernweg“ ──────────────────────────────────────────────── */

function LernwegKachel({ l }: { l: FreeLektion }) {
  const aktuell = l.status === "aktuell";
  const fertig = l.status === "fertig";
  const gesperrt = l.status === "gesperrt";
  const inhalt = (
    <>
      <Flex
        w="34px"
        h="34px"
        flexShrink={0}
        borderRadius="full"
        align="center"
        justify="center"
        border="1.5px solid"
        // Smaragd: erledigt = gefüllter Haken, aktuell = Smaragd-Ring.
        borderColor={fertig || aktuell ? "var(--cc-smaragd-line)" : "var(--cc-line-strong)"}
        bg={fertig ? "var(--cc-smaragd-wash)" : "transparent"}
        color={fertig || aktuell ? "var(--cc-smaragd-hell)" : gesperrt ? "var(--cc-text-3)" : "var(--cc-text-soft)"}
        className="cc-num"
        fontSize="13px"
        fontWeight={600}
      >
        {fertig ? <Check size={16} strokeWidth={2.2} aria-hidden /> : String(l.nummer).padStart(2, "0")}
      </Flex>
      <Box minW={0}>
        <Text
          fontSize="14px"
          fontWeight={aktuell ? 600 : 500}
          lineHeight={1.3}
          color={gesperrt ? "var(--cc-text-3)" : "var(--cc-text)"}
          sx={clampLines(2)}
        >
          {l.titel}
        </Text>
        {l.optional ? (
          <Text fontSize="11px" letterSpacing="0.06em" textTransform="uppercase" color="var(--cc-text-3)" mt="2px">
            {t.lernweg.optional}
          </Text>
        ) : null}
      </Box>
    </>
  );

  const rahmen = {
    display: "flex",
    alignItems: "center",
    gap: 3,
    minH: "64px",
    h: "100%",
    px: 3,
    py: 2.5,
    borderRadius: "10px",
    border: "1px solid",
    // Neutrales Dashboard (`.cc-neutral`): die aktuelle Lektion hebt sich über
    // Fläche und eine dünne Smaragd-Kante ab, nicht über Gold-Rahmen oder Schein.
    borderColor: aktuell ? "var(--cc-smaragd-line)" : "var(--cc-line)",
    bg: aktuell ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.015)",
  } as const;

  const zugaenglich = `Lektion ${l.nummer}: ${l.titel}${fertig ? " (abgeschlossen)" : aktuell ? " (als nächstes)" : gesperrt ? ` (${t.lernweg.gesperrt.toLowerCase()})` : ""}`;

  return l.href ? (
    <Box
      as={NextLink}
      href={l.href}
      aria-label={zugaenglich}
      aria-current={aktuell ? "step" : undefined}
      {...rahmen}
      transition="background-color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)"
      _hover={{ bg: "rgba(255, 255, 255, 0.07)", borderColor: "rgba(255, 255, 255, 0.24)" }}
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
    >
      {inhalt}
    </Box>
  ) : (
    <Box aria-label={zugaenglich} role="group" {...rahmen} opacity={gesperrt ? 0.75 : 1}>
      {inhalt}
    </Box>
  );
}

function LernwegKarte({ daten, ...rest }: BoxProps & { daten: FreeDashboardDaten }) {
  const tr = daten.training;
  return (
    <DashCard
      label={t.lernweg.label}
      labelId="free-lernweg"
      icon={<Layers size={17} strokeWidth={1.6} />}
      badge={
        <>
          {/* Schmal nur die Zahl, sonst schiebt der Satz den Kartentitel aus der Zeile. */}
          <Box display={{ base: "block", md: "none" }}>
            <KopfNotiz>{`${Math.min(tr.gesehen, tr.gesamt)}/${tr.gesamt}`}</KopfNotiz>
          </Box>
          <Box display={{ base: "none", md: "block" }}>
            <KopfNotiz>{t.lernweg.stand(Math.min(tr.gesehen, tr.gesamt), tr.gesamt)}</KopfNotiz>
          </Box>
        </>
      }
      {...rest}
    >
      {/* Mobil waagerecht scrollbar statt fünf winziger Spalten. */}
      <Box overflowX={{ base: "auto", lg: "visible" }} mx={{ base: -1, lg: 0 }} px={{ base: 1, lg: 0 }} pb={{ base: 1, lg: 0 }} className="hide-scrollbar">
        <Grid
          as="ol"
          listStyleType="none"
          templateColumns={{
            base: `repeat(${tr.lektionen.length}, minmax(180px, 1fr))`,
            lg: `repeat(${tr.lektionen.length}, minmax(0, 1fr))`,
          }}
          gap={3}
        >
          {tr.lektionen.map((l) => (
            <Box as="li" key={l.nummer} minW={0}>
              <LernwegKachel l={l} />
            </Box>
          ))}
        </Grid>
      </Box>
    </DashCard>
  );
}

/* ─── Karte „Capital Circle Vitrine“ ────────────────────────────────────── */

function VitrineKarte(props: BoxProps) {
  return (
    <Flex
      as={NextLink}
      href={VITRINE_PFAD}
      className="cc-card"
      role="group"
      align="center"
      gap={{ base: 4, md: 5 }}
      p={{ base: 5, md: 6 }}
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
      {...props}
    >
      <Box display={{ base: "none", sm: "block" }}>
        <IconTile>
          <Box color="var(--cc-gold-light)">
            <Trophy size={26} strokeWidth={1.5} />
          </Box>
        </IconTile>
      </Box>
      <Box flex="1" minW={0}>
        <Text as="h2" fontSize={{ base: "18px", md: "20px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
          {t.vitrine.titel}
        </Text>
        <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)" mt={1}>
          {t.vitrine.text}
        </Text>
      </Box>
      <Flex
        w="40px"
        h="40px"
        flexShrink={0}
        align="center"
        justify="center"
        borderRadius="var(--cc-radius)"
        border="1px solid var(--cc-gold-line)"
        color="var(--cc-gold-light)"
        transition="transform 200ms var(--cc-ease)"
        _groupHover={{ transform: "translateX(2px)" }}
        aria-hidden
      >
        <ArrowRight size={18} strokeWidth={1.75} />
      </Flex>
    </Flex>
  );
}

/**
 * Dashboard für Free-Mitglieder nach Emres Mockup (08.11.2026): Begrüßung mit
 * Badge, „Deine Ausbildung“ und „Dein Trading Blueprint“ nebeneinander, darunter
 * „Dein Lernweg“ und die Vitrine. Zahlende sehen weiter `DashboardView`.
 *
 * Läuft wie das übrige Dashboard in `.cc-neutral`: keine Gold-Kanten, kein
 * Schein — Gold nur in Schrift, Icons und Knöpfen.
 */
export function FreeDashboardView({
  daten,
  termin = null,
  terminNeu = false,
}: {
  daten: FreeDashboardDaten;
  /** Gebuchtes Analysegespräch (17.11.2026); `terminNeu` = direkt aus der Buchung, Karte wartet auf den Webhook. */
  termin?: TerminKarteDaten | null;
  terminNeu?: boolean;
}) {
  return (
    <Box className="cc-neutral">
      <Box as="header" {...rise(0)}>
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={4} wrap="wrap">
          <Box minW={0}>
            <Heading
              as="h1"
              fontSize={{ base: "28px", md: "36px" }}
              lineHeight={1.15}
              fontWeight={600}
              letterSpacing="-0.01em"
              color="var(--cc-text)"
            >
              Hallo{" "}
              <Box as="span" color="var(--cc-gold-light)">
                {daten.firstName}
              </Box>
              .
            </Heading>
            <Text fontSize={{ base: "16px", md: "18px" }} color="var(--cc-text-2)" mt={2}>
              {t.untertitel}
            </Text>
          </Box>
          <Box
            as="span"
            px={4}
            py={2.5}
            borderRadius="var(--cc-radius)"
            bg="rgba(255, 255, 255, 0.04)"
            border="1px solid var(--cc-line)"
            color="var(--cc-gold-light)"
            fontSize="13px"
            fontWeight={600}
            letterSpacing="0.08em"
            textTransform="uppercase"
            lineHeight={1}
            flexShrink={0}
          >
            {t.badge}
          </Box>
        </Flex>
        <Box h="1px" bg="var(--cc-line)" mt={{ base: 5, md: 6 }} mb={{ base: 6, md: 7 }} />
      </Box>

      {/* Nur für Konten aus dem Whop-Umzug, sonst leer. */}
      <UmzugCard mb={5} {...rise(0)} />
      {daten.showApplyPrompt ? <ApplyPrompt mb={5} {...rise(0)} /> : null}
      {termin || terminNeu ? (
        <Box mb={5} {...rise(0)}>
          <TerminKarte termin={termin} neu={terminNeu} />
        </Box>
      ) : null}

      <Stack spacing={5}>
        <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1.3fr) minmax(0, 1fr)" }} gap={5}>
          <Flex minW={0} {...rise(1)}>
            <AusbildungKarte daten={daten} />
          </Flex>
          <Flex minW={0} {...rise(2)}>
            <BlueprintKarte pdf={daten.blueprint.pdf} video={daten.blueprint.video} frei={daten.blueprint.frei} />
          </Flex>
        </Grid>
        <Box {...rise(3)}>
          <LernwegKarte daten={daten} />
        </Box>
        <Box {...rise(4)}>
          <VitrineKarte />
        </Box>
      </Stack>
    </Box>
  );
}
