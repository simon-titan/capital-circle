import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { bewerbungAnlegen, bewerbungEingegangen } from "@/lib/training/bewerbung";
import { pruefeBewerbung } from "@/lib/training/bewerbung-pruefen";
import { ladeTrainingFreigabe } from "@/lib/training/zugang";

export const runtime = "nodejs";

/**
 * POST /api/training/bewerbung — Bewerbung aus einem **bestehenden** Konto
 * (z. B. ein Free-Konto von früher ohne Trainingszugang), Body
 * `{ antworten, kontaktGewuenscht, telefon? }`. Die Adresse ist bestätigt, also
 * kommt die Bewerbung sofort bei Emre an (A01).
 *
 * Neue Besucher bewerben sich über `/api/training/registrieren`.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.email) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const pruefung = pruefeBewerbung(body);
  if (!pruefung.ok) return NextResponse.json({ ok: false, error: "felder", felder: pruefung.felder }, { status: 400 });

  const service = createServiceClient();
  const freigabe = await ladeTrainingFreigabe(service, user.id);
  if (freigabe.art !== "keine") return NextResponse.json({ ok: false, error: "schon_beworben" }, { status: 409 });

  const { data: profil } = await service.from("profiles").select("full_name, funnel_herkunft").eq("id", user.id).maybeSingle();
  const name = ((profil?.full_name as string | null) ?? "").trim() || user.email;
  const kanal = ((profil?.funnel_herkunft as { kanal?: string } | null)?.kanal ?? null) || null;

  const r = await bewerbungAnlegen(service, {
    userId: user.id,
    name,
    email: user.email,
    antworten: pruefung.antworten,
    kontaktGewuenscht: pruefung.kontaktGewuenscht,
    telefon: pruefung.telefon,
    kanal,
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.fehler === "tabelle_fehlt" ? "server" : r.fehler }, { status: r.fehler === "schon_beworben" ? 409 : 500 });

  await bewerbungEingegangen(service, user.id);
  return NextResponse.json({ ok: true });
}
