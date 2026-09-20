"use client";

import { Button, Stack, Text, useToast } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UpgradeGrund } from "@/lib/stripe/upgrade";
import { formatDate } from "./format";

/**
 * Der Wechsel auf den Jahresplan, direkt in der Jahreskarte.
 *
 * Bis 20.09.2026 hing er an einer eigenen Karte („Auf den Jahresplan
 * wechseln") weiter unten auf der Seite. Die ist auf Nutzerwunsch entfallen:
 * Wer in der Paketreihe auf „Jährlich" schaut, soll dort wechseln können und
 * nicht erst einem Link folgen. Die Bedingungen wandern mit in diese
 * Komponente, damit der Knopf an Ort und Stelle sagen kann, warum er (noch)
 * nicht geht.
 *
 * **Kein zweiter Checkout.** Der Wechsel läuft über
 * `POST /api/stripe/subscription/upgrade`, also `subscriptions.update` mit
 * `proration_behavior: "always_invoice"`: Der bezahlte Rest der laufenden
 * Periode wird angerechnet, die Differenz sofort in Rechnung gestellt. Eine
 * zweite Kasse legte ein zweites Abo an, und das Mitglied zahlte doppelt.
 * Der Knopf ist damit verbindlich, und genau so ist er beschriftet.
 */

const FEHLER: Record<string, string> = {
  gekuendigt: "Nimm zuerst die Kündigung zurück.",
  pausiert: "Dein Abo pausiert gerade.",
  nicht_aktiv: "Dein Abo ist gerade nicht aktiv.",
  bereits_jahresplan: "Du bist bereits im Jahresplan.",
  kein_abo: "Zu deinem Konto liegt kein Abo bei Stripe vor.",
};

/**
 * Warum der Knopf (noch) nicht geht, in der Sprache des Nutzers.
 *
 * Der Text nennt immer, was **er** tun kann oder worauf er wartet.
 */
function sperrText(grund: UpgradeGrund): string {
  switch (grund) {
    case "gekuendigt":
      return "Du hast gekündigt. Nimm die Kündigung zurück, dann steht dir der Wechsel wieder offen.";
    case "pausiert":
      return "Dein Abo pausiert gerade. Nach der Pause kannst du wechseln.";
    case "nicht_aktiv":
      return "Dein Abo ist gerade nicht aktiv. Sobald die Zahlung durch ist, steht der Wechsel wieder offen.";
    case "kein_abo":
      // Von Hand eingetragener Zugang: Es gibt kein Stripe-Abo, das sich
      // umstellen ließe. Der Weg führt über uns, nicht über den Knopf.
      return "Zu deiner Mitgliedschaft liegt kein Abo bei Stripe. Schreib uns, dann stellen wir dich auf das Jahr um.";
    default:
      return "Der Wechsel steht dir gerade nicht offen.";
  }
}

export function JahresWechselButton({
  grund,
  hervorgehoben = true,
}: {
  /** Ergebnis von `pruefeUpgrade()`; alles außer „moeglich" sperrt den Knopf. */
  grund: UpgradeGrund;
  /** Gold statt Kontur, wenn die Karte die empfohlene ist. */
  hervorgehoben?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [laeuft, setLaeuft] = useState(false);
  const gesperrt = grund !== "moeglich";

  async function wechseln() {
    setLaeuft(true);
    try {
      const res = await fetch("/api/stripe/subscription/upgrade", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; error?: string; detail?: string };
      if (!res.ok || !json.ok) {
        throw new Error(FEHLER[json.error ?? ""] ?? json.detail ?? "Der Wechsel hat nicht geklappt.");
      }
      toast({
        title: "Du bist im Jahresplan",
        description: "Die Differenz wurde anteilig abgerechnet. Die Rechnung findest du unter Abrechnung.",
        status: "success",
        duration: 6000,
        isClosable: true,
      });
      router.refresh();
    } catch (err) {
      toast({
        title: "Wechsel fehlgeschlagen",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Button
        variant={gesperrt || !hervorgehoben ? "line" : "gold"}
        w="full"
        h="48px"
        fontSize="15px"
        color={gesperrt || hervorgehoben ? undefined : "var(--cc-gold-light)"}
        borderColor={gesperrt || hervorgehoben ? undefined : "rgba(232, 192, 148, 0.35)"}
        onClick={() => void wechseln()}
        isLoading={laeuft}
        loadingText="Wird umgestellt…"
        isDisabled={gesperrt}
      >
        {/*
          „Noch" nur da, wo es stimmt: Ohne Stripe-Abo wird der Knopf nicht von
          selbst klickbar, da hilft nur eine Nachricht an uns.
        */}
        {!gesperrt
          ? "Auf Jahresplan wechseln"
          : grund === "kein_abo"
            ? "Nicht verfügbar"
            : "Noch nicht verfügbar"}
      </Button>

      <Text fontSize="12px" lineHeight={1.5} color="var(--cc-text-3)">
        {gesperrt
          ? sperrText(grund)
          : "Der bezahlte Rest deiner Laufzeit wird angerechnet, die Differenz sofort abgerechnet. Kein zweites Abo, keine neue Zahlungsmethode."}
      </Text>
    </Stack>
  );
}
