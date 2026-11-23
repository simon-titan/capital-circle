"use client";

import { useState, type FormEvent } from "react";
import { Box, Button, Checkbox, Flex, FormControl, FormLabel, Input, Select, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { FunnelAlert, funnelErrorProps, funnelFieldProps, funnelLabelProps } from "@/components/marketing/funnel-ui";
import { PRODUKTE, erlaubteRaten, euro, ratenText, type MentoringProdukt } from "@/config/mentoring";

/**
 * Eingabe vor dem festen Kassenlink (`/kasse/main`, `/kasse/premium`).
 * Nach dem Abschicken legt `/api/kasse/fest` einen persönlichen Kassenlink an,
 * die Seite leitet dorthin weiter — dort stehen Leistungen, Preis und der
 * Knopf zur Stripe-Kasse wie bei jedem anderen Kassenlink.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEHLER: Record<string, string> = {
  email_ungueltig: "Bitte prüfe deine E-Mail-Adresse.",
  name_ungueltig: "Bitte trag deinen vollständigen Namen ein.",
  raten_ungueltig: "Bitte wähle eine Zahlungsweise.",
  vertrag_fehlt: "Bitte bestätige, dass du den Mentoringvertrag unterschrieben hast.",
  zu_oft: "Zu viele Versuche. Bitte warte ein paar Minuten.",
};

function zahlweise(produkt: MentoringProdukt, raten: number): string {
  const preis = PRODUKTE[produkt].preisCents;
  return raten === 1 ? `Einmalzahlung: ${euro(preis)}` : ratenText(preis, raten);
}

export function FesterKassenEinstieg({ produkt, closer }: { produkt: "main" | "premium"; closer: string | null }) {
  const p = PRODUKTE[produkt];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [raten, setRaten] = useState("");
  const [vertrag, setVertrag] = useState(false);
  const [website, setWebsite] = useState("");
  const [fehler, setFehler] = useState<Record<string, string>>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function abschicken(e: FormEvent) {
    e.preventDefault();
    if (laeuft) return;
    const f: Record<string, string> = {};
    if (name.trim().length < 2) f.name = FEHLER.name_ungueltig;
    if (!EMAIL_RE.test(email.trim())) f.email = FEHLER.email_ungueltig;
    if (!raten) f.raten = FEHLER.raten_ungueltig;
    if (!vertrag) f.vertrag = FEHLER.vertrag_fehlt;
    setFehler(f);
    setServerFehler(null);
    if (Object.keys(f).length) return;

    setLaeuft(true);
    try {
      const res = await fetch("/api/kasse/fest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produkt, raten: Number(raten), email, name, closer, vertrag, website }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; pfad?: string; error?: string } | null;
      if (json?.ok && json.pfad) {
        window.location.assign(json.pfad);
        return;
      }
      setServerFehler(FEHLER[json?.error ?? ""] ?? "Das hat nicht geklappt. Bitte versuch es noch einmal oder melde dich bei deinem Ansprechpartner.");
    } catch {
      setServerFehler("Keine Verbindung. Bitte prüfe dein Internet und versuch es noch einmal.");
    }
    setLaeuft(false);
  }

  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Flex position="relative" zIndex={1} justify="center" px={4} pt={{ base: 10, md: 16 }} pb={10}>
        <Stack spacing={{ base: 7, md: 8 }} w="full" maxW="560px">
          <Flex justify="center" className="cc-rise">
            <Box maxW="170px">
              <Logo variant="onDark" />
            </Box>
          </Flex>

          <Stack spacing={2.5} align="center" textAlign="center" className="cc-rise">
            <Text fontSize="13px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-gold-light)">
              Zur Kasse
            </Text>
            <Box as="h1" fontSize={{ base: "28px", md: "34px" }} fontWeight={600} lineHeight={1.15} letterSpacing="-0.01em">
              {p.name}
            </Box>
            <Text fontSize="15px" color="var(--cc-text-2)" maxW="44ch">
              Trag die Angaben aus deinem Mentoringvertrag ein. Danach siehst du dein Angebot und kannst bezahlen.
            </Text>
          </Stack>

          <Box as="form" onSubmit={abschicken} noValidate className="cc-card cc-card--hero cc-rise" p={{ base: 5, md: 7 }}>
            <Stack spacing={5}>
              <FormControl isInvalid={Boolean(fehler.name)} isRequired>
                <FormLabel {...funnelLabelProps} mb={1.5}>
                  Vor- und Nachname
                </FormLabel>
                <Input {...funnelFieldProps} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} h="52px" fontSize="16px" />
                {fehler.name ? <Text {...funnelErrorProps} mt={1.5}>{fehler.name}</Text> : null}
              </FormControl>

              <FormControl isInvalid={Boolean(fehler.email)} isRequired>
                <FormLabel {...funnelLabelProps} mb={1.5}>
                  E-Mail-Adresse
                </FormLabel>
                <Input
                  {...funnelFieldProps}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  h="52px"
                  fontSize="16px"
                />
                {fehler.email ? (
                  <Text {...funnelErrorProps} mt={1.5}>{fehler.email}</Text>
                ) : (
                  <Text fontSize="12px" color="var(--cc-text-3)" mt={1.5}>
                    Dieselbe Adresse wie im Vertrag. Dein Zugang zur Plattform hängt an ihr.
                  </Text>
                )}
              </FormControl>

              <FormControl isInvalid={Boolean(fehler.raten)} isRequired>
                <FormLabel {...funnelLabelProps} mb={1.5}>
                  Zahlungsweise wie im Vertrag
                </FormLabel>
                <Select
                  {...funnelFieldProps}
                  value={raten}
                  onChange={(e) => setRaten(e.target.value)}
                  h="52px"
                  fontSize="16px"
                  placeholder="Bitte wählen"
                  sx={{ "& option": { background: "#12171c", color: "#fff" } }}
                >
                  {erlaubteRaten(produkt).map((r) => (
                    <option key={r} value={r}>
                      {zahlweise(produkt, r)}
                    </option>
                  ))}
                </Select>
                {fehler.raten ? <Text {...funnelErrorProps} mt={1.5}>{fehler.raten}</Text> : null}
              </FormControl>

              {/* Verstecktes Feld gegen Bots. */}
              <Box position="absolute" left="-9999px" aria-hidden>
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
              </Box>

              <FormControl isInvalid={Boolean(fehler.vertrag)}>
                <Checkbox isChecked={vertrag} onChange={(e) => setVertrag(e.target.checked)} colorScheme="yellow" alignItems="flex-start">
                  <Text as="span" fontSize="14px" color="var(--cc-text)" lineHeight={1.55}>
                    Ich habe den Mentoringvertrag für das {p.name} unterschrieben.
                  </Text>
                </Checkbox>
                {fehler.vertrag ? <Text {...funnelErrorProps} mt={1.5}>{fehler.vertrag}</Text> : null}
              </FormControl>

              {serverFehler ? <FunnelAlert>{serverFehler}</FunnelAlert> : null}

              <Button type="submit" variant="gold" w="full" h="52px" fontSize="16px" isLoading={laeuft} loadingText="Angebot wird geöffnet …">
                Weiter zum Angebot
              </Button>
            </Stack>
          </Box>

          <Stack spacing={4} pt={2} align="center" textAlign="center">
            <RechtsLinks />
          </Stack>
        </Stack>
      </Flex>
    </Box>
  );
}
