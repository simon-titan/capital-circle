"use client";

import { Box, Flex, type FlexProps } from "@chakra-ui/react";
import NextLink from "next/link";
import { Fragment } from "react";
import { rechtsPfade, widerrufsfunktionPfad } from "@/config/legal";

/**
 * Rechtliche Links am Seitenende: Impressum · Datenschutz · AGB · Widerruf
 * und der Kündigungsbutton nach § 312k BGB.
 *
 * ── Warum kein `<nav>` ─────────────────────────────────────────────────────
 * Die Funnel-Seiten blenden per `LandingChromeStyles` / `FunnelPageStyles`
 * jedes `nav[aria-label]` aus (gedacht für die Plattform-Navigation). Ein
 * `<nav aria-label="Rechtliches">` wäre dort unsichtbar — ausgerechnet die
 * Links, die immer erreichbar sein müssen. Deshalb ein `div` mit
 * `role="navigation"`: für Screenreader dasselbe, für den Selektor nicht.
 *
 * ── „Verträge hier kündigen" ───────────────────────────────────────────────
 * Die Beschriftung ist gesetzlich vorgegeben (§ 312k Abs. 2 BGB) und muss gut
 * lesbar sein. Sie steht deshalb eine Stufe heller als die übrigen Links —
 * unauffällig, aber nicht versteckt. Das Ziel (`/kuendigen`) baut ein eigener
 * Arbeitsstrang; hier wird es nur verlinkt.
 *
 * `widerrufsfunktionPfad` (§ 356a BGB, „Vertrag widerrufen") erscheint erst,
 * wenn er in `config/legal.ts` gesetzt ist.
 */

type Eintrag = { href: string; label: string; betont?: boolean };

/**
 * `ohneVertragswege` laesst „Vertrag widerrufen" und „Vertraege hier kuendigen"
 * weg. Gedacht fuer die Kauf-Erfolgsseite: Wer gerade bezahlt hat, soll dort
 * nicht als Naechstes zwei Ausstiege angeboten bekommen. Beide Wege bleiben
 * auf jeder anderen Seite und im Konto erreichbar, die Pflicht nach
 * § 312k BGB ist damit gewahrt.
 */
function eintraege(ohneVertragswege = false): Eintrag[] {
  const liste: Eintrag[] = [
    { href: rechtsPfade.impressum, label: "Impressum" },
    { href: rechtsPfade.datenschutz, label: "Datenschutz" },
    { href: rechtsPfade.agb, label: "AGB" },
    { href: rechtsPfade.widerruf, label: "Widerruf" },
  ];
  if (ohneVertragswege) return liste;
  if (widerrufsfunktionPfad) liste.push({ href: widerrufsfunktionPfad, label: "Vertrag widerrufen", betont: true });
  liste.push({ href: rechtsPfade.kuendigen, label: "Verträge hier kündigen", betont: true });
  return liste;
}

export interface RechtsLinksProps extends FlexProps {
  /** `kompakt` = Sidebar: linksbündig, 12px. Standard = zentriert unter Seiteninhalten, 13px. */
  kompakt?: boolean;
  /** Ohne „Vertrag widerrufen" und „Verträge hier kündigen" (siehe `eintraege`). */
  ohneVertragswege?: boolean;
}

/** Nur die Linkzeile — zum Einsetzen in bestehende Fußbereiche. */
export function RechtsLinks({ kompakt = false, ohneVertragswege = false, ...rest }: RechtsLinksProps) {
  const liste = eintraege(ohneVertragswege);
  return (
    <Flex
      role="navigation"
      aria-label="Rechtliches"
      wrap="wrap"
      justify={kompakt ? "flex-start" : "center"}
      align="center"
      columnGap={kompakt ? 2 : 2.5}
      rowGap={1}
      fontSize={kompakt ? "12px" : "13px"}
      lineHeight={1.6}
      {...rest}
    >
      {liste.map((e, i) => (
        <Fragment key={e.href}>
          {i > 0 ? (
            <Box as="span" aria-hidden color="var(--cc-text-3)" opacity={0.6}>
              ·
            </Box>
          ) : null}
          <Box
            as={NextLink}
            href={e.href}
            color={e.betont ? "var(--cc-text-2)" : "var(--cc-text-3)"}
            fontWeight={e.betont ? 500 : 400}
            whiteSpace="nowrap"
            transition="color 150ms var(--cc-ease)"
            _hover={{ color: "var(--cc-text)" }}
            _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px", borderRadius: "4px" }}
          >
            {e.label}
          </Box>
        </Fragment>
      ))}
    </Flex>
  );
}

/**
 * Eigenständige Fußzeile für Seiten ohne eigenen Fußbereich: Haarlinie oben,
 * Linkzeile, Luft nach unten.
 */
export function RechtsFusszeile({ ohneLinie = false }: { ohneLinie?: boolean }) {
  return (
    <Box
      as="footer"
      position="relative"
      zIndex={1}
      px={{ base: 4, md: 8 }}
      pt={ohneLinie ? 4 : 6}
      pb={8}
      borderTop={ohneLinie ? undefined : "1px solid var(--cc-line)"}
    >
      <RechtsLinks maxW="720px" mx="auto" />
    </Box>
  );
}
