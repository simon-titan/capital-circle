"use client";

import { Button, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * „Weiter zur sicheren Zahlung" auf der Kassenseite (`app/kasse/[token]`).
 *
 * **Ein POST-Formular, kein Link.** Jeder Aufruf von `/api/kasse/<token>`
 * legt eine echte Stripe-Kasse an. Ein GET-Link würde von WhatsApp, iMessage
 * und Mailprogrammen für die Vorschau abgerufen — dann entstünden Kassen,
 * ohne dass jemand geklickt hat. Vorschau-Crawler schicken keine Formulare ab.
 *
 * Nach dem ersten Absenden sperrt der Knopf sich und zeigt „Kasse wird
 * geöffnet …" (wie `AngebotSection.tsx`): Ohne das legt ein Doppeltipp eine
 * zweite Kasse an.
 *
 * Mit `vorschau` schickt der Knopf nichts ab und sagt nur, was hier passieren
 * würde (Vorschau für Emre unter `/vorschau/mentoring`).
 */
export function KassenKnopf({ action, vorschau = false }: { action: string; vorschau?: boolean }) {
  const [sendet, setSendet] = useState(false);
  const [vorschauGeklickt, setVorschauGeklickt] = useState(false);

  /*
    Kommt der Kunde mit „Zurück" aus der Stripe-Kasse, stellt der Browser die
    Seite womöglich aus dem Zwischenspeicher wieder her — samt gesperrtem
    Knopf. `pageshow` mit `persisted` ist genau dieser Fall.
  */
  useEffect(() => {
    function zurueck(e: PageTransitionEvent) {
      if (e.persisted) setSendet(false);
    }
    window.addEventListener("pageshow", zurueck);
    return () => window.removeEventListener("pageshow", zurueck);
  }, []);

  return (
    <form
      method="post"
      action={action}
      style={{ width: "100%" }}
      onSubmit={(e) => {
        if (vorschau) {
          e.preventDefault();
          setVorschauGeklickt(true);
          return;
        }
        if (sendet) {
          e.preventDefault();
          return;
        }
        setSendet(true);
      }}
    >
      <Button
        type="submit"
        variant="gold"
        w="100%"
        h={{ base: "52px", md: "56px" }}
        fontSize={{ base: "16px", md: "17px" }}
        letterSpacing="0.01em"
        leftIcon={sendet ? undefined : <Lock size={17} strokeWidth={2} />}
        aria-busy={sendet}
        aria-disabled={sendet}
        opacity={sendet ? 0.8 : 1}
        cursor={sendet ? "progress" : undefined}
      >
        {sendet ? "Kasse wird geöffnet …" : "Weiter zur sicheren Zahlung"}
      </Button>
      {vorschauGeklickt ? (
        <Text role="status" mt={3} fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)" textAlign="center">
          Vorschau: Auf der echten Seite öffnet sich jetzt die Stripe-Kasse mit genau diesem Betrag.
        </Text>
      ) : null}
    </form>
  );
}
