import { NextResponse } from "next/server";
import { GESPRAECH_STELLEN, type GespraechStelle } from "@/config/training";
import { createClient } from "@/lib/supabase/server";
import { benachrichtigeTeamTraining } from "@/lib/email/templates/training-team";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeTrainingsStand } from "@/lib/training/stand";

export const runtime = "nodejs";

/**
 * POST /api/training/gespraech — Analysegespräch aus dem Mitgliederbereich
 * anfragen (Kontaktschritt des Modals). Body: `{ stelle, name, email, phone }`.
 *
 * Schreibt in `training_leads` (eigenes CRM-Board `/admin/training`, getrennt
 * von `discord_leads`). Ein offener Lead desselben Kontos wird wiederverwendet
 * — wer das Modal schließt und später von einer anderen Stelle neu öffnet, soll
 * im Board nicht doppelt stehen. Die Stelle der **ersten** Anfrage bleibt.
 *
 * Antwort: `{ ok, token }` — der Token geht als `utm_content` an Calendly.
 */
const OFFEN = ["neu", "nachfassen", "no_show"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const stelle = (GESPRAECH_STELLEN as readonly string[]).includes(String(body.stelle))
    ? (body.stelle as GespraechStelle)
    : "dashboard";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 5) {
    return NextResponse.json({ ok: false, error: "felder" }, { status: 400 });
  }

  const stand = await ladeTrainingsStand(supabase, user.id).catch(() => null);
  const videosGesehen = Math.min(stand?.gesehen ?? 0, 32767);

  const service = createServiceClient();
  // Kanal der Registrierung mitnehmen, damit das Board Anfragen nach Herkunft zeigt.
  const { data: profil } = await service.from("profiles").select("funnel_herkunft").eq("id", user.id).maybeSingle();
  const kanal = ((profil?.funnel_herkunft as { kanal?: string } | null)?.kanal ?? null) || null;

  const { data: offen } = await service
    .from("training_leads")
    .select("id, token")
    .eq("user_id", user.id)
    .in("status", OFFEN)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const jetzt = new Date().toISOString();
  if (offen) {
    const { error } = await service
      .from("training_leads")
      .update({ name, email, phone, videos_gesehen: videosGesehen, updated_at: jetzt })
      .eq("id", offen.id);
    if (error) return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    return NextResponse.json({ ok: true, token: offen.token });
  }

  const { data: neu, error } = await service
    .from("training_leads")
    .insert({ user_id: user.id, name, email, phone, stelle, kanal, videos_gesehen: videosGesehen })
    .select("token")
    .single();
  if (error || !neu) {
    console.error("[training/gespraech] Lead nicht angelegt:", error?.message);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
  // Nur beim neuen Lead — ein wieder geöffnetes Modal meldet sich nicht doppelt.
  await benachrichtigeTeamTraining("anfrage", { name, email, phone, stelle, kanal, videosGesehen });
  return NextResponse.json({ ok: true, token: neu.token });
}
