import type { Metadata } from "next";
import { Box } from "@chakra-ui/react";
import { LiveZugangAbgelaufen } from "@/components/platform/LiveZugangAbgelaufen";

export const metadata: Metadata = { title: "Live-Trading weiterführen · Capital Circle" };
export const dynamic = "force-dynamic";

/**
 * `/live-abo` — Ziel der Anschlussangebote V01/V02 (E-Mail-Playbook 1.0,
 * `live_subscription_checkout_url`). Eine Seite mit dem Kassenknopf statt eines
 * direkten Kassenlinks in der Mail: Mail-Scanner rufen Links vorab auf, und ein
 * GET darf keine Stripe-Kasse anlegen. Der Knopf ist dasselbe POST-Formular wie
 * im Live-Bereich (`/api/live-abo`).
 */
export default async function LiveAboPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const roh = (await searchParams).live_fehler;
  const fehler = (Array.isArray(roh) ? roh[0] : roh) ?? null;
  return (
    <Box maxW="720px" mx="auto" py={{ base: 6, md: 10 }}>
      <LiveZugangAbgelaufen
        titel="Live-Trading weiterführen"
        text="Mit dem Live-Trading-Abo bist du weiter bei den regulären Live-Trading-Sessions dabei. Dein gekaufter Videokurs bleibt dir auch ohne dieses Abo dauerhaft erhalten. Ohne zusätzliche Buchung entsteht kein Anschlussabo."
        fehler={fehler}
        von="live-abo"
      />
    </Box>
  );
}
