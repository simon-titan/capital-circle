"use client";

import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";

/**
 * Hinweis, wenn die Kasse nicht aufgegangen ist.
 *
 * `app/go/[plan]/route.ts` leitet bei jedem Fehlschlag auf `/?fehler=<code>`
 * zurück — mit der ausdrücklichen Begründung, der Besucher solle „eine
 * Weiterleitung mit Kennzeichnung, keine nackte 500" bekommen. Die
 * Kennzeichnung wurde bis zum 17.09.2026 nirgends ausgepackt: Wer auf
 * „beitreten" tippte und bei dem die Stripe-Session scheiterte, landete
 * wortlos wieder oben auf derselben Seite. Die einzige Erklärung, die er sich
 * selbst geben konnte, war „kaputt".
 *
 * Deshalb steht der Hinweis über dem Hero und nicht unten bei den Preisen:
 * Der Rücksprung landet bei Scroll 0, und dort muss die Antwort stehen.
 *
 * Der Parameter wird im Client gelesen, nicht über `searchParams` der Seite:
 * Letzteres macht die gesamte Verkaufsseite dynamisch. Dieser Streifen ist der
 * einzige Teil, der die Adresse überhaupt kennen muss, also hängt auch nur er
 * daran — die Seite selbst bleibt statisch vorgerendert.
 */

const TEXTE: Record<string, { titel: string; text: string }> = {
  plan_unbekannt: {
    titel: "Diese Laufzeit gibt es nicht.",
    text: "Der Link zeigte auf einen Tarif, den wir nicht führen. Wähle unten eine Laufzeit und starte von dort.",
  },
  konfiguration: {
    titel: "Die Kasse ist gerade nicht erreichbar.",
    text: "Das liegt an uns, nicht an dir. Versuch es in ein paar Minuten noch einmal — oder schreib uns, dann schalten wir dich von Hand frei.",
  },
  checkout: {
    titel: "Die Zahlung ließ sich nicht starten.",
    text: "Es wurde nichts abgebucht. Versuch es unten noch einmal; bleibt es dabei, schreib uns kurz.",
  },
};

/** Unbekannte Codes bekommen denselben Text wie ein Kassenfehler — ein Code,
 *  den wir nicht kennen, bedeutet für den Besucher dasselbe: Es ging nicht. */
const RUECKFALL = TEXTE.checkout;

export function KaufFehlerHinweis() {
  const code = useSearchParams().get("fehler");
  if (!code) return null;
  const { titel, text } = TEXTE[code] ?? RUECKFALL;

  return (
    <Box px={{ base: 4, md: 8, lg: 12 }} pt={{ base: 4, md: 6 }}>
      <Flex
        role="alert"
        maxW="1180px"
        mx="auto"
        gap={3}
        align="flex-start"
        borderRadius="10px"
        border="1px solid rgba(248, 113, 113, 0.35)"
        bg="rgba(30, 22, 24, 0.7)"
        px={{ base: 4, md: 5 }}
        py={4}
      >
        <Box color="var(--cc-danger)" flexShrink={0} mt="1px" aria-hidden>
          <AlertTriangle size={18} strokeWidth={1.75} />
        </Box>
        <Stack spacing={1} minW={0}>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
            {titel}
          </Text>
          <Text fontSize="14px" color="var(--cc-text-2)">
            {text}
          </Text>
        </Stack>
      </Flex>
    </Box>
  );
}
