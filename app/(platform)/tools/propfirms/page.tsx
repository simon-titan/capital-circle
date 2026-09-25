import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { ApexPromoCard } from "@/components/platform/tools/ApexPromoCard";
import { hatInhaltsZugang } from "@/lib/membership";
import { getCurrentUserAndProfile } from "@/lib/server-data";

/**
 * Propfirms (Tools, seit 25.09.2026): Partnerseite wie früher auf SNTTRADES.
 * Heute nur Apex Trader Funding; eine weitere Firma ist eine weitere Karte
 * darunter. Link und Code stehen in `config/apex-promo.ts`.
 */
export default async function PropfirmsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");
  if (!hatInhaltsZugang(profile)) redirect("/dashboard");

  return (
    <Box w="100%" maxW="960px" mx="auto">
      <PageHeader
        title="Propfirms"
        subtitle="Emres Empfehlung für Funded Accounts und der Rabatt, mit dem du bei deiner nächsten Challenge sparst."
      />
      <Stack spacing={4}>
        <ApexPromoCard />
        <Text fontSize="13px" color="var(--cc-text-3)" lineHeight={1.5} px={1}>
          Der Button führt über unseren Partnerlink zu Apex. Für dich ändert sich am Preis nichts, außer dem Rabatt durch
          den Code.
        </Text>
      </Stack>
    </Box>
  );
}
