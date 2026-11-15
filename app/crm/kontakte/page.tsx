import { CrmListe } from "@/components/crm/CrmListe";

export const dynamic = "force-dynamic";

/** `/crm/kontakte` — alle Kontakte mit Ansichten, Filtern und Umverteilen. */
export default function Seite() {
  return <CrmListe />;
}
