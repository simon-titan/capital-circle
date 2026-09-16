import { redirect } from "next/navigation";
import { JournalChrome } from "@/components/journal/JournalChrome";
import { evaluateAccess } from "@/lib/access-control/has-access";
import { getCurrentUserAndProfile } from "@/lib/server-data";

/**
 * Einziger Zugangspunkt des neuen Journals — deckt Home, Dashboard, Trades und
 * Tages-Ansicht ab. Der Import-Endpunkt prüft zusätzlich selbst (RLS kennt nur
 * Eigentum, nicht den Bezahlstatus).
 */
export default async function TradingJournalLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");
  if (!evaluateAccess(profile).hasAccess) redirect("/dashboard");

  return <JournalChrome>{children}</JournalChrome>;
}
