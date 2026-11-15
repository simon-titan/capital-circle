"use client";

import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { OHNE_SPERRE, geheimhaltung as t } from "@/config/geheimhaltung";
import { createClient } from "@/lib/supabase/client";

/**
 * Geheimhaltungsvereinbarung für zahlende Mitglieder (15.11.2026, Migration 116).
 *
 * **Pflicht** (Entscheidung Simon): kein Kreuz, kein Schließen per Esc oder
 * Klick daneben. Solange nicht zugestimmt ist, liegt das Popup über jeder Seite
 * des Mitgliederbereichs — außer Abo und Abrechnung (`OHNE_SPERRE`), damit
 * Kündigen immer möglich bleibt. Wer sie sehen muss, entscheidet
 * `app/api/geheimhaltung` (nur `is_paid`, nie Free, nie Admin).
 *
 * Neutral gerahmt wie das Lifetime-Popup: Es geht auch über dem Dashboard auf
 * (`.cc-neutral`, AGENTS.md 16.09.2026).
 */
export function GeheimhaltungPopup() {
  const pathname = usePathname() ?? "";
  const [muss, setMuss] = useState(false);
  const [name, setName] = useState("");
  const [haken, setHaken] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const hierNicht = OHNE_SPERRE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const res = await fetch("/api/geheimhaltung", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { zeigen?: boolean; name?: string };
        if (abgebrochen || !json.zeigen) return;
        setName(json.name ?? "");
        setMuss(true);
      } catch {
        // Ohne Antwort kein Popup — lieber einmal zu wenig als jemanden grundlos aussperren.
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const nameOk = name.trim().length >= 3 && name.trim().includes(" ");

  async function zustimmen() {
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch("/api/geheimhaltung", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, zustimmung: true }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (json.ok) {
        setMuss(false);
        return;
      }
      setFehler(
        json.error === "name_ungueltig"
          ? "Bitte gib deinen vollständigen Namen ein (Vor- und Nachname)."
          : "Das hat nicht geklappt. Bitte versuche es gleich noch einmal.",
      );
    } catch {
      setFehler("Das hat nicht geklappt. Bitte versuche es gleich noch einmal.");
    }
    setLaeuft(false);
  }

  async function abmelden() {
    try {
      await createClient().auth.signOut({ scope: "local" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <Modal
      isOpen={muss && !hierNicht}
      onClose={() => undefined}
      closeOnEsc={false}
      closeOnOverlayClick={false}
      isCentered
      size="2xl"
      scrollBehavior="inside"
      blockScrollOnMount
    >
      <ModalOverlay bg="rgba(8, 10, 12, 0.82)" backdropFilter="blur(8px)" />
      <ModalContent
        bg="var(--cc-panel-solid)"
        border="1px solid var(--cc-line-strong)"
        borderRadius="12px"
        boxShadow="0 24px 60px rgba(0, 0, 0, 0.6)"
        color="var(--cc-text)"
        mx={4}
        aria-labelledby="geheimhaltung-titel"
      >
        <ModalBody pt={7} pb={2} px={{ base: 5, md: 8 }} className="cc-scroll">
          <Stack spacing={5}>
            <Stack spacing={2}>
              <Text fontSize="12px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-gold-light)">
                {t.dach}
              </Text>
              <Text as="h2" id="geheimhaltung-titel" fontSize={{ base: "20px", md: "22px" }} fontWeight={600} lineHeight={1.3}>
                {t.titel}
              </Text>
              <Text fontSize="14px" lineHeight={1.65} color="var(--cc-text-2)">
                {t.einleitung}
              </Text>
            </Stack>

            <Box border="1px solid var(--cc-line)" borderRadius="10px" bg="rgba(255,255,255,0.02)" px={{ base: 4, md: 5 }} py={4}>
              <Stack spacing={4} fontSize="13.5px" lineHeight={1.65} color="var(--cc-text-2)">
                <Text color="var(--cc-text-3)">{t.parteien}</Text>
                {t.abschnitte.map((a) => (
                  <Stack key={a.titel} spacing={1.5}>
                    <Text fontWeight={600} color="var(--cc-text)">
                      {a.titel}
                    </Text>
                    {a.absaetze.map((s) => (
                      <Text key={s}>{s}</Text>
                    ))}
                  </Stack>
                ))}
              </Stack>
            </Box>

            <FormControl isRequired>
              <FormLabel fontSize="14px" color="var(--cc-text)">
                {t.nameLabel}
              </FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
              <FormHelperText fontSize="12px" color="var(--cc-text-3)">
                {t.nameHinweis}
              </FormHelperText>
            </FormControl>

            <Checkbox isChecked={haken} onChange={(e) => setHaken(e.target.checked)} alignItems="flex-start">
              <Text as="span" fontSize="14px" lineHeight={1.5} color="var(--cc-text)">
                {t.haken}
              </Text>
            </Checkbox>

            {fehler ? (
              <Text fontSize="14px" color="var(--cc-danger)" role="alert">
                {fehler}
              </Text>
            ) : null}
          </Stack>
        </ModalBody>

        <ModalFooter px={{ base: 5, md: 8 }} pt={5} pb={6} flexDirection="column" alignItems="stretch" gap={3}>
          <Stack direction={{ base: "column-reverse", sm: "row" }} spacing={3}>
            <Button variant="line" onClick={() => void abmelden()} flex={{ sm: "1" }}>
              {t.abmelden}
            </Button>
            <Button variant="gold" onClick={() => void zustimmen()} isLoading={laeuft} isDisabled={!haken || !nameOk} flex={{ sm: "2" }}>
              {t.knopf}
            </Button>
          </Stack>
          <Text fontSize="12px" color="var(--cc-text-3)" textAlign="center">
            {t.kuendigenHinweis}{" "}
            <Text as={NextLink} href="/einstellungen/abonnement" textDecoration="underline" color="var(--cc-text-2)">
              {t.kuendigenLink}
            </Text>
            .
          </Text>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
