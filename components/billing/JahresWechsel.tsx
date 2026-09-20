"use client";

import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { UpgradeGrund } from "@/lib/stripe/upgrade";
import { preiskarten } from "@/config/landing-membership";

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
 * `POST /api/stripe/subscription/upgrade`, also `subscriptions.update`. Eine
 * zweite Kasse legte ein zweites Abo an, und das Mitglied zahlte doppelt.
 *
 * Seit 20.09.2026 beginnt die Laufzeit beim Wechsel **neu**: voller
 * Jahrespreis, zwölf Monate ab heute, keine Anrechnung des laufenden Monats.
 * Weil der Knopf damit sofort Geld bewegt, fragt ein Dialog vorher nach.
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
  /*
    Zwischenschritt vor der Abbuchung (Entscheidung Simon, 20.09.2026): Der
    Knopf loeste die Zahlung sofort aus, ein einziger Klick auf einer Seite,
    auf der man sich auch nur umsieht. Der Dialog nennt Betrag und Laufzeit
    und verlangt eine zweite, bewusste Bestaetigung.
  */
  const [dialogOffen, setDialogOffen] = useState(false);
  const abbrechenRef = useRef<HTMLButtonElement>(null);
  const gesperrt = grund !== "moeglich";
  const jahrespreis = preiskarten.find((k) => k.plan === "yearly")?.preis ?? null;

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
        description: "Die Laufzeit beginnt heute und gilt zwoelf Monate. Die Rechnung findest du unter Abrechnung.",
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
      setDialogOffen(false);
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
        onClick={() => setDialogOffen(true)}
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
          : "Die Laufzeit beginnt beim Wechsel neu und gilt zwoelf Monate. Kein zweites Abo, keine neue Zahlungsmethode."}
      </Text>

      <AlertDialog
        isOpen={dialogOffen}
        leastDestructiveRef={abbrechenRef}
        onClose={() => setDialogOffen(false)}
        isCentered
      >
        <AlertDialogOverlay bg="rgba(8, 10, 12, 0.72)">
          <AlertDialogContent bg="var(--cc-panel-solid)" border="1px solid var(--cc-line)" borderRadius="var(--cc-radius)" mx={4}>
            <AlertDialogHeader fontSize="18px" fontWeight={600} color="var(--cc-text)">
              Auf das Jahrespaket wechseln?
            </AlertDialogHeader>
            <AlertDialogBody>
              <Stack spacing={3} fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
                <Text>
                  {jahrespreis ? (
                    <>
                      Es werden jetzt <Box as="span" className="cc-num" color="var(--cc-text)">{jahrespreis}</Box> abgebucht.
                    </>
                  ) : (
                    "Der Jahrespreis wird jetzt abgebucht."
                  )}{" "}
                  Deine Laufzeit beginnt heute und gilt zwoelf Monate.
                </Text>
                <Text fontSize="13px" color="var(--cc-text-3)">
                  Der Rest deiner laufenden Periode wird nicht angerechnet. Du bleibst im selben Abo, es kommt kein
                  zweites dazu, und deine Zahlungsmethode bleibt dieselbe.
                </Text>
              </Stack>
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={abbrechenRef} variant="line" onClick={() => setDialogOffen(false)} isDisabled={laeuft}>
                Abbrechen
              </Button>
              <Button variant="gold" onClick={() => void wechseln()} isLoading={laeuft} loadingText="Wird umgestellt…">
                Jetzt kostenpflichtig wechseln
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Stack>
  );
}
