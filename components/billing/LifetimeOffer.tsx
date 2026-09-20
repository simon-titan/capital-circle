"use client";

import { Box, Button, List, ListIcon, ListItem, Stack, Text, useToast } from "@chakra-ui/react";
import { Check, Infinity as InfinityIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashCard, IconTile, Meta } from "@/components/platform/dashboard/primitives";
import { LIFETIME_PREIS } from "@/config/lifetime";
import { euro, lifetimeRechnung, ordinalWort } from "./ersparnis";

/**
 * Lifetime-Angebot für zahlende Mitglieder.
 *
 * Es steht nur hier — nicht auf der Landingpage, nicht im Preisvergleich, mit
 * keinem öffentlichen Link. Dass die Karte überhaupt gerendert wird, hat die
 * Seite serverseitig entschieden (`pruefeLifetimeAngebot`); die Kasse prüft
 * dieselbe Regel noch einmal.
 *
 * Der Kauf läuft über den eingebetteten Checkout wie die Laufzeiten, nur als
 * Einmalzahlung. Ein laufendes Abo kündigt der Webhook danach zum
 * Periodenende — sonst zahlte das Mitglied doppelt.
 *
 * Seit 20.09.2026 steht die Karte **über** der Paketreihe (Nutzerwunsch): Sie
 * ist das stärkste Angebot der Seite, stand aber unter drei Laufzeiten, die
 * alle weiterlaufen. Dazu rechnet sie jetzt vor, ab wann sie sich trägt, statt
 * nur einen Preis zu nennen. Die Zahlen kommen aus `ersparnis.ts`, also aus
 * denselben Preisen wie die Karten darunter: Ein Satz wie „ab dem zweiten Jahr
 * zahlst du nichts mehr" ist nach der nächsten Preisänderung sonst falsch.
 */
export function LifetimeOffer({ ehemalig = false }: { ehemalig?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [laeuft, setLaeuft] = useState(false);

  async function kaufen() {
    setLaeuft(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "lifetime" }),
      });
      const json = (await res.json()) as { ok?: boolean; clientSecret?: string; error?: string };
      if (!res.ok || !json.ok || !json.clientSecret) {
        throw new Error(
          json.error === "lifetime_gesperrt"
            ? "Das Angebot steht dir gerade nicht zur Verfügung."
            : (json.error ?? "checkout_failed"),
        );
      }
      router.push(`/checkout?plan=lifetime&cs=${encodeURIComponent(json.clientSecret)}`);
    } catch (err) {
      toast({
        title: "Checkout konnte nicht gestartet werden",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      setLaeuft(false);
    }
  }

  const rechnung = lifetimeRechnung();

  return (
    // `id="lifetime"`: Ziel der Links aus Mahnung, Warteraum und Abschied
    // (`config/lifetime.ts` → `/einstellungen/abonnement#lifetime`).
    <Box id="lifetime" className="cc-rise" style={{ animationDelay: "150ms" }} scrollMarginTop="96px">
      <DashCard
        label="Einmal zahlen, dauerhaft dabei"
        labelId="abo-lifetime"
        hero
        action={
          <Button variant="gold" onClick={() => void kaufen()} isLoading={laeuft} w={{ base: "100%", sm: "auto" }}>
            Lifetime sichern
          </Button>
        }
      >
        <Stack spacing={4}>
          <Stack direction="row" spacing={4} align="flex-start">
            <IconTile>
              <InfinityIcon size={24} strokeWidth={1.5} aria-hidden />
            </IconTile>
            <Stack spacing={1} minW={0}>
              <Text className="cc-num" fontSize={{ base: "24px", md: "28px" }} fontWeight={600} color="var(--cc-text)">
                {LIFETIME_PREIS}
              </Text>
              <Meta>
                einmalig, keine weitere Abbuchung
                {rechnung?.monateZumMonatspreis
                  ? `. So viel wie rund ${rechnung.monateZumMonatspreis} Monate im Monatspaket.`
                  : ""}
              </Meta>
            </Stack>
          </Stack>

          {/*
            Der Satz, auf den es ankommt, und der einzige mit einem Zeitpunkt
            darin: Ein Einmalpreis sagt für sich genommen nichts, erst der
            Vergleich mit dem laufenden Abo macht ihn lesbar. Beide Zahlen sind
            gerechnet, nicht getippt.
          */}
          {rechnung?.jahreBisGuenstiger && rechnung.jahrespaketBisDahin ? (
            <Box
              border="1px solid rgba(232, 192, 148, 0.28)"
              bg="var(--cc-gold-wash)"
              borderRadius="10px"
              px="14px"
              py="12px"
            >
              <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
                <Text as="span" color="var(--cc-gold-light)" fontWeight={600}>
                  Ab dem {ordinalWort(rechnung.jahreBisGuenstiger)} Jahr zahlst du nichts mehr.
                </Text>{" "}
                Im Jahrespaket wären bis dahin{" "}
                <Text as="span" className="cc-num" color="var(--cc-text)" fontWeight={600}>
                  {euro(rechnung.jahrespaketBisDahin)}
                </Text>{" "}
                fällig, hier bleibt es bei{" "}
                <Text as="span" className="cc-num" color="var(--cc-text)" fontWeight={600}>
                  {euro(rechnung.preis)}
                </Text>
                , einmal.
              </Text>
            </Box>
          ) : null}

          <List spacing={2} fontSize="14px" color="var(--cc-text-2)">
            {[
              "Keine weitere Abbuchung und kein Enddatum: Institut, Live-Sessions und Journal bleiben dir.",
              "Alles Künftige ist inbegriffen: neue Module, neue Sessions, neue Werkzeuge.",
              ehemalig
                ? "Kein Abo mehr: Nach der Zahlung bist du sofort wieder drin, auch auf Discord."
                : "Dein laufendes Abo endet automatisch zum bezahlten Periodenende, doppelt zahlst du nie.",
              "Keine Preiserhöhung, keine Verlängerung, nichts zu verwalten.",
            ].map((zeile) => (
              <ListItem key={zeile} display="flex" alignItems="flex-start" gap={2}>
                <ListIcon as={Check} color="var(--cc-gold-light)" mt="3px" boxSize={4} />
                <Text as="span">{zeile}</Text>
              </ListItem>
            ))}
          </List>

          <Text fontSize="12px" color="var(--cc-text-3)" lineHeight={1.6}>
            Dieses Angebot gilt nur für bestehende und ehemalige Mitglieder und steht nirgends öffentlich.
          </Text>
        </Stack>
      </DashCard>
    </Box>
  );
}
