import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Box,
  Flex,
  HStack,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";

export const metadata: Metadata = {
  title: "Mitgliedschaft & Zahlungen — Capital Circle",
};

export const dynamic = "force-dynamic";

type Tier = "free" | "monthly" | "lifetime" | "ht_1on1";

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
  lifetime: "Lifetime",
  ht_1on1: "1:1-Mentoring",
};

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
    return { label: "Bezahlt", color: "#4ADE80" };
  }
  if (s === "failed" || s === "payment_failed" || s === "uncollectible") {
    return { label: "Fehlgeschlagen", color: "#F87171" };
  }
  if (s === "refunded") {
    return { label: "Erstattet", color: "#9A9AA4" };
  }
  if (s === "pending" || s === "processing" || s === "requires_action") {
    return { label: "Ausstehend", color: "#FDE047" };
  }
  return { label: status, color: "#9A9AA4" };
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
    <Stack spacing={{ base: 6, md: 8 }} maxW="900px" mx="auto" w="full">
      <Stack spacing={2}>
        <Text
          fontSize="xs"
          letterSpacing="0.22em"
          textTransform="uppercase"
          color="var(--color-accent-gold)"
          className="inter-semibold"
        >
          Mitgliedschaft
        </Text>
        <Text
          as="h1"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "3xl", md: "4xl" }}
          lineHeight="1.15"
          color="var(--color-text-primary)"
        >
          Abo & Zahlungen
        </Text>
      </Stack>

      <CurrentPlanCard tier={tier} subscription={activeSub} profile={profile} />

      <PaymentsCard payments={payments} hasCustomer={Boolean(profile.stripe_customer_id)} />
    </Stack>
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
  const isMonthly = tier === "monthly";
  const isHT = tier === "ht_1on1";
  const isFree = tier === "free";

  return (
    <Box
      p={{ base: 6, md: 7 }}
      borderRadius="16px"
      sx={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: isLifetime
          ? "1.5px solid rgba(212,175,55,0.40)"
          : "1px solid rgba(255,255,255,0.09)",
        boxShadow: isLifetime
          ? "0 0 60px rgba(212,175,55,0.18), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)"
          : "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        gap={6}
      >
        <Stack spacing={3}>
          <HStack spacing={3}>
            <TierBadge tier={tier} />
            {subscription?.cancel_at_period_end ? (
              <Box
                px="10px"
                py="4px"
                borderRadius="9999px"
                fontSize="11px"
                className="inter-semibold"
                color="#FCA5A5"
                bg="rgba(239,68,68,0.10)"
                borderWidth="1px"
                borderColor="rgba(239,68,68,0.32)"
                letterSpacing="0.06em"
                textTransform="uppercase"
              >
                Wird gekündigt
              </Box>
            ) : null}
          </HStack>

          <Text
            as="h2"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "xl", md: "2xl" }}
            color="var(--color-text-primary)"
          >
            {isLifetime
              ? "Du hast lebenslangen Zugang ⚡"
              : isMonthly
                ? "Monatliche Mitgliedschaft"
                : isHT
                  ? "1:1-Mentoring mit Emre"
                  : "Du bist im Free-Tier"}
          </Text>

          <Stack spacing={1.5} className="inter" color="rgba(255,255,255,0.72)" fontSize="sm">
            {isMonthly && subscription ? (
              <>
                <Text>
                  Nächste Abbuchung:{" "}
                  <Text as="span" color="var(--color-text-primary)" className="inter-semibold">
                    {formatDate(subscription.current_period_end)}
                  </Text>
                </Text>
                <Text>
                  Status:{" "}
                  <Text as="span" color="var(--color-text-primary)" className="inter-semibold">
                    {subscription.status}
                  </Text>
                </Text>
                {subscription.cancel_at_period_end ? (
                  <Text color="#FCA5A5">
                    Dein Zugang endet am {formatDate(subscription.current_period_end)}.
                  </Text>
                ) : null}
              </>
            ) : null}

            {isLifetime ? (
              <Text>
                Erworben am{" "}
                <Text as="span" color="var(--color-text-primary)" className="inter-semibold">
                  {formatDate(profile.lifetime_purchased_at)}
                </Text>
                . Keine wiederkehrenden Zahlungen.
              </Text>
            ) : null}

            {isHT ? (
              <Text>
                Persönliches 1:1-Programm. Termine vereinbaren wir direkt mit dir per E-Mail.
              </Text>
            ) : null}

            {isFree ? (
              <Text>
                Du nutzt aktuell den kostenfreien Zugang. Schalte mit einer Mitgliedschaft die komplette Plattform frei.
              </Text>
            ) : null}
          </Stack>
        </Stack>

        <Stack spacing={2} align={{ base: "stretch", md: "flex-end" }} minW={{ md: "200px" }}>
          {isFree ? (
            <Box
              as="a"
              href="/pricing"
              display="inline-flex"
              alignItems="center"
              gap="8px"
              justifyContent="center"
              px={5}
              minH="44px"
              borderRadius="10px"
              color="#FFFFFF"
              className="inter-semibold"
              fontSize="14px"
              bg="linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
              boxShadow="0 0 20px rgba(212,175,55,0.20), inset 0 1px 0 rgba(255,255,255,0.12)"
              transition="all 150ms cubic-bezier(0.16, 1, 0.3, 1)"
              _hover={{
                bg: "linear-gradient(135deg, #E8C547 0%, #D4AF37 100%)",
                boxShadow:
                  "0 0 32px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.16)",
                transform: "translateY(-1px)",
              }}
            >
              Mitgliedschaft wählen
            </Box>
          ) : isLifetime ? (
            <HStack
              spacing={2}
              color="rgba(255,255,255,0.55)"
              className="inter"
              fontSize="sm"
            >
              <Sparkles size={14} color="#D4AF37" />
              <Text>Keine Verwaltung nötig</Text>
            </HStack>
          ) : profile.stripe_customer_id ? (
            <ManageSubscriptionButton />
          ) : null}
        </Stack>
      </Flex>
    </Box>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  const isPremium = tier === "lifetime" || tier === "ht_1on1";
  return (
    <Box
      px="12px"
      py="4px"
      borderRadius="9999px"
      fontSize="11px"
      className="inter-semibold"
      letterSpacing="0.10em"
      textTransform="uppercase"
      color={isPremium ? "#07080A" : "var(--color-text-primary)"}
      bg={
        isPremium
          ? "linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
          : "rgba(255,255,255,0.09)"
      }
      borderWidth={isPremium ? 0 : "1px"}
      borderColor="rgba(255,255,255,0.16)"
      sx={{
        backdropFilter: isPremium ? undefined : "blur(8px)",
      }}
    >
      {TIER_LABEL[tier]}
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
      p={{ base: 6, md: 7 }}
      borderRadius="16px"
      sx={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.09)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "flex-start", sm: "center" }}
        gap={4}
        mb={5}
      >
        <Stack spacing={1}>
          <Text
            as="h2"
            className="radley-regular"
            fontWeight={400}
            fontSize="xl"
            color="var(--color-text-primary)"
          >
            Zahlungsverlauf
          </Text>
          <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.55)">
            Letzte 12 Buchungen. Rechnungen findest du im Stripe-Portal.
          </Text>
        </Stack>
        {hasCustomer && payments.length > 0 ? (
          <ManageSubscriptionButton label="Im Portal öffnen" variant="outline" />
        ) : null}
      </Flex>

      {payments.length === 0 ? (
        <Box
          py={10}
          textAlign="center"
          borderRadius="12px"
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="rgba(255,255,255,0.10)"
        >
          <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.55)">
            Noch keine Zahlungen vorhanden.
          </Text>
        </Box>
      ) : (
        <Box overflowX="auto">
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
                  <Tr
                    key={p.id}
                    _hover={{ bg: "rgba(255,255,255,0.03)" }}
                    transition="background 120ms ease"
                  >
                    <PaymentTd>
                      <Text className="inter" color="var(--color-text-primary)" fontSize="sm">
                        {formatDate(p.paid_at ?? p.created_at)}
                      </Text>
                    </PaymentTd>
                    <PaymentTd>
                      <Text
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {formatAmount(p.amount_cents, p.currency)}
                      </Text>
                    </PaymentTd>
                    <PaymentTd>
                      <HStack spacing={2}>
                        <Box
                          w="8px"
                          h="8px"
                          borderRadius="full"
                          bg={status.color}
                          flexShrink={0}
                        />
                        <Text
                          className="inter"
                          fontSize="13px"
                          color={status.color}
                        >
                          {status.label}
                        </Text>
                      </HStack>
                      {p.failure_reason ? (
                        <Text
                          className="inter"
                          fontSize="11px"
                          color="rgba(255,255,255,0.45)"
                          mt={0.5}
                        >
                          {p.failure_reason}
                        </Text>
                      ) : null}
                    </PaymentTd>
                    <PaymentTd textAlign="right">
                      {p.stripe_invoice_id ? (
                        <Text
                          className="inter"
                          fontSize="11px"
                          color="rgba(255,255,255,0.45)"
                          fontFamily="mono"
                          isTruncated
                          maxW="160px"
                        >
                          {p.stripe_invoice_id}
                        </Text>
                      ) : (
                        <Text className="inter" fontSize="11px" color="rgba(255,255,255,0.32)">
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
      borderBottom="1px solid rgba(255,255,255,0.08)"
      color="rgba(255,255,255,0.45)"
      className="inter-semibold"
      fontSize="11px"
      letterSpacing="0.08em"
      textTransform="uppercase"
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
    <Td
      borderBottom="1px solid rgba(255,255,255,0.05)"
      px={3}
      py={3}
      {...rest}
    >
      {children}
    </Td>
  );
}
