"use client";

import { Box, Button, Flex, HStack, List, ListIcon, ListItem, Stack, Text, useToast } from "@chakra-ui/react";
import { Check, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashCard, Meta } from "@/components/platform/dashboard/primitives";
import type { UpgradeGrund } from "@/lib/stripe/upgrade";
import { PreisVergleich } from "./SubscriptionCard";
import { formatDate, TIER_LABEL, TIER_PREIS, type Tier } from "./format";

const FEHLER: Record<string, string> = {
  zu_jung: "Das Angebot gilt erst ab einem Monat Mitgliedschaft.",
  gekuendigt: "Nimm zuerst die Kündigung zurück.",
  pausiert: "Dein Abo pausiert gerade.",
  nicht_aktiv: "Dein Abo ist gerade nicht aktiv.",
  bereits_jahresplan: "Du bist bereits im Jahresplan.",
  kein_abo: "Zu deinem Konto liegt kein Abo bei Stripe vor.",
};

/**
 * Warum der Knopf (noch) nicht geht — in der Sprache des Nutzers.
 *
 * Der Text nennt immer, was **er** tun kann oder worauf er wartet. „zu_jung"
 * bekommt ein Datum mit: eine Regel merkt sich niemand, einen Termin schon.
 */
function sperrText(grund: UpgradeGrund, freiAb: string | null): string {
  switch (grund) {
    case "zu_jung":
      return freiAb
        ? `Ab dem 30. Tag deiner Mitgliedschaft — bei dir ab dem ${formatDate(freiAb)}.`
        : "Ab dem 30. Tag deiner Mitgliedschaft.";
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

/**
 * Wechsel auf den Jahresplan.
 *
 * Bewusst **kein** zweiter Checkout: Der Wechsel läuft über
 * `subscriptions.update` mit Proration. Der Nutzer sieht deshalb keine Kasse,
 * sondern bekommt die Differenz sofort in Rechnung gestellt — der Knopf ist
 * damit verbindlich, und genau so ist er beschriftet.
 *
 * Die Karte steht auch dann auf der Seite, wenn der Wechsel noch nicht greift
 * (Nutzerwunsch 09/2026): Vorher war sie schlicht unsichtbar, und ein
 * Angebot, von dem niemand weiß, verkauft nichts. Gesperrt heißt dann
 * wirklich gesperrt — kein Gold, kein klickbarer Knopf, dafür der Grund und
 * das Datum. Der Riegel selbst sitzt ohnehin in der Route.
 */
export function UpgradeOffer({
  aktuellerTarif,
  mitRabatt,
  grund,
  freiAb,
}: {
  aktuellerTarif: Tier;
  /** Ob eine Coupon-ID hinterlegt ist — nur dann versprechen wir einen Rabatt. */
  mitRabatt: boolean;
  /** Ergebnis von `pruefeUpgrade()`; alles außer „moeglich" sperrt den Knopf. */
  grund: UpgradeGrund;
  /** Ab wann der Wechsel greift (ISO) — nur bei `zu_jung` von Belang. */
  freiAb: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [laeuft, setLaeuft] = useState(false);
  const gesperrt = grund !== "moeglich";
  const jahrespreis = TIER_PREIS.yearly;

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
    <Box className="cc-rise" id="abo-upgrade" style={{ animationDelay: "220ms" }}>
      <DashCard
        label="Auf den Jahresplan wechseln"
        labelId="abo-upgrade-karte"
        // Die Hero-Behandlung gehört dem nächsten Schritt. Ein Angebot, das
        // erst in drei Wochen greift, ist keiner.
        hero={!gesperrt}
        action={
          <Button
            variant={gesperrt ? "line" : "gold"}
            onClick={() => void wechseln()}
            isLoading={laeuft}
            isDisabled={gesperrt}
            w={{ base: "100%", sm: "auto" }}
          >
            {/*
              „Noch" nur da, wo es stimmt: Ohne Stripe-Abo wird der Knopf
              nicht von selbst klickbar, da hilft nur eine Nachricht an uns.
            */}
            {!gesperrt
              ? "Auf Jahresplan wechseln"
              : grund === "kein_abo"
                ? "Nicht verfügbar"
                : "Noch nicht verfügbar"}
          </Button>
        }
      >
        <Stack spacing={4}>
          {jahrespreis ? (
            <PreisVergleich
              vorher={jahrespreis.betrag}
              nachher={mitRabatt ? `${jahrespreis.betrag} abzüglich deines Rabatts` : jahrespreis.betrag}
              hinweis={mitRabatt ? "Rabatt für Bestandsmitglieder" : undefined}
            />
          ) : null}

          <Meta>
            Statt {TIER_LABEL[aktuellerTarif].toLowerCase()} abzurechnen, zahlst du einmal im Jahr —
            {mitRabatt ? " zusätzlich rabattiert, weil du schon dabei bist." : " zwei Monate günstiger als monatlich."}
          </Meta>

          {gesperrt ? (
            <HStack
              spacing={2.5}
              align="flex-start"
              p={3}
              borderRadius="10px"
              border="1px solid var(--cc-line)"
              bg="rgba(255, 255, 255, 0.02)"
            >
              <Box color="var(--cc-text-3)" mt="2px" flexShrink={0}>
                <Lock size={15} strokeWidth={1.75} aria-hidden />
              </Box>
              <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-soft)">
                {sperrText(grund, freiAb)}
              </Text>
            </HStack>
          ) : null}

          <List spacing={2} fontSize="14px" color="var(--cc-text-2)">
            {[
              "Der bereits bezahlte Rest deiner Laufzeit wird angerechnet.",
              "Kein zweites Abo, keine neue Zahlungsmethode.",
              "Ab dann eine Abbuchung pro Jahr statt zwölf.",
            ].map((zeile) => (
              <ListItem key={zeile} display="flex" alignItems="flex-start" gap={2}>
                <ListIcon as={Check} color="var(--cc-gold-light)" mt="3px" boxSize={4} />
                <Text as="span">{zeile}</Text>
              </ListItem>
            ))}
          </List>

          <Flex>
            <Text fontSize="12px" color="var(--cc-text-3)" lineHeight={1.6}>
              Die Differenz wird sofort abgerechnet. Der genaue Betrag steht auf der Rechnung, die Stripe dir
              unmittelbar danach ausstellt.
            </Text>
          </Flex>
        </Stack>
      </DashCard>
    </Box>
  );
}
