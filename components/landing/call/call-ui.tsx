"use client";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { LeadFunnelTracking } from "@/components/marketing/DiscordQuestionsModal";
import { getOrCreateSessionId } from "@/lib/discord-funnel/video-tracking";
import { FunnelEyebrow, GoldWord } from "../DiscordFunnelChrome";
import { Reveal } from "../landing-ui";

/*
 * Kleine Bausteine der Call-Funnel-Seite `/call` (DESIGN.md v3.2 „Champagner
 * auf Graphit"). Alles Größere — Rahmen, Splash, Footer — kommt aus
 * `DiscordFunnelChrome.tsx`, damit `/call` neben `/termin` und `/discord`
 * nicht anders aussieht.
 */

/** utm_source-Fallback: markiert Leads und Besuche ohne UTM als Herkunft „Call-Funnel". */
export const CALL_LEAD_SOURCE = "call-funnel";

/**
 * Zerlegt einen Config-Text an `{…}` und gibt die markierten Teile über
 * `akzent` aus. So bleiben die Texte in `config/call-funnel.ts` reine Strings
 * und das JSX entscheidet, wie ein Akzent aussieht.
 */
export function mitAkzent(text: string, akzent: (teil: string, key: number) => ReactNode): ReactNode[] {
  return text.split(/(\{[^}]+\})/g).map((teil, i) =>
    teil.startsWith("{") && teil.endsWith("}") ? akzent(teil.slice(1, -1), i) : teil,
  );
}

/** Überschrift mit Gold-Wörtern aus `{…}`. */
export function akzentGold(text: string): ReactNode[] {
  return mitAkzent(text, (teil, key) => <GoldWord key={key}>{teil}</GoldWord>);
}

/** Zahl in Gold hell mit tabellarischen Ziffern (Case-Study-Titel). */
export function akzentZahl(text: string): ReactNode[] {
  return mitAkzent(text, (teil, key) => (
    <Box key={key} as="span" className="cc-num" color="var(--cc-gold-light)" fontWeight={600}>
      {teil}
    </Box>
  ));
}

/**
 * Abschnittskopf der Seite: Dachzeile zwischen zwei Lichtstrichen, Überschrift,
 * optional eine ruhige Zeile. Zentriert, wie alle Funnel-Seiten.
 */
export function CallSektionsKopf({
  eyebrow,
  headline,
  text,
  id,
  as = "h2",
}: {
  eyebrow?: ReactNode;
  headline: string;
  text?: string;
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Reveal>
      <Stack spacing={{ base: 4, md: 5 }} align="center" textAlign="center" maxW="760px" mx="auto">
        {/* Ein String wird zur Dachzeile mit Lichtstrichen; alles andere (z. B. die Pill im Abschluss) steht so da. */}
        {typeof eyebrow === "string" ? <FunnelEyebrow>{eyebrow}</FunnelEyebrow> : eyebrow}
        <Heading
          as={as}
          id={id}
          fontSize={as === "h1" ? { base: "30px", sm: "36px", md: "46px", lg: "52px" } : { base: "28px", md: "38px", lg: "42px" }}
          fontWeight={600}
          lineHeight={1.12}
          letterSpacing="-0.02em"
          color="var(--cc-text)"
          overflowWrap="break-word"
        >
          {akzentGold(headline)}
        </Heading>
        {text ? (
          <Text fontSize={{ base: "16px", md: "18px" }} lineHeight={1.65} color="var(--cc-text-2)" maxW="640px">
            {text}
          </Text>
        ) : null}
      </Stack>
    </Reveal>
  );
}

/** Einheitlicher Abschnittsrahmen: 16px Gutter mobil, Inhalt max. 1180px. */
export function CallSektion({
  id,
  children,
  labelledBy,
}: {
  id?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <Box
      as="section"
      id={id}
      aria-labelledby={labelledBy}
      w="100%"
      py={{ base: 14, md: 20 }}
      px={{ base: 4, md: 8, lg: 12 }}
      scrollMarginTop="24px"
    >
      <Box maxW="1180px" mx="auto">
        {children}
      </Box>
    </Box>
  );
}

/**
 * Tracking-Schnappschuss für Visit und Lead-Anlage (gleiche Form wie in
 * `TerminDirectClient`). Ohne UTM in der Adresse steht `call-funnel` als
 * utm_source — so taucht die Seite im Admin als eigener Kanal auf.
 */
export function readCallTracking(): LeadFunnelTracking {
  let params: URLSearchParams | null = null;
  let referrer: string | null = null;
  try {
    params = new URLSearchParams(window.location.search);
    referrer = document.referrer || null;
  } catch {
    // window/document nicht verfügbar
  }
  const p = (key: string) => params?.get(key) ?? null;
  return {
    session_id: getOrCreateSessionId(),
    utm_source: p("utm_source") ?? CALL_LEAD_SOURCE,
    utm_medium: p("utm_medium"),
    utm_campaign: p("utm_campaign"),
    utm_content: p("utm_content"),
    utm_term: p("utm_term"),
    referrer,
  };
}

/** Scrollt sanft zu einem Element — bei reduzierter Bewegung ohne Animation. */
export function scrolleZu(el: Element | null, block: ScrollLogicalPosition = "start") {
  if (!el) return;
  let ruhig = false;
  try {
    ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    // matchMedia fehlt — dann eben sanft
  }
  el.scrollIntoView({ behavior: ruhig ? "auto" : "smooth", block });
}
