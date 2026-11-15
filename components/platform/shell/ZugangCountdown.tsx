"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { freeNavTexte } from "@/config/free-bereich";
import { createClient } from "@/lib/supabase/client";

/**
 * Countdown des 30-Tage-Trainingszugangs, eigene Kachel direkt unter
 * „Free Member" in der Seitenleiste (Feedback 14.11.2026).
 *
 * Liest die eigene Zeile aus `training_zugang` (RLS `training_zugang_eigener`).
 * Ende = Verlängerungsende, falls die Verlängerung aktiv ist, sonst
 * `original_ende_am` — dieselbe Regel wie `aktuellesEnde` in
 * `lib/training/zugang.ts` (dort nicht importiert, weil das Modul Server-Helfer
 * mitzieht). Ohne Zeile, nach Ablauf oder ohne Migration 110 erscheint nichts.
 *
 * Dezent: Datentinte, kein Gold, kein Schein. Die Sekunden laufen erst im
 * Browser — Server und Client würden sonst verschiedene Werte rendern.
 */

type Fenster = { start: number; ende: number };

type ZugangZeile = {
  freigeschaltet_am: string;
  original_ende_am: string;
  verlaengerung_status: string | null;
  verlaengerung_ende_am: string | null;
};

function useZugangFenster(): Fenster | null {
  const [fenster, setFenster] = useState<Fenster | null>(null);
  useEffect(() => {
    let weg = false;
    void (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data, error } = await supabase
        .from("training_zugang")
        .select("freigeschaltet_am,original_ende_am,verlaengerung_status,verlaengerung_ende_am")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (weg || error || !data) return;
      const z = data as ZugangZeile;
      const ende = z.verlaengerung_status === "aktiv" && z.verlaengerung_ende_am ? z.verlaengerung_ende_am : z.original_ende_am;
      setFenster({ start: new Date(z.freigeschaltet_am).getTime(), ende: new Date(ende).getTime() });
    })();
    return () => {
      weg = true;
    };
  }, []);
  return fenster;
}

const zwei = (n: number) => String(n).padStart(2, "0");

export function ZugangCountdown() {
  const fenster = useZugangFenster();
  const [jetzt, setJetzt] = useState<number | null>(null);

  useEffect(() => {
    if (!fenster) return;
    const tick = () => setJetzt(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [fenster]);

  if (!fenster || jetzt === null) return null;
  const rest = fenster.ende - jetzt;
  if (rest <= 0) return null;

  const sek = Math.floor(rest / 1000);
  const teile = [
    { wert: String(Math.floor(sek / 86_400)), einheit: "T" },
    { wert: zwei(Math.floor((sek % 86_400) / 3600)), einheit: "Std" },
    { wert: zwei(Math.floor((sek % 3600) / 60)), einheit: "Min" },
    { wert: zwei(sek % 60), einheit: "Sek" },
  ];
  const gesamt = fenster.ende - fenster.start;
  const anteil = gesamt > 0 ? Math.min(100, Math.max(0, (rest / gesamt) * 100)) : 0;
  const datum = new Date(fenster.ende).toLocaleDateString("de-DE", { day: "numeric", month: "long", timeZone: "Europe/Berlin" });
  const tage = Math.floor(sek / 86_400);

  return (
    <Box
      px="14px"
      py="12px"
      mt={-3}
      mb={6}
      border="1px solid var(--cc-line)"
      borderRadius="var(--cc-radius-lg)"
      bg="rgba(255, 255, 255, 0.015)"
      flexShrink={0}
      role="timer"
      aria-label={`${freeNavTexte.countdownTitel}: noch ${tage} Tage, endet am ${datum}`}
    >
      <Text fontSize="11px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-3)">
        {freeNavTexte.countdownTitel}
      </Text>
      <Flex className="cc-num" mt={2} justify="space-between" align="baseline" aria-hidden>
        {teile.map((x) => (
          <Box as="span" key={x.einheit} display="inline-flex" alignItems="baseline" gap="3px">
            <Box as="span" fontSize="16px" fontWeight={600} color="var(--cc-ink)">
              {x.wert}
            </Box>
            <Box as="span" fontSize="10px" color="var(--cc-text-3)">
              {x.einheit}
            </Box>
          </Box>
        ))}
      </Flex>
      <Box mt={2.5} h="2px" borderRadius="full" bg="var(--cc-track)" overflow="hidden" aria-hidden>
        <Box h="100%" w={`${anteil}%`} bg="rgba(209, 208, 212, 0.45)" transition="width 1s linear" />
      </Box>
      <Text fontSize="11px" color="var(--cc-text-3)" mt={2}>
        {freeNavTexte.countdownEnde(datum)}
      </Text>
    </Box>
  );
}
