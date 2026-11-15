"use client";

import { Button, Text } from "@chakra-ui/react";
import { useState } from "react";

const FEHLER: Record<string, string> = {
  abgelehnt: "Für dieses Konto ist kein kostenloser Zugang möglich.",
  abgelaufen: "Dein kostenloser Zugang ist bereits abgelaufen.",
  link_ungueltig: "Dieser Link ist ungültig. Bitte öffne ihn direkt aus der E-Mail.",
};

/**
 * Knopf auf `/training/aktivieren`: schaltet frei und leitet weiter — zum Kurs,
 * bei fremder oder fehlender Sitzung über den Anmeldelink (`/auth/confirm`).
 * Sperrt nach dem ersten Klick, damit ein Doppeltipp nichts doppelt anlegt.
 */
export function AktivierenKnopf({ token, children }: { token: string; children: React.ReactNode }) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function aktivieren() {
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch("/api/training/aktivieren", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ t: token }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; ziel?: string; error?: string };
      if (json.ok && json.ziel) {
        window.location.assign(json.ziel);
        return;
      }
      setFehler(FEHLER[json.error ?? ""] ?? "Das hat nicht geklappt. Bitte versuche es gleich noch einmal.");
    } catch {
      setFehler("Das hat nicht geklappt. Bitte versuche es gleich noch einmal.");
    }
    setLaeuft(false);
  }

  return (
    <>
      <Button variant="smaragd" size="lg" onClick={() => void aktivieren()} isLoading={laeuft} loadingText="Wird freigeschaltet …">
        {children}
      </Button>
      {fehler ? (
        <Text fontSize="14px" color="var(--cc-danger)" role="alert">
          {fehler}
        </Text>
      ) : null}
    </>
  );
}
