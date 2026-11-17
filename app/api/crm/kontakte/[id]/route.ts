import { NextResponse } from "next/server";
import { PHASE_IDS, VERLUSTGRUENDE, phaseLabel, type Phase } from "@/config/crm";
import { ladeKontaktDetail } from "@/lib/crm/daten";
import { requireCrm } from "@/lib/crm/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/crm/kontakte/[id] — alles zum Kontakt: Antworten, Termine, Mails, Käufe, Zeitstrahl. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { service, error } = await requireCrm();
  if (error) return error;
  const { id } = await params;
  const detail = await ladeKontaktDetail(service, id);
  if (!detail) return NextResponse.json({ ok: false, error: "nicht_gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true, ...detail });
}

/**
 * PATCH /api/crm/kontakte/[id] — Phase, Zuweisung, Wiedervorlage, Verlust,
 * Name/Telefon. Jede Änderung landet im Zeitstrahl. „Verloren" braucht einen
 * Grund, „Später" ein Wiedervorlagedatum. Jeder im Team darf umverteilen.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { nutzer, service, error } = await requireCrm();
  if (error) return error;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const { data: alt } = await service.from("crm_kontakte").select("*").eq("id", id).maybeSingle();
  if (!alt) return NextResponse.json({ ok: false, error: "nicht_gefunden" }, { status: 404 });
  const a = alt as Record<string, unknown>;
  const jetzt = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: jetzt, letzte_aktivitaet_am: jetzt };
  const log: { art: string; text: string; daten?: Record<string, unknown> }[] = [];

  if (body.phase !== undefined) {
    const phase = String(body.phase) as Phase;
    if (!PHASE_IDS.includes(phase)) return NextResponse.json({ ok: false, error: "phase" }, { status: 400 });
    // „Gewonnen" kommt aus dem Kauf (Sync/Webhook) — von Hand nur für Admins (z. B. Überweisung außerhalb von Stripe).
    if (phase === "gewonnen" && phase !== a.phase && !nutzer.istAdmin) {
      return NextResponse.json({ ok: false, error: "gewonnen_nur_kauf" }, { status: 400 });
    }
    if (phase === "verloren") {
      const grund = String(body.verlust_grund ?? "");
      if (!VERLUSTGRUENDE.some((g) => g.id === grund)) return NextResponse.json({ ok: false, error: "verlust_grund" }, { status: 400 });
      update.verlust_grund = grund;
      update.verlust_notiz = typeof body.verlust_notiz === "string" ? body.verlust_notiz.trim().slice(0, 1000) || null : null;
      update.verloren_am = jetzt;
      update.wiedervorlage_am = null;
    }
    if (phase === "spaeter" && typeof body.wiedervorlage_am !== "string") {
      return NextResponse.json({ ok: false, error: "wiedervorlage" }, { status: 400 });
    }
    if (phase !== a.phase) {
      update.phase = phase;
      update.phase_gesetzt_am = jetzt;
      const grund = phase === "verloren" ? ` (${VERLUSTGRUENDE.find((g) => g.id === body.verlust_grund)?.label})` : "";
      log.push({ art: "phase", text: `${phaseLabel[a.phase as Phase] ?? a.phase} → ${phaseLabel[phase]}${grund}` });
    }
  }
  if (body.wiedervorlage_am !== undefined) {
    const w = body.wiedervorlage_am === null || body.wiedervorlage_am === "" ? null : new Date(String(body.wiedervorlage_am));
    if (w && Number.isNaN(w.getTime())) return NextResponse.json({ ok: false, error: "wiedervorlage" }, { status: 400 });
    update.wiedervorlage_am = w?.toISOString() ?? null;
    log.push({ art: "system", text: w ? `Wiedervorlage ${w.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}` : "Wiedervorlage entfernt" });
  }
  if (body.closer_id !== undefined) {
    const neu = body.closer_id === null || body.closer_id === "" ? null : String(body.closer_id);
    const von = (a.closer_id as string | null) ?? null;
    /*
      Closer-Wechsel (Tracking-Playbook 9.4): from/to/Grund/effective_at/Bearbeiter
      im Zeitstrahl. Der Verkaufs-Credit eines schon erfolgten Kaufs bleibt, wo er
      eingefroren wurde (`mentoring_kauf.credit_*`); operativ gilt der neue Closer.
      Ein identischer Wechsel ist ein No-op.
    */
    if (neu !== von) {
      const grund = typeof body.zuweisung_grund === "string" ? body.zuweisung_grund.trim().slice(0, 300) : "";
      if (!grund) return NextResponse.json({ ok: false, error: "zuweisung_grund" }, { status: 400 });
      const { data: namen } = await service.from("crm_team").select("user_id, name").in("user_id", [neu, von].filter(Boolean) as string[]);
      const name = (uid: string | null) => (uid ? ((namen ?? []) as { user_id: string; name: string }[]).find((t) => t.user_id === uid)?.name : null);
      if (neu && !name(neu)) return NextResponse.json({ ok: false, error: "closer" }, { status: 400 });
      log.push({
        art: "zuweisung",
        text: `${name(von) ?? "Pool"} → ${name(neu) ?? "Pool"} (${grund})`,
        daten: { from_closer_id: von, to_closer_id: neu, grund, effective_at: jetzt, bearbeiter: nutzer.user.id },
      });
      update.closer_id = neu;
    }
  }
  for (const f of ["name", "telefon"] as const) {
    if (body[f] !== undefined) update[f] = typeof body[f] === "string" ? (body[f] as string).trim().slice(0, 120) || null : null;
  }

  const { data, error: dbErr } = await service.from("crm_kontakte").update(update).eq("id", id).select("*").maybeSingle();
  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  // `daten` immer mitschicken: Bei gemischten Zeilen setzt supabase-js fehlende Spalten auf NULL (Spalte ist NOT NULL).
  if (log.length) await service.from("crm_aktivitaeten").insert(log.map((l) => ({ ...l, daten: l.daten ?? {}, kontakt_id: id, von: nutzer.user.id })));

  // Abschluss stoppt die Verkaufsmails: Verloren/Später schließen den Lead im Training-Board mit.
  if (update.phase === "verloren" || update.phase === "spaeter") {
    await service
      .from("training_leads")
      .update({ status: update.phase === "verloren" ? "verloren" : "nachfassen", updated_at: jetzt })
      .ilike("email", String(a.email).replace(/[\\%_]/g, (c) => `\\${c}`))
      .not("status", "in", "(gewonnen,verloren)");
  }
  return NextResponse.json({ ok: true, kontakt: data });
}
