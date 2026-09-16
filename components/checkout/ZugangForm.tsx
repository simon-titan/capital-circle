"use client";

import { Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Dieselbe Grenze wie im Endpunkt — eine Regel, zwei Stellen. */
const MIN_LAENGE = 8;

const FEHLERTEXTE: Record<string, string> = {
  account_pending: "Dein Zugang wird gerade angelegt. Probier es in ein paar Sekunden noch einmal.",
  bereits_aktiv: "Für dieses Konto gibt es schon ein Passwort. Melde dich damit an.",
  session_expired: "Der Kauf ist zu lange her. Setz dein Passwort über den Link in der E-Mail.",
  not_paid: "Zu diesem Kauf liegt noch keine bestätigte Zahlung vor.",
  missing_session: "Der Aufruf kam ohne Kaufreferenz an.",
  session_unknown: "Der Kauf ließ sich nicht zuordnen.",
  no_email: "Zu diesem Kauf ist keine E-Mail-Adresse hinterlegt.",
};

/**
 * Passwort setzen direkt nach dem Kauf, ohne Umweg über die Mail.
 *
 * Beim Gast-Checkout entsteht das Konto ohne Passwort. Führte der einzige Weg
 * hinein über die Willkommensmail, wären es vier Schritte im Moment der größten
 * Bereitschaft — Mail öffnen, Link klicken, Passwort setzen, einloggen — und
 * jeder davon verliert Leute.
 *
 * Bewusst **kein Pflichtfeld**: Wer überspringt, kommt später über den Link in
 * der Mail oder über „Passwort vergessen" hinein. Der Weg bleibt vollständig
 * bestehen, er ist nur nicht mehr der einzige.
 */
export function ZugangForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler(null);

    if (passwort.length < MIN_LAENGE) {
      setFehler(`Mindestens ${MIN_LAENGE} Zeichen.`);
      return;
    }

    setLaeuft(true);
    try {
      const res = await fetch("/api/checkout/zugang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, passwort }),
      });
      const daten = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        grund?: string;
        fehler?: string;
        eingeloggt?: boolean;
      };

      if (!res.ok || !daten.ok) {
        setFehler(
          (daten.grund && FEHLERTEXTE[daten.grund]) ??
            daten.fehler ??
            "Das hat nicht geklappt. Versuch es bitte noch einmal.",
        );
        return;
      }

      /*
       * Die Sitzung steckt jetzt in den Cookies, aber diese Seite ist bereits
       * gerendert. `refresh()` lässt den Server neu zeichnen — damit erkennt
       * die Erfolgsseite den aktiven Zugang und zeigt den Schritt als erledigt.
       * Ohne den Aufruf bliebe das Formular stehen, obwohl es funktioniert hat.
       */
      router.refresh();
    } catch {
      setFehler("Verbindung fehlgeschlagen. Versuch es bitte noch einmal.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={absenden}>
      <Stack spacing={3}>
        {/*
          Nebeneinander ab `sm`, darunter gestapelt. Eingabe und Knopf gehören
          zu einer Handlung — untereinander gesetzt lesen sie sich wie zwei.
        */}
        <Flex gap={3} direction={{ base: "column", sm: "row" }} align="stretch">
          <Input
            placeholder="Passwort wählen"
            type="password"
            autoComplete="new-password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            flex="1"
            h="48px"
            bg="rgba(255, 255, 255, 0.02)"
            borderColor="var(--cc-line-strong)"
            color="var(--cc-text)"
            _placeholder={{ color: "var(--cc-text-3)" }}
            _hover={{ borderColor: "var(--cc-gold-line)" }}
            _focusVisible={{ borderColor: "var(--cc-gold-line)", boxShadow: "outline" }}
            aria-label="Passwort wählen"
            aria-describedby={fehler ? "zugang-fehler" : "zugang-hinweis"}
          />
          <Button
            type="submit"
            variant="gold"
            h="48px"
            px={6}
            flexShrink={0}
            isLoading={laeuft}
            loadingText="Einen Moment…"
            isDisabled={!passwort}
          >
            Zugang aktivieren
          </Button>
        </Flex>

        {fehler ? (
          <Text id="zugang-fehler" role="alert" fontSize="13px" color="var(--cc-danger)" lineHeight={1.5}>
            {fehler}
          </Text>
        ) : (
          <Text id="zugang-hinweis" fontSize="13px" color="var(--cc-text-3)" lineHeight={1.5}>
            Mindestens <Box as="span" className="cc-num">{MIN_LAENGE}</Box> Zeichen.
          </Text>
        )}
      </Stack>
    </form>
  );
}
