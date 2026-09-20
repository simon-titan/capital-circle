"use client";

import { Box, Button, Flex, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { Download, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Meta } from "@/components/platform/dashboard/primitives";
import { formatAmount, formatDate, paymentStatusLabel } from "./format";

type Invoice = {
  id: string;
  number: string | null;
  date: string;
  amountCents: number;
  currency: string;
  status: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

type Zustand =
  | { art: "laedt" }
  | { art: "fehler"; text: string }
  | { art: "fertig"; rechnungen: Invoice[]; hatKunden: boolean };

/**
 * Rechnungsliste mit PDF-Download.
 *
 * Sie lädt im Browser nach, statt serverseitig zu rendern: Der Stripe-Abruf
 * dauert je nach Konto ein paar hundert Millisekunden, und die Seite soll
 * nicht darauf warten. Fällt Stripe aus, bleibt der Rest der Seite bedienbar.
 */
export function InvoiceList() {
  const [zustand, setZustand] = useState<Zustand>({ art: "laedt" });

  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const res = await fetch("/api/stripe/invoices");
        const json = (await res.json()) as {
          ok?: boolean;
          invoices?: Invoice[];
          hasCustomer?: boolean;
          error?: string;
        };
        if (abgebrochen) return;
        if (!res.ok || !json.ok) {
          setZustand({
            art: "fehler",
            text:
              json.error === "stripe_unavailable"
                ? "Stripe antwortet gerade nicht. Versuch es in ein paar Minuten noch einmal."
                : "Rechnungen konnten nicht geladen werden.",
          });
          return;
        }
        setZustand({
          art: "fertig",
          rechnungen: json.invoices ?? [],
          hatKunden: Boolean(json.hasCustomer),
        });
      } catch {
        if (!abgebrochen) {
          setZustand({ art: "fehler", text: "Netzwerkfehler beim Laden der Rechnungen." });
        }
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
        <Meta>Rechnungen werden geladen…</Meta>
      </HStack>
    );
  }

  if (zustand.art === "fehler") {
    return (
      <Box py={8} textAlign="center" borderRadius="10px" border="1px dashed var(--cc-line-strong)">
        <Meta>{zustand.text}</Meta>
      </Box>
    );
  }

  if (zustand.rechnungen.length === 0) {
    return (
      <Box py={10} textAlign="center" borderRadius="10px" border="1px dashed var(--cc-line-strong)">
        <Meta>
          {zustand.hatKunden
            ? "Noch keine Rechnung vorhanden."
            : "Für dein Konto liegt keine Zahlung vor, deshalb gibt es auch keine Rechnung."}
        </Meta>
      </Box>
    );
  }

  return (
    <Stack spacing={0} divider={<Box h="1px" bg="var(--cc-line)" />}>
      {zustand.rechnungen.map((rechnung) => {
        const status = paymentStatusLabel(rechnung.status ?? "");
        return (
          <Flex
            key={rechnung.id}
            direction={{ base: "column", sm: "row" }}
            align={{ base: "flex-start", sm: "center" }}
            justify="space-between"
            gap={3}
            py={3.5}
          >
            <Stack spacing={0.5} minW={0}>
              <HStack spacing={2} flexWrap="wrap">
                <Text className="cc-num" fontSize="15px" fontWeight={500} color="var(--cc-text)">
                  {formatAmount(rechnung.amountCents, rechnung.currency)}
                </Text>
                <Box w="4px" h="4px" borderRadius="full" bg="var(--cc-text-3)" aria-hidden />
                <Text className="cc-num" fontSize="14px" color="var(--cc-text-2)">
                  {formatDate(rechnung.date)}
                </Text>
              </HStack>
              <HStack spacing={2} flexWrap="wrap">
                <Text fontSize="12px" color={status.color}>
                  {status.label}
                </Text>
                {rechnung.number ? (
                  <Text className="cc-num" fontSize="12px" color="var(--cc-text-3)">
                    · {rechnung.number}
                  </Text>
                ) : null}
              </HStack>
            </Stack>

            <HStack spacing={2} flexShrink={0}>
              {rechnung.hostedUrl ? (
                <Button
                  as="a"
                  href={rechnung.hostedUrl}
                  target="_blank"
                  rel="noopener"
                  size="sm"
                  variant="line"
                  rightIcon={<ExternalLink size={13} aria-hidden />}
                >
                  Ansehen
                </Button>
              ) : null}
              {rechnung.pdfUrl ? (
                <Button
                  as="a"
                  href={rechnung.pdfUrl}
                  size="sm"
                  variant="line"
                  leftIcon={<Download size={14} aria-hidden />}
                >
                  PDF
                </Button>
              ) : null}
            </HStack>
          </Flex>
        );
      })}
    </Stack>
  );
}
