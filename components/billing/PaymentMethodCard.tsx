"use client";

import { Box, Flex, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { IconTile, Meta } from "@/components/platform/dashboard/primitives";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";

type Method = {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  sepaLast4: string | null;
};

type Zustand =
  | { art: "laedt" }
  | { art: "fehler" }
  | { art: "fertig"; methode: Method | null; hatKunden: boolean };

const MARKEN: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
  link: "Link",
};

function beschriftung(m: Method): { titel: string; zeile: string | null } {
  if (m.type === "sepa_debit" && m.sepaLast4) {
    return { titel: "SEPA-Lastschrift", zeile: `IBAN endet auf ${m.sepaLast4}` };
  }
  if (m.last4) {
    const marke = m.brand ? (MARKEN[m.brand] ?? m.brand) : "Karte";
    const gueltig =
      m.expMonth && m.expYear
        ? `Gültig bis ${String(m.expMonth).padStart(2, "0")}/${String(m.expYear).slice(-2)}`
        : null;
    return { titel: `${marke} •••• ${m.last4}`, zeile: gueltig };
  }
  return { titel: m.type, zeile: null };
}

/**
 * Hinterlegte Zahlungsmethode.
 *
 * Geändert wird sie im Stripe-Portal, nicht hier: Ein eigenes Kartenformular
 * müsste Kartendaten entgegennehmen und damit den gesamten PCI-Umfang tragen,
 * den Stripe uns sonst abnimmt.
 */
export function PaymentMethodCard() {
  const [zustand, setZustand] = useState<Zustand>({ art: "laedt" });

  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const res = await fetch("/api/stripe/payment-method");
        const json = (await res.json()) as {
          ok?: boolean;
          method?: Method | null;
          hasCustomer?: boolean;
        };
        if (abgebrochen) return;
        if (!res.ok || !json.ok) {
          setZustand({ art: "fehler" });
          return;
        }
        setZustand({
          art: "fertig",
          methode: json.method ?? null,
          hatKunden: Boolean(json.hasCustomer),
        });
      } catch {
        if (!abgebrochen) setZustand({ art: "fehler" });
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  if (zustand.art === "laedt") {
    return (
      <HStack py={8} justify="center" spacing={3} role="status">
        <Spinner size="sm" color="var(--cc-gold)" />
        <Meta>Zahlungsmethode wird geladen…</Meta>
      </HStack>
    );
  }

  if (zustand.art === "fehler") {
    return (
      <Box py={8} textAlign="center" borderRadius="10px" border="1px dashed var(--cc-line-strong)">
        <Meta>Die Zahlungsmethode konnte nicht geladen werden.</Meta>
      </Box>
    );
  }

  if (!zustand.methode) {
    return (
      <Stack spacing={4}>
        <Box py={8} textAlign="center" borderRadius="10px" border="1px dashed var(--cc-line-strong)">
          <Meta>
            {zustand.hatKunden
              ? "Es ist keine Zahlungsmethode hinterlegt."
              : "Du hast noch keine Zahlung getätigt, deshalb ist auch keine Zahlungsmethode hinterlegt."}
          </Meta>
        </Box>
        {zustand.hatKunden ? (
          <Box>
            <ManageSubscriptionButton label="Zahlungsmethode hinterlegen" flow="payment_method_update" />
          </Box>
        ) : null}
      </Stack>
    );
  }

  const { titel, zeile } = beschriftung(zustand.methode);

  return (
    <Flex
      direction={{ base: "column", sm: "row" }}
      align={{ base: "stretch", sm: "center" }}
      justify="space-between"
      gap={4}
    >
      <HStack spacing={4} minW={0}>
        <IconTile>
          <CreditCard size={24} strokeWidth={1.5} aria-hidden />
        </IconTile>
        <Stack spacing={0.5} minW={0}>
          <Text className="cc-num" fontSize={{ base: "17px", md: "18px" }} fontWeight={600} color="var(--cc-text)">
            {titel}
          </Text>
          {zeile ? <Meta className="cc-num">{zeile}</Meta> : null}
        </Stack>
      </HStack>

      <Box flexShrink={0}>
        <ManageSubscriptionButton label="Zahlungsmethode ändern" variant="outline" flow="payment_method_update" />
      </Box>
    </Flex>
  );
}
