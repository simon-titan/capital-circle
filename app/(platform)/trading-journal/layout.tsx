import { redirect } from "next/navigation";
import { JournalChrome } from "@/components/journal/JournalChrome";
import { hatInhaltsZugang } from "@/lib/membership";
import { getCurrentUserAndProfile } from "@/lib/server-data";

/**
 * Einziger Zugangspunkt des neuen Journals — deckt Home, Dashboard, Trades und
 * Tages-Ansicht ab. Der Import-Endpunkt prüft zusätzlich selbst (RLS kennt nur
 * Eigentum, nicht den Bezahlstatus).
 *
 * Zugang heißt `is_paid` oder Admin (`hatInhaltsZugang`) — dieselbe Regel wie
 * Institut, Discord und `public.hat_zugang()`. Nicht `evaluateAccess()`: Die
 * Whop-Konten stehen auf `membership_tier = 'free'` mit `is_paid = true` und
 * wurden damit bis 29.09.2026 ausnahmslos aufs Dashboard zurückgeschickt.
 */
export default async function TradingJournalLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");
  if (!hatInhaltsZugang(profile)) redirect("/dashboard");

  return <JournalChrome>{children}</JournalChrome>;
}
