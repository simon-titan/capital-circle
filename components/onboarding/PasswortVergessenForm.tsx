"use client";

import { Box, Button, Input, Link, Stack, Text } from "@chakra-ui/react";
import { MailCheck } from "lucide-react";
import NextLink from "next/link";
import { type FormEvent, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { anmeldeEingabeStil } from "@/components/onboarding/LoginStep";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

/** Name des Honeypot-Felds — muss mit `app/api/auth/passwort-vergessen/route.ts` übereinstimmen. */
const HONIGTOPF = "cc_feld_website";

const leiserLink = {
  fontSize: "13px",
  color: "var(--cc-text-2)",
  textUnderlineOffset: "3px",
  transition: "color 180ms var(--cc-ease)",
  _hover: { color: "var(--cc-gold-light)", textDecoration: "underline" },
} as const;

/**
 * „Passwort vergessen" — dieselbe Karte wie der Login (`LoginStep`), damit der
 * Wechsel zwischen beiden sich nicht wie ein anderer Ort anfühlt.
 *
 * Nach dem Absenden steht **immer** dieselbe Bestätigung, egal ob es zur
 * Adresse ein Konto gibt: Die Seite soll niemandem verraten, wer Mitglied ist.
 * Der Text sagt das auch ehrlich („Wenn zu … ein Konto besteht"), damit
 * jemand, der sich bei der Adresse vertippt hat, nicht ewig wartet.
 */
export function PasswortVergessenForm() {
  const [email, setEmail] = useState("");
  const [honig, setHonig] = useState("");
  const [gesendetAn, setGesendetAn] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    const adresse = email.trim();
    if (!adresse || laeuft) return;
    setFehler(null);
    setLaeuft(true);
    try {
      const res = await fetch("/api/auth/passwort-vergessen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adresse, [HONIGTOPF]: honig }),
      });
      const daten = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !daten.ok) {
        setFehler(daten.error ?? "Das hat nicht geklappt. Versuch es bitte noch einmal.");
        return;
      }
      setGesendetAn(adresse);
    } catch {
      setFehler("Verbindung fehlgeschlagen. Versuch es bitte noch einmal.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Box
      className="cc-card cc-card--hero cc-card--still"
      w="full"
      maxW="380px"
      p={{ base: 6, md: 8 }}
    >
      <Stack spacing={4} align="center" textAlign="center">
        <Box lineHeight={1}>
          <Logo variant="onDark" width={240} />
        </Box>
        <Box
          aria-hidden
          h="1px"
          w="120px"
          bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
        />
      </Stack>

      {gesendetAn ? (
        <Stack mt={6} spacing={4} align="center" textAlign="center" role="status" aria-live="polite">
          <Box color="var(--cc-gold-light)" aria-hidden>
            <MailCheck size={28} strokeWidth={1.5} />
          </Box>
          <Text as="h1" m={0} fontSize="20px" fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
            Schau in dein Postfach.
          </Text>
          <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
            Wenn zu{" "}
            <Box as="span" color="var(--cc-text)" wordBreak="break-all">
              {gesendetAn}
            </Box>{" "}
            ein Konto besteht, ist der Link unterwegs. Er funktioniert genau einmal.
          </Text>
          <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)">
            Nach ein paar Minuten noch nichts da? Schau im Spam-Ordner nach und prüf die Schreibweise der Adresse.
          </Text>
          <Stack spacing={2} w="full" pt={1}>
            <Button as={NextLink} href="/login" variant="line" h="44px" w="full">
              Zurück zur Anmeldung
            </Button>
            <Link
              as="button"
              type="button"
              alignSelf="center"
              onClick={() => {
                setGesendetAn(null);
                setEmail("");
              }}
              {...leiserLink}
            >
              Andere Adresse eingeben
            </Link>
          </Stack>
        </Stack>
      ) : (
        <Box as="form" onSubmit={absenden} noValidate aria-labelledby="pw-vergessen-titel" position="relative">
          <Stack mt={6} spacing={2} textAlign="center">
            <Text
              as="h1"
              id="pw-vergessen-titel"
              m={0}
              fontSize="20px"
              fontWeight={600}
              lineHeight={1.3}
              color="var(--cc-text)"
            >
              Passwort vergessen?
            </Text>
            <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)">
              Gib die E-Mail-Adresse deines Kontos ein. Wir schicken dir einen Link, mit dem du ein neues Passwort
              wählst.
            </Text>
            <Text fontSize="13px" lineHeight={1.55} color="var(--cc-text-3)">
              Du hast nach dem Kauf nie ein Passwort gesetzt? Das geht hier genauso.
            </Text>
          </Stack>

          <Stack mt={5} spacing={3}>
            <Input
              aria-label="E-Mail"
              placeholder="E-Mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              {...anmeldeEingabeStil}
            />

            {/* Honeypot: für Menschen unsichtbar, ohne Autofill, nicht per Tab erreichbar. */}
            <Box aria-hidden position="absolute" left="-10000px" top="auto" w="1px" h="1px" overflow="hidden">
              <label htmlFor={HONIGTOPF}>Dieses Feld bitte leer lassen</label>
              <input
                id={HONIGTOPF}
                name={HONIGTOPF}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honig}
                onChange={(e) => setHonig(e.target.value)}
              />
            </Box>

            {fehler ? (
              <Text role="alert" fontSize="14px" lineHeight={1.5} color="var(--cc-danger)">
                {fehler}
              </Text>
            ) : null}

            <Button
              {...glassPrimaryButtonProps}
              type="submit"
              mt={1}
              isLoading={laeuft}
              isDisabled={!email.trim()}
            >
              Link anfordern
            </Button>
            <Link as={NextLink} href="/login" alignSelf="center" mt={1} {...leiserLink}>
              Zurück zur Anmeldung
            </Link>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
