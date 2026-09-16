import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Box, Flex, HStack, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import { PageHeader } from "@/components/journal/PageHeader";
import { PricingCards } from "@/components/marketing/PricingCards";
import { CardValue, DashCard, Meta } from "@/components/platform/dashboard/primitives";

export const metadata: Metadata = {
  title: "Mitgliedschaft & Zahlungen — Capital Circle",
};

export const dynamic = "force-dynamic";

type Tier = "free" | "monthly" | "quarterly" | "yearly" | "lifetime" | "ht_1on1";

type ProfileRow = {
  membership_tier: Tier | null;
  is_paid: boolean | null;
  stripe_customer_id: string | null;
  access_until: string | null;
  lifetime_purchased_at: string | null;
};

type SubscriptionRow = {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  stripe_price_id: string;
};

type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  stripe_invoice_id: string | null;
  failure_reason: string | null;
};

const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  monthly: "Monatlich",
  quarterly: "Vierteljährlich",
  yearly: "Jährlich",
  // Nicht mehr verkäuflich, im Bestand aber vorhanden — der Zugang bleibt.
  lifetime: "Lifetime",
  ht_1on1: "1:1-Mentoring",
};

/** Stripe-Abostatus auf Deutsch; Unbekanntes bleibt im Original sichtbar. */
const SUBSCRIPTION_STATUS: Record<string, { label: string; danger?: boolean }> = {
  active: { label: "Aktiv" },
  trialing: { label: "Testphase" },
  past_due: { label: "Zahlung überfällig", danger: true },
  unpaid: { label: "Unbezahlt", danger: true },
  incomplete: { label: "Unvollständig", danger: true },
  incomplete_expired: { label: "Abgelaufen" },
  canceled: { label: "Gekündigt" },
  paused: { label: "Pausiert" },
};

function subscriptionStatus(status: string) {
  return SUBSCRIPTION_STATUS[status.toLowerCase()] ?? { label: status };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatAmount(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency.toUpperCase() || "EUR",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function paymentStatusLabel(status: string): { label: string; color: string } {
  const s = status.toLowerCase();
  if (s === "succeeded" || s === "paid") {
    return { label: "Bezahlt", color: "var(--cc-success)" };
  }
  if (s === "failed" || s === "payment_failed" || s === "uncollectible") {
    return { label: "Fehlgeschlagen", color: "var(--cc-danger)" };
  }
  if (s === "refunded") {
    return { label: "Erstattet", color: "var(--cc-text-2)" };
  }
  if (s === "pending" || s === "processing" || s === "requires_action") {
    return { label: "Ausstehend", color: "var(--cc-gold-light)" };
  }
  return { label: status, color: "var(--cc-text-2)" };
}

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    redirect("/login");
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("membership_tier,is_paid,stripe_customer_id,access_until,lifetime_purchased_at")
    .eq("id", user.id)
    .single();
  const profile = (profileRaw as ProfileRow | null) ?? {
    membership_tier: "free",
    is_paid: false,
    stripe_customer_id: null,
    access_until: null,
    lifetime_purchased_at: null,
  };
  const tier: Tier = (profile.membership_tier ?? "free") as Tier;

  const { data: subsRaw } = await supabase
    .from("subscriptions")
    .select(
      "id,status,current_period_start,current_period_end,cancel_at_period_end,canceled_at,stripe_price_id",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const activeSub = (subsRaw as SubscriptionRow[] | null)?.[0] ?? null;

  const { data: paymentsRaw } = await supabase
    .from("payments")
    .select(
      "id,amount_cents,currency,status,paid_at,created_at,stripe_invoice_id,failure_reason",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const payments = (paymentsRaw as PaymentRow[] | null) ?? [];

  return (
    <Box maxW="900px" mx="auto" w="full">
      <PageHeader title="Abo & Zahlungen" />

      <Stack spacing={5}>
        <CurrentPlanCard tier={tier} subscription={activeSub} profile={profile} />
        {/*
          Die Laufzeiten stehen hier direkt statt hinter einem Link: `/pricing`
          ist entfallen, und die Verkaufsseite auf `/` leitet eingeloggte Nutzer
          ins Dashboard um — ein Knopf dorthin wäre eine Sackgasse gewesen.
        */}
        {tier === "free" ? (
          <Box id="mitgliedschaft" className="cc-rise" style={{ animationDelay: "115ms" }}>
            <PricingCards isLoggedIn membershipTier={tier} />
          </Box>
        ) : null}
        <PaymentsCard payments={payments} hasCustomer={Boolean(profile.stripe_customer_id)} />
      </Stack>
    </Box>
  );
}

type PillTone = "gold" | "neutral" | "danger";

const PILL_TONES: Record<PillTone, { color: string; borderColor: string; bg: string }> = {
  gold: { color: "var(--cc-gold-light)", borderColor: "rgba(212, 176, 128, 0.35)", bg: "var(--cc-gold-wash)" },
  neutral: { color: "var(--cc-text-soft)", borderColor: "var(--cc-line-strong)", bg: "rgba(255, 255, 255, 0.03)" },
  danger: { color: "var(--cc-danger)", borderColor: "rgba(248, 113, 113, 0.32)", bg: "rgba(248, 113, 113, 0.08)" },
};

function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
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

function Strong({ children }: { children: ReactNode }) {
  return (
    <Text as="span" className="cc-num" color="var(--cc-text)" fontWeight={600}>
      {children}
    </Text>
  );
}

function CurrentPlanCard({
  tier,
  subscription,
  profile,
}: {
  tier: Tier;
  subscription: SubscriptionRow | null;
  profile: ProfileRow;
}) {
  const isLifetime = tier === "lifetime";
  const isMonthly = tier === "monthly" || tier === "quarterly" || tier === "yearly";
  const isHT = tier === "ht_1on1";
  const isFree = tier === "free";
  const isPremium = isLifetime || isHT;
  const subStatus = subscription ? subscriptionStatus(subscription.status) : null;

  // Im Free-Tier steht die Auswahl direkt unter dieser Karte, deshalb kein
  // Knopf — er würde auf etwas zeigen, das ohnehin schon sichtbar ist.
  const action = isFree ? null : isLifetime ? (
    <HStack spacing={2} color="var(--cc-text-2)" fontSize="14px">
      <Box as="span" display="inline-flex" color="var(--cc-gold-light)">
        <Sparkles size={14} strokeWidth={1.75} aria-hidden />
      </Box>
      <Text>Keine Verwaltung nötig</Text>
    </HStack>
  ) : profile.stripe_customer_id ? (
    <ManageSubscriptionButton />
  ) : null;

  return (
    // Hero (nächster Schritt) nur im Free-Tier; die Einstiegs-Animation liegt außen,
    // damit sie den atmenden Hero-Glow nicht überschreibt.
    <Box className="cc-rise" style={{ animationDelay: "80ms" }}>
      <DashCard label="Mitgliedschaft" labelId="billing-plan" hero={isFree} action={action}>
        <Stack spacing={3}>
          <Flex wrap="wrap" gap={2}>
            <Pill tone={isPremium ? "gold" : "neutral"}>{TIER_LABEL[tier]}</Pill>
            {subscription?.cancel_at_period_end ? <Pill tone="danger">Wird gekündigt</Pill> : null}
          </Flex>

          <CardValue as="h3">
            {isLifetime
              ? "Du hast lebenslangen Zugang ⚡"
              : isMonthly
                ? `Mitgliedschaft · ${TIER_LABEL[tier]}`
                : isHT
                  ? "1:1-Mentoring mit Emre"
                  : "Du bist im Free-Tier"}
          </CardValue>

          <Stack spacing={1.5} fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
            {isMonthly && subscription ? (
              <>
                <Text>
                  Nächste Abbuchung: <Strong>{formatDate(subscription.current_period_end)}</Strong>
                </Text>
                <Text>
                  Status:{" "}
                  <Text
                    as="span"
                    color={subStatus?.danger ? "var(--cc-danger)" : "var(--cc-text)"}
                    fontWeight={600}
                  >
                    {subStatus?.label}
                  </Text>
                </Text>
                {subscription.cancel_at_period_end ? (
                  <Text color="var(--cc-danger)">
                    Dein Zugang endet am{" "}
                    <Text as="span" className="cc-num">
                      {formatDate(subscription.current_period_end)}
                    </Text>
                    .
                  </Text>
                ) : null}
              </>
            ) : null}

            {isLifetime ? (
              <Text>
                Erworben am <Strong>{formatDate(profile.lifetime_purchased_at)}</Strong>. Keine wiederkehrenden
                Zahlungen.
              </Text>
            ) : null}

            {isHT ? <Text>Persönliches 1:1-Programm. Termine vereinbaren wir direkt mit dir per E-Mail.</Text> : null}

            {isFree ? (
              <Text>
                Du nutzt aktuell den kostenfreien Zugang. Wähle unten eine Laufzeit und schalte die komplette Plattform
                frei.
              </Text>
            ) : null}
          </Stack>
        </Stack>
      </DashCard>
    </Box>
  );
}

function PaymentsCard({
  payments,
  hasCustomer,
}: {
  payments: PaymentRow[];
  hasCustomer: boolean;
}) {
  return (
    <Box
      as="section"
      aria-labelledby="billing-payments"
      className="cc-card cc-card--still cc-rise"
      style={{ animationDelay: "150ms" }}
      p={{ base: 5, md: 6 }}
      minW={0}
    >
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "stretch", sm: "flex-start" }}
        gap={4}
        mb={5}
      >
        <Stack spacing={1} minW={0}>
          <Text
            as="h2"
            id="billing-payments"
            fontSize="13px"
            lineHeight="18px"
            fontWeight={500}
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="var(--cc-text-soft)"
          >
            Zahlungsverlauf
          </Text>
          <Meta>Letzte 12 Buchungen. Rechnungen findest du im Stripe-Portal.</Meta>
        </Stack>
        {hasCustomer && payments.length > 0 ? (
          <ManageSubscriptionButton label="Im Portal öffnen" variant="outline" />
        ) : null}
      </Flex>

      {payments.length === 0 ? (
        <Box py={10} textAlign="center" borderRadius="10px" border="1px dashed var(--cc-line-strong)">
          <Meta>Noch keine Zahlungen vorhanden.</Meta>
        </Box>
      ) : (
        <Box overflowX="auto" mx={{ base: -2, md: 0 }}>
          <Table variant="unstyled" size="sm">
            <Thead>
              <Tr>
                <PaymentTh>Datum</PaymentTh>
                <PaymentTh>Betrag</PaymentTh>
                <PaymentTh>Status</PaymentTh>
                <PaymentTh textAlign="right">Beleg</PaymentTh>
              </Tr>
            </Thead>
            <Tbody>
              {payments.map((p) => {
                const status = paymentStatusLabel(p.status);
                return (
                  <Tr key={p.id} _hover={{ bg: "rgba(255, 255, 255, 0.03)" }} transition="background 120ms ease">
                    <PaymentTd>
                      <Text className="cc-num" color="var(--cc-text)" fontSize="14px" whiteSpace="nowrap">
                        {formatDate(p.paid_at ?? p.created_at)}
                      </Text>
                    </PaymentTd>
                    <PaymentTd>
                      <Text className="cc-num" fontSize="14px" fontWeight={500} color="var(--cc-text)" whiteSpace="nowrap">
                        {formatAmount(p.amount_cents, p.currency)}
                      </Text>
                    </PaymentTd>
                    <PaymentTd>
                      <HStack spacing={2}>
                        <Box w="8px" h="8px" borderRadius="full" bg={status.color} flexShrink={0} aria-hidden />
                        <Text fontSize="13px" color={status.color} whiteSpace="nowrap">
                          {status.label}
                        </Text>
                      </HStack>
                      {p.failure_reason ? (
                        <Text fontSize="12px" color="var(--cc-text-3)" mt={0.5}>
                          {p.failure_reason}
                        </Text>
                      ) : null}
                    </PaymentTd>
                    <PaymentTd textAlign="right">
                      {p.stripe_invoice_id ? (
                        <Text className="cc-num" fontSize="12px" color="var(--cc-text-3)" isTruncated maxW="160px" ml="auto">
                          {p.stripe_invoice_id}
                        </Text>
                      ) : (
                        <Text fontSize="12px" color="var(--cc-text-3)">
                          —
                        </Text>
                      )}
                    </PaymentTd>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

function PaymentTh({ children, ...rest }: React.ComponentProps<typeof Th>) {
  return (
    <Th
      borderBottom="1px solid var(--cc-line)"
      color="var(--cc-text-3)"
      fontSize="12px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      whiteSpace="nowrap"
      px={3}
      py={3}
      {...rest}
    >
      {children}
    </Th>
  );
}

function PaymentTd({ children, ...rest }: React.ComponentProps<typeof Td>) {
  return (
    <Td borderBottom="1px solid var(--cc-line)" px={3} py={3} {...rest}>
      {children}
    </Td>
  );
}
