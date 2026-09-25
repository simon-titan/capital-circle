"use client";

import { Box, Button, Center, Spinner, Stack, Text } from "@chakra-ui/react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { FRAGEN, FRAGEN_FELDER } from "@/config/onboarding";
import { SkyArchBackground } from "@/components/layout/SkyArchBackground";
import { FrageStep, StartklarStep, WillkommenStep } from "@/components/onboarding/IcpSchritte";
import { LoginStep } from "@/components/onboarding/LoginStep";
import { UsageAgreementStep } from "@/components/onboarding/UsageAgreementStep";

const easePremium = [0.16, 1, 0.3, 1] as const;

/** Schrittwechsel: seitlich mit Weichzeichnung. */
const stepVariants: Variants = {
  initial: { opacity: 0, x: 36, filter: "blur(14px)" },
  // Kein Rest-Filter: sonst verlieren die Glas-Karten ihren Blur auf das Sternenfeld.
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
  exit: { opacity: 0, x: -32, filter: "blur(12px)" },
};

/** Bei `prefers-reduced-motion` nur überblenden. */
const reducedStepVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Ablauf auf `/einsteig`:
 *
 *   login → willkommen → frage 1…5 → vereinbarung (falls offen) → startklar → Dashboard
 *
 * Welche Schritte offen sind, sagt `GET /api/onboarding/status` — nach
 * derselben Regel wie die Weiche in `proxy.ts` (`lib/onboarding/weiche.ts`).
 * Bestandsmitglieder (Konto vor dem Onboarding-Start) sehen statt
 * „Willkommen" eine kurze Einleitung und gehen nach den Fragen direkt ins
 * Dashboard, ohne „Du bist startklar.".
 *
 * Jede Antwort wird sofort gespeichert; wer abbricht, landet beim nächsten
 * Mal bei der ersten offenen Frage.
 */
type Phase = "loading" | "login" | "willkommen" | "frage" | "vereinbarung" | "startklar" | "fehler";

type Status = {
  angemeldet: boolean;
  erledigt?: boolean;
  fragenOffen?: boolean;
  vereinbarungOffen?: boolean;
  neu?: boolean;
  gestartet?: boolean;
  antworten?: Record<string, string | null>;
  sonstiges?: string | null;
};

type OnboardingFlowProps = {
  loginFooter?: ReactNode;
};

async function ladeStatus(): Promise<Status> {
  const res = await fetch("/api/onboarding/status", { cache: "no-store" });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return (await res.json()) as Status;
}

function ersteOffeneFrage(antworten: Record<string, string | null>): number {
  const i = FRAGEN_FELDER.findIndex((f) => !antworten[f]);
  return i === -1 ? FRAGEN_FELDER.length : i;
}

/**
 * Voller Seitenwechsel statt `router.replace`: Die Weiche hängt an `proxy.ts`,
 * und die greift nur bei einer echten Navigation.
 */
function zumDashboard() {
  window.location.assign("/dashboard");
}

export function OnboardingFlow({ loginFooter }: OnboardingFlowProps = {}) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<Status | null>(null);
  const [antworten, setAntworten] = useState<Record<string, string | null>>({});
  const [sonstiges, setSonstiges] = useState<string | null>(null);
  const [frageIndex, setFrageIndex] = useState(0);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  /** Nach den Fragen: Vereinbarung, falls offen, dann Startklar (neu) oder Dashboard (Bestand). */
  const nachDenFragen = useCallback((s: Status) => {
    if (s.vereinbarungOffen) {
      setPhase("vereinbarung");
      return;
    }
    if (s.neu) {
      setPhase("startklar");
      return;
    }
    zumDashboard();
  }, []);

  const sendeAntwort = useCallback(
    async (feld: string, wert: string, freitext?: string | null): Promise<{ ok: boolean; fertig: boolean }> => {
      try {
        const res = await fetch("/api/onboarding/antwort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feld, wert, sonstiges: freitext ?? null }),
        });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; fertig?: boolean; fehler?: string };
        if (!res.ok || !json.ok) {
          setFehler(json.fehler ?? "Das hat nicht geklappt. Bitte versuch es noch einmal.");
          return { ok: false, fertig: false };
        }
        return { ok: true, fertig: Boolean(json.fertig) };
      } catch {
        setFehler("Keine Verbindung. Bitte versuch es noch einmal.");
        return { ok: false, fertig: false };
      }
    },
    [],
  );

  const wendeStatusAn = useCallback(
    async (s: Status) => {
      setStatus(s);
      if (!s.angemeldet) {
        setPhase("login");
        return;
      }
      if (s.erledigt) {
        zumDashboard();
        return;
      }
      if (!s.fragenOffen) {
        // Nur die Vereinbarung ist offen — wie vor dem Onboarding.
        setPhase(s.vereinbarungOffen ? "vereinbarung" : "startklar");
        return;
      }
      const a = s.antworten ?? {};
      setAntworten(a);
      setSonstiges(s.sonstiges ?? null);
      const offen = ersteOffeneFrage(a);
      if (offen >= FRAGEN.length) {
        // Alles beantwortet, aber der Abschluss wurde nicht gespeichert
        // (z. B. Verbindung weg nach der letzten Antwort): letzte nochmal senden.
        const letzte = FRAGEN_FELDER[FRAGEN_FELDER.length - 1]!;
        const ergebnis = await sendeAntwort(letzte, a[letzte]!, s.sonstiges ?? null);
        if (ergebnis.fertig) {
          nachDenFragen(s);
          return;
        }
        setFrageIndex(FRAGEN.length - 1);
        setPhase("frage");
        return;
      }
      setFrageIndex(offen);
      setPhase(!s.gestartet && offen === 0 ? "willkommen" : "frage");
    },
    [nachDenFragen, sendeAntwort],
  );

  const pruefe = useCallback(async () => {
    setPhase("loading");
    try {
      await wendeStatusAn(await ladeStatus());
    } catch {
      setPhase("fehler");
    }
  }, [wendeStatusAn]);

  // Beim ersten Rendern steht die Phase schon auf „loading“; State erst im Callback setzen.
  useEffect(() => {
    let cancelled = false;
    ladeStatus()
      .then((s) => {
        if (!cancelled) void wendeStatusAn(s);
      })
      .catch(() => {
        if (!cancelled) setPhase("fehler");
      });
    return () => {
      cancelled = true;
    };
  }, [wendeStatusAn]);

  const starte = () => {
    // Nicht auf die Antwort warten: Der Start ist nur ein Messpunkt.
    void fetch("/api/onboarding/start", { method: "POST" }).catch(() => undefined);
    setPhase("frage");
  };

  const beantworte = async (wert: string, freitext?: string | null) => {
    if (!status) return;
    const feld = FRAGEN_FELDER[frageIndex]!;
    setFehler(null);
    setSpeichert(true);
    const ergebnis = await sendeAntwort(feld, wert, freitext);
    setSpeichert(false);
    if (!ergebnis.ok) return;
    setAntworten((alt) => ({ ...alt, [feld]: wert }));
    if (feld === "discovery_source") setSonstiges(wert === "sonstiges" ? (freitext ?? null) : null);

    if (ergebnis.fertig) {
      nachDenFragen(status);
      return;
    }
    // Zur nächsten offenen Frage (wer zurückgegangen ist, springt wieder nach vorn).
    const naechste = FRAGEN_FELDER.findIndex((f, i) => i > frageIndex && !(f === feld ? wert : antworten[f]));
    setFrageIndex(naechste === -1 ? Math.min(frageIndex + 1, FRAGEN.length - 1) : naechste);
  };

  const phasenSchluessel = phase === "frage" ? `frage-${frageIndex}` : phase;

  return (
    <SkyArchBackground>
      {phase === "loading" ? (
        <Center minH="100vh">
          <Spinner
            size="xl"
            color="var(--cc-gold)"
            emptyColor="rgba(255, 255, 255, 0.08)"
            thickness="3px"
            speed="0.85s"
            label="Wird geladen"
          />
        </Center>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={phasenSchluessel}
            variants={reduceMotion ? reducedStepVariants : stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.2 : 0.48, ease: easePremium }}
            style={{ minHeight: "100vh" }}
          >
            {phase === "login" && <LoginStep onAuthenticated={pruefe} footer={loginFooter} />}
            {phase === "willkommen" && <WillkommenStep bestand={!status?.neu} onWeiter={starte} />}
            {phase === "frage" && (
              <FrageStep
                key={frageIndex}
                index={frageIndex}
                gewaehlt={antworten[FRAGEN_FELDER[frageIndex]!] ?? null}
                sonstiges={sonstiges}
                speichert={speichert}
                fehler={fehler}
                onAntwort={(wert, freitext) => void beantworte(wert, freitext)}
                onZurueck={
                  frageIndex > 0
                    ? () => {
                        setFehler(null);
                        setFrageIndex((i) => Math.max(0, i - 1));
                      }
                    : status?.gestartet
                      ? null
                      : () => setPhase("willkommen")
                }
              />
            )}
            {phase === "vereinbarung" && (
              <UsageAgreementStep onDone={status?.neu ? () => setPhase("startklar") : zumDashboard} />
            )}
            {phase === "startklar" && <StartklarStep onWeiter={zumDashboard} />}
            {phase === "fehler" && (
              <Center minH="100vh" px={4}>
                <Stack className="cc-card cc-card--still" p={{ base: 6, md: 8 }} maxW="420px" spacing={4} textAlign="center">
                  <Text fontSize="18px" fontWeight={600} color="var(--cc-text)">
                    Das hat nicht geladen.
                  </Text>
                  <Text fontSize="14px" color="var(--cc-text-2)" lineHeight={1.55}>
                    Prüf kurz deine Verbindung und versuch es noch einmal.
                  </Text>
                  <Box>
                    <Button variant="gold" onClick={() => void pruefe()}>
                      Erneut versuchen
                    </Button>
                  </Box>
                </Stack>
              </Center>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </SkyArchBackground>
  );
}
