import { NextResponse, type NextRequest } from "next/server";
import { TRAINING_VIDEOS_PFAD } from "@/config/training";
import { verifyReaktivierungToken } from "@/lib/email/unsubscribe-token";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { REAKTIVIERUNG_LOGIN_TAGE, reaktiviere } from "@/lib/training/reaktivierung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/training/aktivieren `{ t }` — Knopf auf `/training/aktivieren`
 * (Retargeting-Mail RT01). Schaltet das kostenlose Training für 30 Tage frei
 * (`lib/training/reaktivierung.ts`) und sagt dem Browser, wohin:
 *
 *   - schon als dieses Konto angemeldet → direkt zum Kurs
 *   - sonst, solange der Link höchstens 45 Tage alt ist → Anmeldelink
 *     (`generateLink magiclink` → `/auth/confirm` → Kurs). Der Link aus der
 *     Mail belegt den Besitz des Postfachs wie ein Magic Link.
 *   - danach → Login mit Rücksprung zum Kurs
 *
 * Die Ziele sind relativ: In der Preview bleibt man so in der Preview.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { t?: unknown };
  const geprueft = typeof body.t === "string" ? verifyReaktivierungToken(body.t) : null;
  if (!geprueft) return NextResponse.json({ ok: false, error: "link_ungueltig" }, { status: 400 });

  const service = createServiceClient();
  const { data: authUser } = await service.auth.admin.getUserById(geprueft.userId);
  const email = authUser?.user?.email;
  if (!email) return NextResponse.json({ ok: false, error: "link_ungueltig" }, { status: 400 });

  const r = await reaktiviere(service, geprueft.userId, email);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.fehler }, { status: r.fehler === "server" ? 500 : 409 });

  const supabase = await createClient();
  const { data: sitzung } = await supabase.auth.getUser();
  if (sitzung.user?.id === geprueft.userId) return NextResponse.json({ ok: true, ziel: TRAINING_VIDEOS_PFAD });

  const alterTage = (Date.now() - geprueft.ausgestellt.getTime()) / 86_400_000;
  if (alterTage <= REAKTIVIERUNG_LOGIN_TAGE) {
    const { data: link, error } = await service.auth.admin.generateLink({ type: "magiclink", email });
    if (!error && link?.properties?.hashed_token) {
      const ziel = new URLSearchParams({ token_hash: link.properties.hashed_token, type: "magiclink", next: TRAINING_VIDEOS_PFAD });
      return NextResponse.json({ ok: true, ziel: `/auth/confirm?${ziel.toString()}` });
    }
    console.error("[training/aktivieren] Anmeldelink:", error?.message);
  }
  return NextResponse.json({ ok: true, ziel: `/login?next=${encodeURIComponent(TRAINING_VIDEOS_PFAD)}` });
}
