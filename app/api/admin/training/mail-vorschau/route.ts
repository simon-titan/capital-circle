import { render } from "@react-email/render";
import { ALLE_PLAYBOOK_IDS, beispielMail } from "@/lib/email/templates/playbook/vorschau";
import type { VorlageId } from "@/lib/mailsystem/vorlagen";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/training/mail-vorschau?id=A02 — eine Playbook-Mail als HTML
 * mit Beispieldaten, genau so gerendert wie beim Versand. Für die Abnahme
 * durch Emre unter `/admin/training/mails`. Nur für Admins.
 */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const id = new URL(request.url).searchParams.get("id") as VorlageId | null;
  if (!id || !ALLE_PLAYBOOK_IDS.includes(id)) return new Response("Unbekannte Vorlage", { status: 404 });
  const html = await render(beispielMail(id).jsx);
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
