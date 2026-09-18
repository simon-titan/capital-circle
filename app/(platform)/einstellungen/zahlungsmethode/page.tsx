import type { Metadata } from "next";
import { Stack } from "@chakra-ui/react";
import { PaymentMethodCard } from "@/components/billing/PaymentMethodCard";
import { DashCard, Meta } from "@/components/platform/dashboard/primitives";

export const metadata: Metadata = {
  title: "Zahlungsmethode — Capital Circle",
};

export const dynamic = "force-dynamic";

export default function ZahlungsmethodePage() {
  return (
    <DashCard
      label="Zahlungsmethode"
      labelId="zahlungsmethode"
      className="cc-card--still cc-rise"
      style={{ animationDelay: "80ms" }}
    >
      <Stack spacing={5}>
        <PaymentMethodCard />
        <Meta>
          Die Änderung läuft über die gesicherte Seite von Stripe. Wir sehen und speichern deine
          Kartendaten nicht.
        </Meta>
      </Stack>
    </DashCard>
  );
}
