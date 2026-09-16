"use client";

import { Box, Button, Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

/** Dieselbe Grenze wie im Kauf-Formular und im Endpunkt. */
const MIN_LAENGE = 8;

const eingabeStil = {
  h: "48px",
  bg: "rgba(255, 255, 255, 0.02)",
  borderColor: "var(--cc-line-strong)",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "var(--cc-gold-line)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "outline" },
} as const;

/**
 * Passwort setzen mit der Sitzung, die `/auth/confirm` gerade in die Cookies
 * geschrieben hat.
 *
 * `updateUser` statt eines eigenen Endpunkts: Die Sitzung existiert bereits,
 * also darf der Nutzer sein eigenes Passwort selbst ändern. Ein Umweg über den
 * Service-Role-Client wäre hier zusätzliche Macht ohne zusätzlichen Nutzen.
 *
 * Nach dem Erfolg ein **voller** Seitenwechsel (`location.assign`) statt
 * `router.push`: Die Weiterleitungen des Mitgliederbereichs hängen an
 * `proxy.ts`, und die greift nur bei einer echten Navigation.
 */
export function SetPasswordForm() {
  const [passwort, setPasswort] = useState("");
  const [wiederholung, setWiederholung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);

    if (passwort.length < MIN_LAENGE) {
      setFehler(`Mindestens ${MIN_LAENGE} Zeichen.`);
      return;
    }
    if (passwort !== wiederholung) {
      setFehler("Die beiden Eingaben stimmen nicht überein.");
      return;
    }

    setLaeuft(true);
    const { error } = await createClient().auth.updateUser({ password: passwort });
    if (error) {
      // Häufigster Fall: Der Einmal-Link war schon benutzt, es gibt also keine
      // Sitzung mehr. Der ehrliche Hinweis ist der Weg über „Passwort vergessen".
      setFehler(
        error.message.toLowerCase().includes("session")
          ? "Der Link ist nicht mehr gültig. Fordere über die Anmeldeseite einen neuen an."
          : error.message,
      );
      setLaeuft(false);
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <form onSubmit={absenden}>
      <Stack spacing={4}>
        <Input
          {...eingabeStil}
          type="password"
          autoComplete="new-password"
          placeholder="Neues Passwort"
          aria-label="Neues Passwort"
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
        />
        <Input
          {...eingabeStil}
          type="password"
          autoComplete="new-password"
          placeholder="Passwort wiederholen"
          aria-label="Passwort wiederholen"
          value={wiederholung}
          onChange={(e) => setWiederholung(e.target.value)}
        />

        <Button type="submit" variant="gold" h="48px" isLoading={laeuft} loadingText="Einen Moment…" isDisabled={!passwort}>
          Passwort speichern
        </Button>

        {fehler ? (
          <Text role="alert" fontSize="13px" color="var(--cc-danger)" lineHeight={1.5}>
            {fehler}
          </Text>
        ) : (
          <Text fontSize="13px" color="var(--cc-text-3)" lineHeight={1.5}>
            Mindestens <Box as="span" className="cc-num">{MIN_LAENGE}</Box> Zeichen.
          </Text>
        )}
      </Stack>
    </form>
  );
}
