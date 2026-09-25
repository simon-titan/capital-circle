"use client";

import { Box, Button, HStack, Stack, Text, Textarea } from "@chakra-ui/react";
import { ArrowLeft, Check } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FRAGEN, SONSTIGES_MAX, type Frage } from "@/config/onboarding";
import { OnboardingHeading } from "@/components/onboarding/OnboardingParts";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

/**
 * Die Bildschirme des Kunden-Onboardings (Plan: docs/plaene/onboarding-kunde.md):
 * Start, eine Frage pro Screen, „Du bist startklar." — Vollbild auf dem
 * Sternenhimmel von `/einsteig`, eine Hero-Karte mit Gold-Kante. Keine Tour,
 * kein Video, kein Konfetti.
 */

function Buehne({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return (
    <Stack
      minH="100dvh"
      w="full"
      align="center"
      justify="center"
      px={{ base: 4, md: 6 }}
      py={{ base: 8, md: 10 }}
      spacing={0}
    >
      <Stack
        as="section"
        aria-labelledby={labelledBy}
        className="cc-card cc-card--hero cc-card--still"
        w="full"
        maxW="600px"
        p={{ base: 6, md: 9 }}
        spacing={{ base: 6, md: 7 }}
      >
        {children}
      </Stack>
    </Stack>
  );
}

const fliesstext = {
  fontSize: { base: "15px", md: "16px" },
  lineHeight: 1.65,
  color: "var(--cc-text-2)",
  textAlign: "center" as const,
};

/* ── Start ───────────────────────────────────────────────────────────────── */

export function WillkommenStep({ bestand, onWeiter }: { bestand: boolean; onWeiter: () => void }) {
  return (
    <Buehne labelledBy="willkommen-titel">
      <OnboardingHeading id="willkommen-titel" title={bestand ? "Fünf kurze Fragen." : "Willkommen bei Capital Circle."} />
      <Text {...fliesstext} maxW="46ch" mx="auto">
        {bestand
          ? "Damit wir dich gezielter unterstützen können, möchten wir kurz wissen, wo du aktuell stehst. Das dauert keine zwei Minuten, danach geht es direkt weiter auf die Plattform."
          : "Bevor du startest, möchten wir kurz wissen, wo du aktuell stehst. Danach zeigen wir dir genau, wie du beginnen solltest."}
      </Text>
      <Button {...glassPrimaryButtonProps} onClick={onWeiter} autoFocus>
        Weiter
      </Button>
    </Buehne>
  );
}

/* ── Fortschritt „1 von 5" ──────────────────────────────────────────────── */

function Fortschritt({ nummer, gesamt }: { nummer: number; gesamt: number }) {
  return (
    <Stack spacing={2.5} align="center">
      <Text
        fontSize="12px"
        fontWeight={500}
        letterSpacing="0.12em"
        textTransform="uppercase"
        color="var(--cc-gold-light)"
        className="cc-num"
        aria-live="polite"
      >
        {nummer} von {gesamt}
      </Text>
      <HStack spacing={1.5} w="full" maxW="240px" aria-hidden>
        {Array.from({ length: gesamt }, (_, i) => (
          <Box
            key={i}
            flex={1}
            h="4px"
            borderRadius="full"
            bg={i < nummer ? "var(--cc-gold-grad)" : "var(--cc-track)"}
            transition="background 240ms var(--cc-ease)"
          />
        ))}
      </HStack>
    </Stack>
  );
}

/* ── Eine Frage ──────────────────────────────────────────────────────────── */

type FrageStepProps = {
  index: number;
  gewaehlt: string | null;
  sonstiges: string | null;
  speichert: boolean;
  fehler: string | null;
  onAntwort: (wert: string, sonstiges?: string | null) => void;
  onZurueck: (() => void) | null;
};

/** Nach dem Tippen kurz stehen lassen, damit die Wahl sichtbar ist, dann weiter. */
const WEITER_NACH_MS = 250;

export function FrageStep({ index, gewaehlt, sonstiges, speichert, fehler, onAntwort, onZurueck }: FrageStepProps) {
  const frage: Frage = FRAGEN[index]!;
  const [auswahl, setAuswahl] = useState<string | null>(gewaehlt);
  const [freitext, setFreitext] = useState(sonstiges ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titelId = `frage-${index + 1}-titel`;
  const mitFreitext = frage.feld === "discovery_source" && auswahl === "sonstiges";

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const waehle = (wert: string) => {
    if (speichert) return;
    setAuswahl(wert);
    if (timer.current) clearTimeout(timer.current);
    // „Sonstiges" bei Frage 5 wartet auf das optionale Textfeld und „Weiter".
    if (frage.feld === "discovery_source" && wert === "sonstiges") return;
    timer.current = setTimeout(() => onAntwort(wert), WEITER_NACH_MS);
  };

  return (
    <Buehne labelledBy={titelId}>
      <Fortschritt nummer={index + 1} gesamt={FRAGEN.length} />

      <Stack spacing={2} textAlign="center">
        <Text
          as="h1"
          id={titelId}
          m={0}
          fontSize={{ base: "22px", md: "26px" }}
          fontWeight={600}
          lineHeight={1.25}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
        >
          {frage.frage}
        </Text>
        {frage.hinweis ? (
          <Text fontSize="14px" color="var(--cc-text-3)">
            {frage.hinweis}
          </Text>
        ) : null}
      </Stack>

      <Stack role="radiogroup" aria-labelledby={titelId} spacing={2}>
        {frage.antworten.map((a) => {
          const aktiv = auswahl === a.wert;
          return (
            <Box
              key={a.wert}
              as="button"
              type="button"
              role="radio"
              aria-checked={aktiv}
              onClick={() => waehle(a.wert)}
              display="flex"
              alignItems="center"
              gap={3}
              w="full"
              minH="52px"
              px={4}
              py={3}
              textAlign="left"
              borderRadius="10px"
              border="1px solid"
              borderColor={aktiv ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
              bg={aktiv ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.02)"}
              boxShadow={aktiv ? "0 0 22px rgba(212, 176, 128, 0.14)" : "none"}
              color={aktiv ? "var(--cc-text)" : "var(--cc-text-soft)"}
              fontSize="15px"
              lineHeight={1.4}
              cursor={speichert ? "wait" : "pointer"}
              transition="border-color 180ms var(--cc-ease), background-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)"
              _hover={aktiv ? {} : { borderColor: "rgba(255, 255, 255, 0.24)", bg: "rgba(255, 255, 255, 0.04)" }}
              _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
            >
              <Box
                flexShrink={0}
                w="20px"
                h="20px"
                borderRadius="full"
                border="1.5px solid"
                borderColor={aktiv ? "var(--cc-gold)" : "var(--cc-line-strong)"}
                bg={aktiv ? "var(--cc-gold-grad)" : "transparent"}
                color="var(--cc-on-gold)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                aria-hidden
              >
                {aktiv ? <Check size={12} strokeWidth={3} /> : null}
              </Box>
              <Box as="span">{a.label}</Box>
            </Box>
          );
        })}
      </Stack>

      {mitFreitext ? (
        <Stack spacing={3}>
          <Textarea
            value={freitext}
            onChange={(e) => setFreitext(e.target.value.slice(0, SONSTIGES_MAX))}
            placeholder="Wo genau? (optional)"
            aria-label="Wo bist du auf uns aufmerksam geworden? (optional)"
            rows={2}
            resize="none"
            bg="rgba(255, 255, 255, 0.03)"
            borderColor="var(--cc-line-strong)"
            borderRadius="8px"
            color="var(--cc-text)"
            fontSize="15px"
            _placeholder={{ color: "var(--cc-text-3)" }}
            _focusVisible={{ borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" }}
          />
          <Button
            {...glassPrimaryButtonProps}
            isLoading={speichert}
            onClick={() => onAntwort("sonstiges", freitext.trim() || null)}
          >
            Weiter
          </Button>
        </Stack>
      ) : null}

      {fehler ? (
        <Text role="alert" fontSize="14px" color="var(--cc-danger)" textAlign="center">
          {fehler}
        </Text>
      ) : null}

      <HStack justify="space-between" minH="32px">
        {onZurueck ? (
          <Button
            variant="ghost"
            size="sm"
            px={0}
            leftIcon={<ArrowLeft size={15} strokeWidth={2} />}
            color="var(--cc-text-2)"
            fontWeight={500}
            _hover={{ color: "var(--cc-gold-light)", bg: "transparent" }}
            onClick={onZurueck}
            isDisabled={speichert}
          >
            Zurück
          </Button>
        ) : (
          <Box />
        )}
        {speichert && !mitFreitext ? (
          <Text fontSize="13px" color="var(--cc-text-3)">
            Speichert …
          </Text>
        ) : null}
      </HStack>
    </Buehne>
  );
}

/* ── Übergang ────────────────────────────────────────────────────────────── */

export function StartklarStep({ onWeiter }: { onWeiter: () => void }) {
  const [laeuft, setLaeuft] = useState(false);
  return (
    <Buehne labelledBy="startklar-titel">
      <OnboardingHeading id="startklar-titel" title="Du bist startklar." />
      <Text {...fliesstext} maxW="52ch" mx="auto">
        Du bist jetzt Teil von Capital Circle. Hier geht es nicht darum, Trades zu kopieren oder möglichst schnell
        möglichst viel zu handeln. Du baust dir Schritt für Schritt einen klaren Tradingprozess auf. Folge der
        Struktur, arbeite das Gelernte sauber durch und setze es eigenständig um.
      </Text>
      <Button
        {...glassPrimaryButtonProps}
        isLoading={laeuft}
        onClick={() => {
          setLaeuft(true);
          onWeiter();
        }}
        autoFocus
      >
        Zum Dashboard
      </Button>
    </Buehne>
  );
}
