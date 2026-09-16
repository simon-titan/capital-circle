import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { PositionCalculator } from "@/components/trading-journal/PositionCalculator";
import { getCurrentUserAndProfile } from "@/lib/server-data";

/** Bewusst ohne Paid-Gate: der Rechner steht allen eingeloggten Mitgliedern offen. */
export default async function PositionRechnerPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  return (
    <Box w="100%" maxW="720px" mx="auto">
      <PageHeader
        title="Positionsrechner"
        subtitle="Risiko und Reward für Futures-Minis und -Mikros schnell überschlagen — Ticks oder accountbasiert."
      />
      <Box className="cc-card cc-card--still" w="100%" px={{ base: 4, md: 8 }} py={{ base: 5, md: 7 }}>
        <PositionCalculator />
      </Box>
    </Box>
  );
}
