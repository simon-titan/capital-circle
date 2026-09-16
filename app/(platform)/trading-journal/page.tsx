import { HomeView } from "@/components/journal/home/HomeView";
import { getCurrentUserAndProfile } from "@/lib/server-data";

/** Das Paid-Gate sitzt im Layout — hier reicht der Anzeigename. */
export default async function TradingJournalHomePage() {
  const { profile } = await getCurrentUserAndProfile();

  const fullName = profile?.full_name || profile?.username || "Trader";
  const firstName = fullName.trim().split(/\s+/)[0];

  return <HomeView firstName={firstName} />;
}
