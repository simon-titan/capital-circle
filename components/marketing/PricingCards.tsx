"use client";

import { Box, Button, Flex, Heading, HStack, Stack, Text, useToast } from "@chakra-ui/react";
import { Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import { istAbo, TIER_LABEL, type Tier } from "@/components/billing/format";
import { preiskarten } from "@/config/landing-membership";
import type { MembershipPlan } from "@/lib/stripe/plan-map";

type PricingCardsProps = {
  isLoggedIn: boolean;
  membershipTier: Tier;
  /**
   * Konto-Ansicht (`/einstellungen/abonnement`). Dann ist die Liste eine
   * **Übersicht**: Das eigene Paket ist markiert, und aus einem laufenden Abo
   * heraus führt keine Karte mehr in die Kasse — ein zweiter Checkout legte
   * ein zweites Abo an, und das Mitglied zahlte doppelt.
   */
  kontoAnsicht?: boolean;
  /** Ob zu dem Konto ein Abo bei Stripe liegt — nur dann gibt es einen Weg zum Wechsel. */
  hatAbo?: boolean;
};

/**
 * Laufzeit-Auswahl für **eingeloggte** Nutzer (Upgrade aus `/billing`).
 *
 * Sie führt über den eingebetteten Checkout, nicht über `/go/<plan>`: Hier ist
 * bekannt, wer kauft, und ein Gast-Checkout würde den Nutzer zwingen, seine
 * Adresse erneut einzutippen — mit einem Tippfehler entstünde ein zweites
 * Konto. Auf der Landing ist es genau umgekehrt, dort gibt es noch kein Konto.
 *
 * Seit 09/2026 steht die Liste im Konto **für jeden Tarif**, nicht mehr nur
 * für Free. Wer zahlt, sah vorher nirgends, welche Laufzeiten es gibt und in
 * welcher er selbst steckt.
 *
 * Die Leistungsliste darunter ist am 17.09.2026 auf Nutzerwunsch entfallen:
 * Wer hier steht, ist bereits Mitglied oder kennt das Angebot von der
 * Verkaufsseite — die Aufzählung war eine Wiederholung. Sie steht weiterhin
 * auf `/` im Abschnitt „Angebot" (`config/landing-membership.ts`).
 */

/**
 * Was diese Karte dem Nutzer anbietet. Zentral hier statt im JSX, damit alle
 * drei Karten dieselbe Logik nutzen.
 *
 * - `kaufen` — Kasse öffnen (nur ohne laufendes Abo).
 * - `eigenes` — das ist sein Paket, nichts zu tun.
 * - `jahreswechsel` — der Wechsel läuft über die Upgrade-Karte weiter unten,
 *   nicht über eine zweite Kasse (`subscriptions.update` mit Proration).
 * - `portal` — jede andere Umstellung macht Stripe selbst; dort sieht der
 *   Nutzer die anteilige Verrechnung, bevor er zustimmt.
 * - `keine` — Lifetime, 1:1 oder ein von Hand eingetragener Zugang.
 */
type KartenAktion =
  | { art: "kaufen" }
  | { art: "eigenes" }
  | { art: "jahreswechsel" }
  | { art: "portal" }
  | { art: "keine"; label: string };

function kartenAktion(
  plan: MembershipPlan,
  tier: Tier,
  kontoAnsicht: boolean,
  hatAbo: boolean,
): KartenAktion {
  if (tier === "lifetime") return { art: "keine", label: "Du hast Lifetime" };
  if (tier === "ht_1on1") return { art: "keine", label: "Du bist im 1:1-Mentoring" };
  if (tier === plan) return { art: "eigenes" };
  if (!kontoAnsicht || !istAbo(tier)) return { art: "kaufen" };
  if (!hatAbo) return { art: "keine", label: "Auf Anfrage" };
  return plan === "yearly" ? { art: "jahreswechsel" } : { art: "portal" };
}

/** Kennzeichen oben auf einer Karte: „Dein Paket" bzw. „Beliebteste Wahl". */
function KartenBadge({ children }: { children: React.ReactNode }) {
  return (
    <HStack
      position="absolute"
      top="-13px"
      left="50%"
      transform="translateX(-50%)"
      zIndex={2}
      spacing={1.5}
      h="26px"
      px="12px"
      borderRadius="full"
      bg="var(--cc-gold)"
      bgImage="var(--cc-gold-grad)"
      color="var(--cc-on-gold)"
      whiteSpace="nowrap"
      fontSize="11px"
      fontWeight={600}
      letterSpacing="0.12em"
      textTransform="uppercase"
      boxShadow="0 6px 18px rgba(212, 176, 128, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
    >
      {children}
    </HStack>
  );
}

/** Ein Satz über der Liste, der sagt, was sie für diesen Tarif bedeutet. */
function uebersichtHinweis(tier: Tier, hatAbo: boolean): string {
  if (tier === "lifetime") {
    return "Du hast lebenslangen Zugang — hier gibt es nichts mehr zu wechseln und nichts mehr abzubuchen. Die Laufzeiten stehen nur zur Übersicht.";
  }
  if (tier === "ht_1on1") {
    return "Dein 1:1-Programm läuft außerhalb dieser Laufzeiten. Die Liste steht nur zur Übersicht.";
  }
  if (!istAbo(tier)) {
    return "Wähle deine Laufzeit. Die Leistungen sind in allen dreien dieselben — es geht nur um Bindung und Preis.";
  }
  if (!hatAbo) {
    return `Du bist in „${TIER_LABEL[tier]}". Dieser Zugang wurde von Hand eingetragen, ein Wechsel läuft deshalb über uns.`;
  }
  return `Du bist in „${TIER_LABEL[tier]}". Auf den Jahresplan wechselst du auf dieser Seite, jede andere Laufzeit stellst du im Stripe-Portal um.`;
}

export function PricingCards({
  isLoggedIn,
  membershipTier,
  kontoAnsicht = false,
  hatAbo = false,
}: PricingCardsProps) {
  const router = useRouter();
  const toast = useToast();
  const [laufenderPlan, setLaufenderPlan] = useState<MembershipPlan | null>(null);

  async function planWaehlen(plan: MembershipPlan) {
    if (!isLoggedIn) {
      router.push(`/login?next=/billing&plan=${plan}`);
      return;
    }

    setLaufenderPlan(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        clientSecret?: string;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.clientSecret) {
        throw new Error(json.error ?? "checkout_failed");
      }

      // Das clientSecret wandert per Query an /checkout, das daraus den
      // eingebetteten Stripe-Checkout aufbaut.
      router.push(`/checkout?plan=${plan}&cs=${encodeURIComponent(json.clientSecret)}`);
    } catch (error) {
      const msg = error instanceof Error && error.message ? error.message : "Unbekannter Fehler";
      toast({
        title: "Checkout konnte nicht gestartet werden",
        description: msg,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      setLaufenderPlan(null);
    }
  }

  return (
    <Stack w="full" maxW="960px" mx="auto" spacing={8}>
      {kontoAnsicht ? (
        <Stack spacing={2}>
          <Heading
            as="h2"
            id="pakete-uebersicht"
            fontSize="13px"
            lineHeight="18px"
            fontWeight={500}
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="var(--cc-text-soft)"
          >
            Alle Pakete
          </Heading>
          <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)">
            {uebersichtHinweis(membershipTier, hatAbo)}
          </Text>
        </Stack>
      ) : null}

      <Flex direction={{ base: "column", md: "row" }} gap={{ base: 8, md: 5 }} align="stretch" justify="center" pt={4}>
        {preiskarten.map((karte) => {
          const aktion = kartenAktion(karte.plan, membershipTier, kontoAnsicht, hatAbo);
          const eigenes = aktion.art === "eigenes";
          /*
            Hervorgehoben ist im Konto das **eigene** Paket, nicht das meist
            gekaufte: Wer schon zahlt, sucht sich selbst auf der Seite, und ein
            Gold-Rahmen um eine fremde Laufzeit führte ihn in die Irre.

            Lifetime und 1:1 haben kein eigenes Paket in dieser Reihe — dort
            bleibt die Liste ganz ohne Hero. „Beliebteste Wahl" im Gold-Rahmen
            wäre für sie eine Empfehlung für etwas, das sie nicht kaufen
            können und schon bezahlt haben.
          */
          const hervorheben = kontoAnsicht
            ? istAbo(membershipTier)
              ? eigenes
              : membershipTier === "free" && Boolean(karte.beliebt)
            : Boolean(karte.beliebt);
          return (
            <Box
              key={karte.plan}
              className={hervorheben ? "cc-card cc-card--hero" : "cc-card"}
              flex="1"
              minW={0}
              p={{ base: 6, md: 7 }}
            >
              {eigenes ? (
                <KartenBadge>
                  <Check size={12} strokeWidth={2.5} aria-hidden />
                  <Text as="span">Dein Paket</Text>
                </KartenBadge>
              ) : hervorheben && karte.beliebt ? (
                <KartenBadge>
                  <Sparkles size={12} strokeWidth={2} aria-hidden />
                  <Text as="span">Beliebteste Wahl</Text>
                </KartenBadge>
              ) : null}

              <Stack spacing={6} h="full">
                <Stack spacing={3}>
                  <Heading
                    as="h3"
                    fontSize="13px"
                    lineHeight="18px"
                    fontWeight={500}
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                    color={hervorheben ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
                  >
                    {karte.laufzeit}
                  </Heading>
                  <HStack align="baseline" spacing={2} flexWrap="wrap">
                    <Text
                      className="cc-num"
                      fontSize={{ base: "38px", md: "42px" }}
                      fontWeight={600}
                      lineHeight={1}
                      letterSpacing="-0.02em"
                      color="var(--cc-text)"
                    >
                      {karte.preis}
                    </Text>
                    <Text fontSize="14px" color="var(--cc-text-2)">
                      {karte.periode}
                    </Text>
                  </HStack>
                  <Text
                    className="cc-num"
                    fontSize="13px"
                    lineHeight="20px"
                    color={hervorheben ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                    fontWeight={hervorheben ? 600 : 400}
                  >
                    {karte.hinweis}
                  </Text>
                </Stack>

                <Box flex="1" />

                {aktion.art === "portal" ? (
                  <ManageSubscriptionButton label="Im Portal umstellen" variant="outline" block />
                ) : aktion.art === "jahreswechsel" ? (
                  <Button
                    as="a"
                    href="#abo-upgrade"
                    variant="line"
                    w="full"
                    h="48px"
                    fontSize="15px"
                    color="var(--cc-gold-light)"
                    borderColor="rgba(232, 192, 148, 0.35)"
                  >
                    Zum Jahreswechsel
                  </Button>
                ) : (
                  <Button
                    variant={hervorheben ? "gold" : "line"}
                    w="full"
                    h="48px"
                    fontSize="15px"
                    color={hervorheben ? undefined : "var(--cc-gold-light)"}
                    borderColor={hervorheben ? undefined : "rgba(232, 192, 148, 0.35)"}
                    onClick={aktion.art === "kaufen" ? () => void planWaehlen(karte.plan) : undefined}
                    isDisabled={aktion.art !== "kaufen"}
                    isLoading={laufenderPlan === karte.plan}
                    loadingText="Wird vorbereitet…"
                  >
                    {aktion.art === "kaufen"
                      ? "Jetzt starten"
                      : aktion.art === "eigenes"
                        ? "Dein aktuelles Paket"
                        : aktion.label}
                  </Button>
                )}
              </Stack>
            </Box>
          );
        })}
      </Flex>

    </Stack>
  );
}
