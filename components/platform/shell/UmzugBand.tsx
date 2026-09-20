"use client";

import { Box, Button, Flex, IconButton, Text } from "@chakra-ui/react";
import { X } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { UMZUG_TON } from "@/components/platform/umzug-ton";
import { umzugAnzeige, UMZUG_CTA_HREF } from "@/lib/whop-umzug/stand";
import { useViewer } from "./viewer";

/**
 * Das Hinweisband für die Mitglieder aus dem Whop-Umzug.
 *
 * ── Wer es sieht ────────────────────────────────────────────────────────────
 *
 * Wer aus dem Umzug stammt (`profiles.whop_umzug_am`), bei uns noch nicht
 * abgeschlossen hat und dessen übernommener Zeitraum noch läuft. Die Regel
 * steht vollständig in `lib/whop-umzug/stand.ts` und wird einmal je
 * Seitenaufruf in der Schale ausgewertet (`viewer.tsx`).
 *
 * ── Warum es kein `.cc-card` ist ────────────────────────────────────────────
 *
 * Es steht auf **jeder** Seite des Mitgliederbereichs, also auch auf dem
 * Dashboard. Dort läuft alles unter `.cc-neutral` ohne Gold-Glow und ohne
 * Lichtkante (Nutzerwunsch 16.09.2026, siehe AGENTS.md), im Rest der App
 * tragen Karten beides. Eine Karte müsste also je nach Seite anders aussehen.
 * Ein Band ist keine Karte: flache Fläche, eine Kante, kein Schein. Damit
 * sieht es überall gleich aus, ohne die Ausnahme des Dashboards zu verletzen.
 * Gold-Schrift und Gold-Knopf bleiben, die sind auch dort erlaubt.
 *
 * ── Warum es auf dem Dashboard fehlt ───────────────────────────────────────
 *
 * Dort steht dieselbe Aussage als Karte ganz oben
 * (`components/platform/dashboard/UmzugCard.tsx`), aus derselben Abfrage und
 * mit demselben Wortlaut. Beides übereinander wäre derselbe Satz zweimal
 * untereinander, und zwar genau auf der Seite, auf der die meisten landen.
 * Das Band trägt den Hinweis überall dorthin, wo es die Karte nicht gibt.
 *
 * ── Wegklicken ─────────────────────────────────────────────────────────────
 *
 * Nur in der ruhigen Stufe und nur für die laufende Sitzung
 * (`sessionStorage`). Wird es dringend, kommt es zurück, auch wenn es vorher
 * weggeklickt wurde: Die Merknotiz wird gar nicht erst gelesen. Ein Hinweis,
 * den man für immer abstellen kann, hilft am Stichtag niemandem mehr.
 */

const MERKNOTIZ = "cc-whop-band-zu";

function lesenZu(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(MERKNOTIZ) === "1";
  } catch {
    // Privater Modus, gesperrte Site-Daten: dann bleibt das Band eben stehen.
    return false;
  }
}

function merkenZu(): void {
  try {
    window.sessionStorage.setItem(MERKNOTIZ, "1");
  } catch {
    // Ohne Merknotiz weiter; sie ist eine Bequemlichkeit, keine Bedingung.
  }
}

export function UmzugBand() {
  const { umzug } = useViewer();
  const pathname = usePathname() ?? "";
  /*
    Die Merknotiz wird beim Aufbau gelesen, nicht in einem Effekt. Ein Effekt
    wäre hier ein zweiter Durchlauf für nichts: Beim ersten Rendern steht der
    Stand ohnehin noch nicht fest (`umzug` ist null), das Band ist also
    unsichtbar, und bis es erscheint, ist der Wert längst da. Auf dem Server
    gibt `lesenZu()` falsch zurück, dort rendert das Band nie.
  */
  const [zu, setZu] = useState(lesenZu);
  const [offen, setOffen] = useState(false);
  const erklaerungId = useId();

  const wegklickbar = umzug?.stufe === "ruhig";

  if (!umzug) return null;
  if (pathname === "/dashboard") return null;
  if (wegklickbar && zu) return null;

  const a = umzugAnzeige(umzug);
  const ton = UMZUG_TON[a.stufe];
  /*
    Auf der Abonnement-Seite selbst führt der Knopf dorthin, wo man schon ist.
    Das Band bleibt trotzdem stehen: Der Stichtag ist genau dort nützlich, wo
    man zwischen den Paketen wählt.
  */
  const aufAboSeite = pathname.startsWith(UMZUG_CTA_HREF);

  return (
    <Box
      role="status"
      aria-label="Hinweis zu deiner Mitgliedschaft"
      position="relative"
      w="100%"
      minW={0}
      mb={{ base: 5, md: 6 }}
      p={{ base: 4, md: 5 }}
      border="1px solid"
      borderColor={ton.rand}
      borderRadius="var(--cc-radius-lg)"
      bg={ton.flaeche}
    >
      <Flex direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "center" }} gap={{ base: 4, md: 5 }}>
        {/* Platz für das Kreuz, das auf schmalen Geräten in der Ecke klebt. */}
        <Box minW={0} flex="1" pr={{ base: wegklickbar ? "32px" : 0, sm: 0 }}>
          <Flex align="center" gap={2.5}>
            <Box w="7px" h="7px" flexShrink={0} borderRadius="full" bg={ton.punkt} aria-hidden />
            <Text
              className="cc-num"
              fontSize="12px"
              lineHeight="16px"
              fontWeight={500}
              letterSpacing="0.12em"
              textTransform="uppercase"
              color={ton.frist}
            >
              {a.frist}
            </Text>
          </Flex>
          <Text
            className="cc-num"
            fontSize={{ base: "16px", md: "17px" }}
            fontWeight={600}
            lineHeight={1.35}
            color="var(--cc-text)"
            mt={2}
            overflowWrap="break-word"
          >
            {a.titel}
          </Text>
          <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)" mt={1} maxW="70ch" overflowWrap="break-word">
            {a.text}
          </Text>
        </Box>

        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ base: "stretch", sm: "center" }}
          gap={3}
          flexShrink={0}
        >
          {aufAboSeite ? null : (
            <Button
              as={NextLink}
              href={UMZUG_CTA_HREF}
              variant={a.stufe === "ruhig" ? "line" : "gold"}
              size="sm"
              flexShrink={0}
            >
              {a.cta}
            </Button>
          )}
          <Box
            as="button"
            type="button"
            onClick={() => setOffen((o) => !o)}
            aria-expanded={offen}
            aria-controls={erklaerungId}
            fontSize="13px"
            color="var(--cc-text-3)"
            textAlign={{ base: "center", sm: "left" }}
            whiteSpace="nowrap"
            transition="color 150ms var(--cc-ease)"
            _hover={{ color: "var(--cc-text-2)" }}
            _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px", borderRadius: "4px" }}
          >
            {offen ? "Erklärung schließen" : "Warum sehe ich das?"}
          </Box>
          {wegklickbar ? (
            /*
              Unterhalb von `sm` stapeln Knopf und Link untereinander, dort
              stünde das Kreuz ganz unten und damit weit weg von dem, was es
              schliesst. Also klebt es auf schmalen Geräten in der oberen
              rechten Ecke des Bands und läuft erst ab `sm` in der Zeile mit.
            */
            <IconButton
              aria-label="Hinweis für diese Sitzung ausblenden"
              icon={<X size={16} strokeWidth={1.75} />}
              variant="ghost"
              size="sm"
              position={{ base: "absolute", sm: "static" }}
              top="8px"
              right="8px"
              alignSelf={{ base: "flex-end", sm: "center" }}
              color="var(--cc-text-3)"
              _hover={{ bg: "rgba(255, 255, 255, 0.05)", color: "var(--cc-text)" }}
              onClick={() => {
                setZu(true);
                merkenZu();
              }}
            />
          ) : null}
        </Flex>
      </Flex>

      {offen ? (
        <Text
          id={erklaerungId}
          className="cc-num"
          fontSize="13px"
          lineHeight={1.6}
          color="var(--cc-text-2)"
          mt={4}
          pt={4}
          borderTop="1px solid var(--cc-line)"
          maxW="80ch"
          overflowWrap="break-word"
        >
          {a.erklaerung}
        </Text>
      ) : null}
    </Box>
  );
}
