import { CrmHeute } from "@/components/crm/CrmHeute";

export const dynamic = "force-dynamic";

/** `/crm` — Heute: Jetzt handeln, Tagesplan, neue Leads, Wiedervorlagen. Nutzer kommt aus dem Rahmen (`app/crm/layout.tsx`). */
export default function Seite() {
  return <CrmHeute />;
}
