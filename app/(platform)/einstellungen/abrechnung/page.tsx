import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { formatAmount, formatDate, paymentStatusLabel } from "@/components/billing/format";
import { Meta } from "@/components/platform/dashboard/primitives";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Abrechnung — Capital Circle",
};

export const dynamic = "force-dynamic";

type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  failure_reason: string | null;
};

/**
 * Rechnungen und Buchungen.
 *
 * Zwei Listen, weil sie zwei verschiedene Fragen beantworten: Die Rechnungen
 * kommen live aus Stripe und sind das, was man beim Steuerberater abgibt. Die
 * Buchungen darunter stehen lokal in `payments` und zeigen auch die
 * **gescheiterten** Versuche samt Grund — die haben bei Stripe gar keine
 * bezahlte Rechnung und würden oben fehlen.
 */
export default async function AbrechnungPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect("/login?next=/einstellungen/abrechnung");

  const { data: paymentsRaw } = await supabase
    .from("payments")
    .select("id,amount_cents,currency,status,paid_at,created_at,failure_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);
  const payments = (paymentsRaw as PaymentRow[] | null) ?? [];

  return (
    <>
      <Box
        as="section"
        aria-labelledby="abrechnung-rechnungen"
        className="cc-card cc-card--still cc-rise"
        style={{ animationDelay: "80ms" }}
        p={{ base: 5, md: 6 }}
        minW={0}
      >
        <Stack spacing={1} mb={4}>
          <SectionTitle id="abrechnung-rechnungen">Rechnungen</SectionTitle>
          <Meta>Jede Rechnung als PDF, direkt aus Stripe — inklusive Steuerausweis.</Meta>
        </Stack>
        <InvoiceList />
      </Box>

      <Box
        as="section"
        aria-labelledby="abrechnung-buchungen"
        className="cc-card cc-card--still cc-rise"
        style={{ animationDelay: "150ms" }}
        p={{ base: 5, md: 6 }}
        minW={0}
      >
        <Stack spacing={1} mb={4}>
          <SectionTitle id="abrechnung-buchungen">Buchungen</SectionTitle>
          <Meta>Letzte 24 Abbuchungen, auch fehlgeschlagene.</Meta>
        </Stack>

        {payments.length === 0 ? (
          <Box py={10} textAlign="center" borderRadius="10px" border="1px dashed var(--cc-line-strong)">
            <Meta>Noch keine Buchungen vorhanden.</Meta>
          </Box>
        ) : (
          <Stack spacing={0} divider={<Box h="1px" bg="var(--cc-line)" />}>
            {payments.map((p) => {
              const status = paymentStatusLabel(p.status);
              return (
                <HStack key={p.id} justify="space-between" align="flex-start" gap={3} py={3}>
                  <Stack spacing={0.5} minW={0}>
                    <Text className="cc-num" fontSize="15px" fontWeight={500} color="var(--cc-text)">
                      {formatAmount(p.amount_cents, p.currency)}
                    </Text>
                    <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)">
                      {formatDate(p.paid_at ?? p.created_at)}
                    </Text>
                    {p.failure_reason ? (
                      <Text fontSize="12px" color="var(--cc-text-3)">
                        {p.failure_reason}
                      </Text>
                    ) : null}
                  </Stack>
                  <HStack spacing={2} flexShrink={0} pt={1}>
                    <Box w="8px" h="8px" borderRadius="full" bg={status.color} aria-hidden />
                    <Text fontSize="13px" color={status.color} whiteSpace="nowrap">
                      {status.label}
                    </Text>
                  </HStack>
                </HStack>
              );
            })}
          </Stack>
        )}
      </Box>
    </>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Text
      as="h2"
      id={id}
      fontSize="13px"
      lineHeight="18px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      color="var(--cc-text-soft)"
    >
      {children}
    </Text>
  );
}
