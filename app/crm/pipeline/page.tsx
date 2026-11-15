import { CrmPipeline } from "@/components/crm/CrmPipeline";

export const dynamic = "force-dynamic";

/** `/crm/pipeline` — Kanban über alle offenen Phasen. Nutzer kommt aus dem Rahmen (`app/crm/layout.tsx`). */
export default function Seite() {
  return <CrmPipeline />;
}
