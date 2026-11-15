import { CrmTeam } from "@/components/crm/CrmTeam";
import { ladeCrmNutzer } from "@/lib/crm/zugang";

export const dynamic = "force-dynamic";

/** `/crm/team` — Vertriebsteam mit Call-Blöcken (ändern nur Admins). */
export default async function Seite() {
  const nutzer = await ladeCrmNutzer();
  return <CrmTeam istAdmin={Boolean(nutzer?.istAdmin)} />;
}
