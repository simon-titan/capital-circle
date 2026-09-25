"use client";

import { Box, Button, Flex, FormControl, FormErrorMessage, FormHelperText, FormLabel, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { TRADINGVIEW } from "@/config/partner";
import type { TvZugang } from "@/lib/tradingview/zugang";
import { Eyebrow, FELD_SX, rise } from "./toolsUi";

function StatusZeile({ ton, children }: { ton: "neutral" | "gold" | "success"; children: string }) {
  const farbe = ton === "success" ? "var(--cc-success)" : ton === "gold" ? "var(--cc-gold-light)" : "var(--cc-text-3)";
  return (
    <HStack spacing={2} fontSize="14px" color="var(--cc-text-2)">
      <Box w="8px" h="8px" borderRadius="full" bg={farbe} aria-hidden />
      <Text>
        Status:{" "}
        <Box as="span" color="var(--cc-text)" fontWeight={500}>
          {children}
        </Box>
      </Text>
    </HStack>
  );
}

function Anleitung() {
  return (
    <Box className="cc-card cc-card--still cc-rise" p={{ base: 5, md: 6 }} {...rise(2)}>
      <Eyebrow mb={4}>So startest du</Eyebrow>
      <Stack as="ol" spacing={3} listStyleType="none">
        {TRADINGVIEW.schritte.map((schritt, i) => (
          <HStack as="li" key={schritt} spacing={3} align="center">
            <Flex
              w="26px"
              h="26px"
              flexShrink={0}
              borderRadius="full"
              border="1px solid var(--cc-gold-line)"
              color="var(--cc-gold-light)"
              fontSize="13px"
              fontWeight={600}
              align="center"
              justify="center"
              className="cc-num"
            >
              {i + 1}
            </Flex>
            <Text fontSize="15px" color="var(--cc-text-soft)">
              {schritt}
            </Text>
          </HStack>
        ))}
      </Stack>
    </Box>
  );
}

/**
 * TradingView-Zugang: Name eintragen → „Angefragt“ → vom Team freigeschaltet
 * → „Zugang aktiv“ mit Kurzanleitung. Der Stand kommt vom Server
 * (`tradingview_zugaenge`, Migration 105); die Seite rendert ihn beim ersten
 * Aufruf schon fertig, dieser Client übernimmt nur Eingabe und Rückmeldung.
 */
export function TradingViewZugang({ start }: { start: TvZugang | null }) {
  const [zugang, setZugang] = useState<TvZugang | null>(start);
  const aktiv = zugang?.status === "aktiv";
  const angefragt = zugang?.status === "angefragt";
  // Nach Entzug oder ohne Eintrag: Formular. Bei „angefragt“ nur auf Wunsch (Name korrigieren).
  const [bearbeiten, setBearbeiten] = useState(false);
  const [name, setName] = useState(angefragt ? (zugang?.tv_benutzername ?? "") : "");
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const zeigeFormular = !zugang || zugang.status === "entzug_offen" || zugang.status === "entzogen" || bearbeiten;
  const frueherBeendet = zugang?.status === "entzug_offen" || zugang?.status === "entzogen";

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setSendet(true);
    setFehler(null);
    try {
      const res = await fetch("/api/tradingview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ benutzername: name }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; zugang?: TvZugang; error?: string } | null;
      if (!json?.ok || !json.zugang) throw new Error(json?.error ?? "Die Anfrage hat nicht geklappt. Bitte versuch es noch einmal.");
      setZugang(json.zugang);
      setBearbeiten(false);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setSendet(false);
    }
  }

  if (aktiv && zugang) {
    return (
      <Stack spacing={5}>
        <Box className="cc-card cc-card--hero cc-rise" p={{ base: 5, md: 7 }} {...rise(1)}>
          <HStack spacing={3} mb={5}>
            <Flex
              w="30px"
              h="30px"
              borderRadius="full"
              bg="var(--cc-gold-grad)"
              color="var(--cc-on-gold)"
              align="center"
              justify="center"
              boxShadow="0 0 16px rgba(212, 176, 128, 0.45)"
            >
              <Check size={16} strokeWidth={3} />
            </Flex>
            <Eyebrow>Zugang aktiv</Eyebrow>
          </HStack>
          <Stack spacing={4} divider={<Box h="1px" bg="var(--cc-line)" border="none" />}>
            <Flex justify="space-between" gap={4} flexWrap="wrap">
              <Text fontSize="14px" color="var(--cc-text-2)">
                TradingView Account
              </Text>
              <Text fontSize="15px" fontWeight={500} color="var(--cc-text)">
                {zugang.tv_benutzername}
              </Text>
            </Flex>
            <Flex justify="space-between" gap={4} flexWrap="wrap">
              <Text fontSize="14px" color="var(--cc-text-2)">
                {TRADINGVIEW.indikatorName}
              </Text>
              <HStack spacing={2}>
                <Box w="8px" h="8px" borderRadius="full" bg="var(--cc-success)" aria-hidden />
                <Text fontSize="15px" fontWeight={500} color="var(--cc-text)">
                  Zugang aktiv
                </Text>
              </HStack>
            </Flex>
          </Stack>
        </Box>
        <Anleitung />
      </Stack>
    );
  }

  return (
    <Box className="cc-card cc-card--hero cc-rise" p={{ base: 5, md: 7 }} {...rise(1)}>
      <Stack spacing={5}>
        <Eyebrow>TradingView Zugang</Eyebrow>
        <StatusZeile ton={angefragt && !bearbeiten ? "gold" : "neutral"}>
          {angefragt && !bearbeiten ? "Angefragt" : "Noch nicht verbunden"}
        </StatusZeile>

        {angefragt && !bearbeiten && zugang ? (
          <Stack spacing={4}>
            <Text fontSize="15px" color="var(--cc-text-soft)" lineHeight={1.6}>
              Deine Anfrage für{" "}
              <Box as="span" color="var(--cc-text)" fontWeight={600}>
                {zugang.tv_benutzername}
              </Box>{" "}
              ist bei uns. Sobald wir dich freigeschaltet haben, erscheint der Indikator in TradingView unter
              „Invite-only Scripts“ und hier steht „Zugang aktiv“.
            </Text>
            <Button
              variant="line"
              size="sm"
              alignSelf="flex-start"
              onClick={() => {
                setName(zugang.tv_benutzername);
                setBearbeiten(true);
              }}
            >
              Namen korrigieren
            </Button>
          </Stack>
        ) : null}

        {zeigeFormular ? (
          <Stack as="form" spacing={4} onSubmit={absenden} noValidate>
            {frueherBeendet ? (
              <Text fontSize="14px" color="var(--cc-text-2)" lineHeight={1.6}>
                Dein früherer Zugang wurde beendet. Fordere ihn einfach neu an.
              </Text>
            ) : null}
            <FormControl isInvalid={Boolean(fehler)}>
              <FormLabel fontSize="14px" fontWeight={500} color="var(--cc-text-2)" mb={1.5}>
                TradingView Benutzername
              </FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="dein_tradingview_name"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxW="420px"
                sx={FELD_SX}
              />
              {fehler ? (
                <FormErrorMessage>{fehler}</FormErrorMessage>
              ) : (
                <FormHelperText fontSize="13px" color="var(--cc-text-3)">
                  Bitte exakt deinen TradingView-Benutzernamen eingeben.
                </FormHelperText>
              )}
            </FormControl>
            <HStack spacing={3} flexWrap="wrap">
              <Button type="submit" variant="gold" isLoading={sendet} isDisabled={!name.trim()} loadingText="Wird gesendet …">
                Zugang anfordern
              </Button>
              {bearbeiten ? (
                <Button variant="ghost" color="var(--cc-text-2)" onClick={() => setBearbeiten(false)}>
                  Abbrechen
                </Button>
              ) : null}
            </HStack>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
