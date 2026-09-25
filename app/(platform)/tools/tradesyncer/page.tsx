import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { TradeSyncerSeite } from "@/components/platform/tools/TradeSyncerSeite";
import { hatInhaltsZugang } from "@/lib/membership";
import { getCurrentUserAndProfile } from "@/lib/server-data";

/** TradeSyncer-Partnerseite (Tools, seit 25.09.2026). Nur für zahlende Mitglieder. */
export default async function TradeSyncerPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");
  if (!hatInhaltsZugang(profile)) redirect("/dashboard");

  return (
    <Box w="100%" maxW="1040px" mx="auto">
      <TradeSyncerSeite />
    </Box>
  );
}
