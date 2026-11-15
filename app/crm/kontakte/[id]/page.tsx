import { CrmKontakt } from "@/components/crm/CrmKontakt";

export const dynamic = "force-dynamic";

/** `/crm/kontakte/<id>` — ein Kontakt mit allem, was der Closer braucht. */
export default async function Seite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CrmKontakt id={id} />;
}
