"use client";

import { Box, Button, Flex, Stack, Text, type FlexProps } from "@chakra-ui/react";
import { ArrowRight, Check, KeyRound } from "lucide-react";
import NextLink from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ProgressBar } from "./primitives";
import type { OnboardingCheckliste as Zustand } from "./types";

/**
 * „Dein Start bei Capital Circle“ — die Start-Checkliste über „Als nächstes“
 * (Plan: docs/plaene/onboarding-kunde.md, Abschnitt 5–8).
 *
 * Drei Schritte: Discord verbinden, in der Community vorstellen, Lernpfad
 * starten. „Zugang absichern“ steht nur da, solange kein Passwort bekannt ist,
 * und zählt nicht mit. Die Box bleibt, bis alles erledigt ist; dann steht
 * „Alles eingerichtet.“, und beim nächsten Aufruf ist sie weg.
 *
 * Neutral gerahmt wie das ganze Dashboard (`.cc-neutral`): kein Gold-Schein,
 * Gold nur an Schrift und Knöpfen.
 */

async function sende(aktion: string): Promise<boolean> {
  try {
    const res = await fetch("/api/onboarding/schritt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktion }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function Haken({ erledigt, nummer }: { erledigt: boolean; nummer: number }) {
  return (
    <Flex
      w="28px"
      h="28px"
      flexShrink={0}
      align="center"
      justify="center"
      borderRadius="full"
      border="1.5px solid"
      borderColor={erledigt ? "var(--cc-ink)" : "var(--cc-line-strong)"}
      bg={erledigt ? "var(--cc-ink)" : "transparent"}
      color={erledigt ? "var(--cc-bg)" : "var(--cc-text-3)"}
      fontSize="13px"
      fontWeight={600}
      className="cc-num"
      aria-hidden
    >
      {erledigt ? <Check size={15} strokeWidth={3} /> : nummer}
    </Flex>
  );
}

function Zeile({
  nummer,
  erledigt,
  titel,
  text,
  aktion,
}: {
  nummer: number;
  erledigt: boolean;
  titel: string;
  text: string;
  aktion: ReactNode;
}) {
  return (
    <Flex
      as="li"
      listStyleType="none"
      gap={4}
      align={{ base: "flex-start", md: "center" }}
      direction={{ base: "column", md: "row" }}
      py={4}
      borderTop="1px solid var(--cc-line)"
    >
      <Flex gap={3.5} align="flex-start" flex="1" minW={0}>
        <Haken erledigt={erledigt} nummer={nummer} />
        <Box minW={0}>
          <Text
            fontSize="15px"
            fontWeight={600}
            lineHeight={1.4}
            color={erledigt ? "var(--cc-text-2)" : "var(--cc-text)"}
            textDecoration={erledigt ? "line-through" : "none"}
            textDecorationColor="rgba(255, 255, 255, 0.25)"
          >
            {titel}
          </Text>
          {!erledigt ? (
            <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)" mt={0.5} maxW="60ch">
              {text}
            </Text>
          ) : null}
        </Box>
      </Flex>
      {!erledigt ? (
        <Box flexShrink={0} pl={{ base: "42px", md: 0 }}>
          {aktion}
        </Box>
      ) : null}
    </Flex>
  );
}

export function OnboardingCheckliste({ zustand, className, ...rest }: FlexProps & { zustand: Zustand }) {
  const [linkGeoeffnet, setLinkGeoeffnet] = useState(zustand.communityLinkGeoeffnet);
  const [community, setCommunity] = useState(zustand.community);
  const [bestaetigt, setBestaetigt] = useState(false);
  const [versteckt, setVersteckt] = useState(false);
  const gemeldet = useRef(false);

  // Messpunkt „Checkliste gesehen" — einmal pro Aufruf; der Server zählt pro Nutzer einmal.
  useEffect(() => {
    if (gemeldet.current) return;
    gemeldet.current = true;
    void sende("dashboard_gezeigt");
  }, []);

  const erledigt = [zustand.discord, community, zustand.kurs].filter(Boolean).length;
  const fertig = erledigt === 3;

  // Wird die Vorstellung hier bestätigt und war sie der letzte Schritt,
  // gleich abschließen — sonst stünde die Box beim nächsten Aufruf noch da.
  useEffect(() => {
    if (fertig && !zustand.fertig) void sende("abschliessen");
  }, [fertig, zustand.fertig]);

  if (versteckt) return null;

  const oeffneVorstellung = () => {
    setLinkGeoeffnet(true);
    void sende("community_link");
  };

  const markiereVorgestellt = async () => {
    setBestaetigt(true);
    // Ohne Discord-Server-ID gibt es keinen Link zum Öffnen — dann zählt die Bestätigung allein.
    if (!zustand.vorstellungsLink) await sende("community_link");
    const ok = await sende("community_erledigt");
    if (ok) setCommunity(true);
    else setBestaetigt(false);
  };

  return (
    <Flex
      as="section"
      aria-labelledby="start-checkliste-titel"
      className={["cc-card cc-card--still", className].filter(Boolean).join(" ")}
      direction="column"
      p={{ base: 5, md: 6 }}
      minW={0}
      {...rest}
    >
      {fertig ? (
        <Flex direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "center" }} gap={5}>
          <Box flex="1" minW={0}>
            <Text id="start-checkliste-titel" as="h2" fontSize="20px" fontWeight={600} color="var(--cc-text)">
              Alles eingerichtet.
            </Text>
            <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)" mt={1} maxW="62ch">
              Du bist startklar. Folge jetzt deinem Lernpfad und nutze Community, Live-Calls und Journal als Teil
              deines Prozesses.
            </Text>
          </Box>
          <Button
            as={NextLink}
            href={zustand.lernpfadHref}
            variant="gold"
            rightIcon={<ArrowRight size={16} />}
            flexShrink={0}
            onClick={() => {
              void sende("abschliessen");
              setVersteckt(true);
            }}
          >
            Weiterlernen
          </Button>
        </Flex>
      ) : (
        <>
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" gap={4} mb={4}>
            <Box minW={0}>
              <Text id="start-checkliste-titel" as="h2" fontSize="20px" fontWeight={600} color="var(--cc-text)">
                Dein Start bei Capital Circle
              </Text>
              <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
                Richte deinen Zugang ein und starte richtig.
              </Text>
            </Box>
            <Stack spacing={2} minW={{ md: "200px" }} align={{ base: "stretch", md: "flex-end" }}>
              <Text fontSize="13px" color="var(--cc-text-soft)" className="cc-num">
                {erledigt} von 3 abgeschlossen
              </Text>
              <ProgressBar value={(erledigt / 3) * 100} label="Fortschritt deines Starts" tone="ink" maxW="none" />
            </Stack>
          </Flex>

          <Box as="ol" m={0} p={0}>
            <Zeile
              nummer={1}
              erledigt={zustand.discord}
              titel="Discord verbinden"
              text="Verbinde deinen Discord-Account und erhalte Zugang zur Capital Circle Community."
              aktion={
                // Kein Router-Link: /api/discord/connect leitet zu Discord weiter.
                <Button as="a" href="/api/discord/connect" variant="gold" size="sm">
                  Discord verbinden
                </Button>
              }
            />
            <Zeile
              nummer={2}
              erledigt={community}
              titel="Stell dich kurz vor"
              text="Sag der Community kurz Hallo und erzähl uns, wo du aktuell im Trading stehst."
              aktion={
                <Flex gap={2} wrap="wrap">
                  {zustand.vorstellungsLink ? (
                    <Button
                      as="a"
                      href={zustand.vorstellungsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant={linkGeoeffnet ? "line" : "gold"}
                      size="sm"
                      onClick={oeffneVorstellung}
                    >
                      Zur Community
                    </Button>
                  ) : null}
                  {linkGeoeffnet || !zustand.vorstellungsLink ? (
                    <Button
                      variant={zustand.vorstellungsLink ? "gold" : "line"}
                      size="sm"
                      isLoading={bestaetigt}
                      onClick={() => void markiereVorgestellt()}
                      isDisabled={!linkGeoeffnet && Boolean(zustand.vorstellungsLink)}
                    >
                      Als erledigt markieren
                    </Button>
                  ) : null}
                </Flex>
              }
            />
            <Zeile
              nummer={3}
              erledigt={zustand.kurs}
              titel="Starte deinen Lernpfad"
              text="Beginne mit Modul 1 und folge dem Kurs in der vorgesehenen Reihenfolge."
              aktion={
                <Button as={NextLink} href={zustand.lernpfadHref} variant="gold" size="sm">
                  Lernpfad starten
                </Button>
              }
            />
          </Box>

          {zustand.passwortOffen ? (
            <Flex
              mt={1}
              pt={4}
              borderTop="1px solid var(--cc-line)"
              gap={3}
              align={{ base: "flex-start", md: "center" }}
              direction={{ base: "column", md: "row" }}
            >
              <Flex gap={3.5} align="center" flex="1" minW={0}>
                <Flex w="28px" h="28px" align="center" justify="center" color="var(--cc-text-2)" flexShrink={0} aria-hidden>
                  <KeyRound size={16} strokeWidth={1.75} />
                </Flex>
                <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)">
                  <Box as="span" color="var(--cc-text-soft)" fontWeight={500}>
                    Zugang absichern:
                  </Box>{" "}
                  Leg ein Passwort fest, damit du dich jederzeit wieder anmelden kannst.
                </Text>
              </Flex>
              <Button as={NextLink} href="/einstellungen/profil" variant="line" size="sm" flexShrink={0} ml={{ base: "42px", md: 0 }}>
                Passwort festlegen
              </Button>
            </Flex>
          ) : null}
        </>
      )}
    </Flex>
  );
}
