"use client";

import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { CalendarDays } from "lucide-react";
import NextLink from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { rechtsPfade } from "@/config/legal";

interface CalendlyApi {
  initInlineWidget: (optionen: { url: string; parentElement: HTMLElement }) => void;
}

interface Props {
  /** Vollständige Calendly-URL inkl. Vorausfüllung und `utm_*`. */
  url: string;
  /** Hintergrund von Platzhalter und Lade-Overlay — passend zur umgebenden Fläche. */
  flaeche?: string;
  /** Höhe des eingebetteten Kalenders in Pixeln. */
  hoehe?: number;
}

/**
 * Calendly-Buchungskalender mit Zwei-Klick-Lösung.
 *
 * Bis 19.09.2026 lud jede Bestätigungsseite `widget.js` von
 * assets.calendly.com sofort beim Aufruf — der Browser sprach mit Calendly
 * (USA), bevor der Besucher irgendetwas entschieden hatte, und Calendly konnte
 * Cookies setzen. Jetzt steht dort zuerst ein Platzhalter mit Hinweis; Skript
 * und iframe kommen erst nach dem Klick auf „Termin-Kalender laden".
 * Genutzt auf `/bewerbung/danke`, `/discord/termin/danke` und
 * `/termin/danke`; die Datenschutzerklärung (Abschnitt „Bewerbungen, Anfragen
 * und Terminbuchung") beschreibt genau diesen Ablauf.
 *
 * Die Einbindung läuft über `Calendly.initInlineWidget()` statt über die
 * Klasse `calendly-inline-widget`: Das Auto-Init von `widget.js` greift nur
 * beim ersten Laden des Skripts. Kommt man per Client-Navigation ein zweites
 * Mal auf die Seite, ist das Skript schon da und der Kalender bliebe leer —
 * `onReady` von `next/script` läuft dagegen bei jedem Einhängen.
 *
 * Das Ereignis `calendly.event_scheduled` werten die Seiten selbst aus (eigener
 * `message`-Listener); hier geht es nur ums Laden.
 */
export function CalendlyZweiKlick({ url, flaeche = "var(--cc-surface)", hoehe = 700 }: Props) {
  const [geladen, setGeladen] = useState(false);
  const [bereit, setBereit] = useState(false);
  const ziel = useRef<HTMLDivElement>(null);

  const einbetten = useCallback(() => {
    const el = ziel.current;
    const calendly = (window as unknown as { Calendly?: CalendlyApi }).Calendly;
    // Schon ein iframe da (zweites `onReady` ohne Neu-Einhängen)? Dann nicht doppelt.
    if (!el || !calendly || el.querySelector("iframe")) return;
    calendly.initInlineWidget({ url, parentElement: el });
  }, [url]);

  // Lade-Overlay ausblenden, sobald Calendly sich meldet — spätestens nach 5 s.
  useEffect(() => {
    if (!geladen) return;
    const meldung = (e: MessageEvent) => {
      if (typeof e.data !== "object" || e.data === null) return;
      const ereignis = (e.data as { event?: unknown }).event;
      if (typeof ereignis === "string" && ereignis.startsWith("calendly.")) setBereit(true);
    };
    window.addEventListener("message", meldung);
    const zeit = window.setTimeout(() => setBereit(true), 5000);
    return () => {
      window.removeEventListener("message", meldung);
      window.clearTimeout(zeit);
    };
  }, [geladen]);

  if (!geladen) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        textAlign="center"
        gap={5}
        minH={{ base: "420px", md: "460px" }}
        px={{ base: 5, md: 10 }}
        py={10}
        bg={flaeche}
      >
        <Flex
          w="48px"
          h="48px"
          borderRadius="12px"
          align="center"
          justify="center"
          border="1px solid var(--cc-line-strong)"
          bg="rgba(255, 255, 255, 0.03)"
          color="var(--cc-text-soft)"
          aria-hidden
        >
          <CalendarDays size={22} strokeWidth={1.75} />
        </Flex>
        <Text fontSize={{ base: "17px", md: "19px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
          Termin-Kalender von Calendly
        </Text>
        <Text fontSize="14px" lineHeight={1.65} color="var(--cc-text-2)" maxW="520px">
          Die Terminbuchung läuft über Calendly (Calendly LLC, USA). Der Kalender wird erst geladen, wenn du auf den
          Knopf klickst. Dann stellt dein Browser eine Verbindung zu Calendly her und überträgt dabei deine
          IP-Adresse; zum Vorausfüllen übergeben wir gegebenenfalls deinen Vornamen und deine E-Mail-Adresse, und
          Calendly kann Cookies setzen. Mehr dazu in der{" "}
          <Box
            as={NextLink}
            href={`${rechtsPfade.datenschutz}#bewerbungen`}
            color="var(--cc-text-soft)"
            textDecoration="underline"
            textUnderlineOffset="2px"
            _hover={{ color: "var(--cc-text)" }}
          >
            Datenschutzerklärung
          </Box>
          .
        </Text>
        <Button variant="gold" size="lg" px={8} onClick={() => setGeladen(true)}>
          Termin-Kalender laden
        </Button>
      </Flex>
    );
  }

  return (
    <Box position="relative">
      {!bereit ? (
        <Flex
          position="absolute"
          inset={0}
          zIndex={1}
          direction="column"
          align="center"
          justify="center"
          gap={5}
          bg={flaeche}
          role="status"
        >
          <Box
            w="40px"
            h="40px"
            borderRadius="full"
            border="3px solid rgba(212, 176, 128, 0.15)"
            borderTopColor="var(--cc-gold)"
            aria-hidden
            sx={{
              animation: "calSpin 0.8s linear infinite",
              "@keyframes calSpin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          />
          <Text fontSize="14px" color="var(--cc-text-2)">
            Termine werden geladen…
          </Text>
        </Flex>
      ) : null}

      <div ref={ziel} style={{ minWidth: "320px", height: `${hoehe}px`, width: "100%" }} />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onReady={einbetten}
      />
    </Box>
  );
}
