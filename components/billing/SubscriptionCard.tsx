import type { ReactNode } from "react";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { CardValue, DashCard } from "@/components/platform/dashboard/primitives";
import { formatDate, istAbo, subscriptionStatus, TIER_LABEL, TIER_PREIS, type Tier } from "./format";

export type PillTone = "gold" | "neutral" | "danger" | "success";

const PILL_TONES: Record<PillTone, { color: string; borderColor: string; bg: string }> = {
  gold: { color: "var(--cc-gold-light)", borderColor: "rgba(212, 176, 128, 0.35)", bg: "var(--cc-gold-wash)" },
  neutral: { color: "var(--cc-text-soft)", borderColor: "var(--cc-line-strong)", bg: "rgba(255, 255, 255, 0.03)" },
  danger: { color: "var(--cc-danger)", borderColor: "rgba(248, 113, 113, 0.32)", bg: "rgba(248, 113, 113, 0.08)" },
  success: { color: "var(--cc-success)", borderColor: "rgba(74, 222, 128, 0.3)", bg: "rgba(74, 222, 128, 0.07)" },
};

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px="10px"
      py="3px"
      borderRadius="full"
      border="1px solid"
      fontSize="12px"
      fontWeight={500}
      lineHeight="18px"
      letterSpacing="0.06em"
      textTransform="uppercase"
      whiteSpace="nowrap"
      {...PILL_TONES[tone]}
    >
      {children}
    </Box>
  );
}

export interface AboAnsicht {
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  pausiertBis: string | null;
}

/**
 * „Dein Abonnement" — Tarif, Preis, nächste Abbuchung, Status.
 *
 * Aufbau nach dem Referenzbild des Nutzers: links der Tarif mit dem Preis
 * darunter, rechts die Aktion. Der Preis steht bewusst dabei; ohne ihn ist die
 * Karte eine Statusanzeige und keine Antwort auf „was zahle ich eigentlich".
 */
export function SubscriptionCard({
  tier,
  abo,
  lifetimeGekauftAm,
  accessUntil,
  action,
}: {
  tier: Tier;
  abo: AboAnsicht | null;
  lifetimeGekauftAm: string | null;
  accessUntil: string | null;
  action?: ReactNode;
}) {
  const preis = TIER_PREIS[tier];
  const status = abo ? subscriptionStatus(abo.status) : null;
  const pausiert = Boolean(abo?.pausiertBis);

  return (
    <Box className="cc-rise" style={{ animationDelay: "80ms" }}>
      <DashCard label="Dein Abonnement" labelId="abo-karte" hero={tier === "free"} action={action}>
        <Stack spacing={4}>
          <Flex wrap="wrap" gap={2}>
            <Pill tone={tier === "lifetime" || tier === "ht_1on1" ? "gold" : "neutral"}>{TIER_LABEL[tier]}</Pill>
            {pausiert ? <Pill tone="neutral">Pausiert</Pill> : null}
            {abo?.cancelAtPeriodEnd ? <Pill tone="danger">Wird gekündigt</Pill> : null}
            {status && !abo?.cancelAtPeriodEnd && !pausiert ? (
              <Pill tone={status.danger ? "danger" : "success"}>{status.label}</Pill>
            ) : null}
          </Flex>

          <Flex align="baseline" gap={2} wrap="wrap">
            <CardValue as="h3">
              {tier === "lifetime"
                ? "Lebenslanger Zugang"
                : tier === "ht_1on1"
                  ? "1:1-Mentoring mit Emre"
                  : tier === "free"
                    ? "Du bist im Free-Zugang"
                    : `Mitgliedschaft · ${TIER_LABEL[tier]}`}
            </CardValue>
            {preis ? (
              <Text className="cc-num" fontSize="16px" color="var(--cc-text-2)">
                {preis.betrag} {preis.periode}
                {preis.proMonat ? ` · ${preis.proMonat}` : ""}
              </Text>
            ) : null}
          </Flex>

          <Stack spacing={1.5} fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
            {istAbo(tier) && abo ? (
              <>
                {abo.cancelAtPeriodEnd ? (
                  <Text color="var(--cc-danger)">
                    Dein Zugang endet am <Wert>{formatDate(abo.currentPeriodEnd)}</Wert>. Danach wird nichts mehr
                    abgebucht.
                  </Text>
                ) : pausiert ? (
                  <Text>
                    Pausiert bis <Wert>{formatDate(abo.pausiertBis)}</Wert>. Bis dahin wird nichts abgebucht.
                  </Text>
                ) : (
                  <Text>
                    Nächste Abbuchung am <Wert>{formatDate(abo.currentPeriodEnd)}</Wert>.
                  </Text>
                )}
              </>
            ) : null}

            {istAbo(tier) && !abo ? (
              <Text>
                Dein Zugang läuft bis <Wert>{formatDate(accessUntil)}</Wert>. Zu dieser Mitgliedschaft liegt uns kein
                Abo bei Stripe vor. Sie wurde von Hand eingetragen.
              </Text>
            ) : null}

            {tier === "lifetime" ? (
              <Text>
                Erworben am <Wert>{formatDate(lifetimeGekauftAm)}</Wert>. Keine wiederkehrenden Zahlungen, nichts zu
                verwalten.
              </Text>
            ) : null}

            {tier === "ht_1on1" ? (
              <Text>Persönliches 1:1-Programm. Termine vereinbaren wir direkt mit dir per E-Mail.</Text>
            ) : null}

            {tier === "free" ? (
              <Text>
                Du nutzt den kostenfreien Zugang. Wähle unten eine Laufzeit und schalte die komplette Plattform frei.
              </Text>
            ) : null}
          </Stack>
        </Stack>
      </DashCard>
    </Box>
  );
}

function Wert({ children }: { children: ReactNode }) {
  return (
    <Text as="span" className="cc-num" color="var(--cc-text)" fontWeight={600}>
      {children}
    </Text>
  );
}
