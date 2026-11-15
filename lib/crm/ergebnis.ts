import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CALL_GRUENDE,
  CALL_OUTCOMES,
  CALL_PRODUKTE,
  OUTCOME_ZU_PHASE,
  followUpPflicht,
  grundPflicht,
  verlustgrundAus,
  type CallGrund,
  type CallOutcome,
  type CallProdukt,
} from "@/config/crm";

/**
 * Ergebnis-Maske nach dem Gespräch (Tracking-Playbook 9.2, Migration 114).
 *
 * Pflicht: outcome, product, reason (bei lost/unqualified/open_decision),
 * next_follow_up_at (bei open_decision und won_payment_pending). Gespeichert
 * versioniert in `crm_call_ergebnis` — erneutes Speichern ohne Änderung legt
 * keine neue Version an (QA-Karte 10), jede Änderung eine. Die CRM-Phase zieht
 * nach (`OUTCOME_ZU_PHASE`), Wiedervorlage = Follow-up.
 *
 * Nach einem geführten Call gehen **keine** automatischen Verkaufsmails raus
 * (Playbook 4.3): B-Mails stoppen bei jedem Termin im Vorgang, T02–T04 nur für
 * gebuchte, N01/N02 nur für No-Show-Termine (`lib/mailsystem/termin-entscheidung.ts`),
 * und S/L/I der Free-Strecke stoppen bei einem Termin (`free-entscheidung.ts`).
 */

export type ErgebnisEingabe = {
  outcome: CallOutcome;
  produkt: CallProdukt;
  grund: CallGrund | null;
  notiz: string | null;
  followUpAm: string | null;
};

export function pruefeErgebnis(roh: unknown, jetzt = new Date()): { ok: true; wert: ErgebnisEingabe } | { ok: false; fehler: string } {
  const r = (roh ?? {}) as Record<string, unknown>;
  const outcome = String(r.outcome ?? "") as CallOutcome;
  if (!CALL_OUTCOMES.some((o) => o.id === outcome)) return { ok: false, fehler: "outcome" };
  const produkt = String(r.produkt ?? (outcome === "no_show" ? "none" : "")) as CallProdukt;
  if (!CALL_PRODUKTE.some((p) => p.id === produkt)) return { ok: false, fehler: "produkt" };
  const grundRoh = r.grund == null || r.grund === "" ? null : String(r.grund);
  if (grundRoh && !CALL_GRUENDE.some((g) => g.id === grundRoh)) return { ok: false, fehler: "grund" };
  const grund = grundRoh as CallGrund | null;
  if (grundPflicht(outcome) && !grund) return { ok: false, fehler: "grund" };
  let followUpAm: string | null = null;
  if (r.followUpAm) {
    const d = new Date(String(r.followUpAm));
    if (Number.isNaN(d.getTime())) return { ok: false, fehler: "follow_up" };
    followUpAm = d.toISOString();
  }
  if (followUpPflicht(outcome) && !followUpAm) return { ok: false, fehler: "follow_up" };
  if (followUpAm && new Date(followUpAm).getTime() < jetzt.getTime() - 60_000 && followUpPflicht(outcome)) return { ok: false, fehler: "follow_up_vergangen" };
  if ((outcome === "won_payment_pending" || outcome === "open_decision") && produkt === "none") return { ok: false, fehler: "produkt" };
  const notiz = typeof r.notiz === "string" && r.notiz.trim() ? r.notiz.trim().slice(0, 2000) : null;
  return { ok: true, wert: { outcome, produkt, grund, notiz, followUpAm } };
}

export type ErgebnisZeile = {
  id: string;
  termin_id: string;
  version: number;
  outcome: CallOutcome;
  produkt: CallProdukt;
  grund: CallGrund | null;
  notiz: string | null;
  follow_up_am: string | null;
  von: string | null;
  am: string;
};

/** Letzte Version je Termin. */
export async function ladeErgebnisse(service: SupabaseClient, terminIds: string[]): Promise<Map<string, ErgebnisZeile>> {
  const m = new Map<string, ErgebnisZeile>();
  if (!terminIds.length) return m;
  const { data, error } = await service.from("crm_call_ergebnis").select("*").in("termin_id", terminIds).order("version", { ascending: true });
  if (error) {
    if (!/does not exist|schema cache/i.test(error.message)) console.error("[crm] Ergebnisse nicht lesbar:", error.message);
    return m;
  }
  for (const z of (data ?? []) as ErgebnisZeile[]) m.set(z.termin_id, z);
  return m;
}

/**
 * Speichert eine neue Version (falls geändert), zieht Phase, Wiedervorlage und
 * Verlustgrund im CRM nach und schreibt den Zeitstrahl. `gewonnen` bleibt
 * unangetastet — ein Kauf schlägt jede Einschätzung.
 */
export async function speichereErgebnis(
  service: SupabaseClient,
  p: { terminId: string; kontaktId: string; phaseVorher: string; eingabe: ErgebnisEingabe; von: string },
): Promise<{ ok: true; neu: boolean } | { ok: false; fehler: string }> {
  const alt = (await ladeErgebnisse(service, [p.terminId])).get(p.terminId) ?? null;
  const e = p.eingabe;
  const gleich =
    alt &&
    alt.outcome === e.outcome &&
    alt.produkt === e.produkt &&
    (alt.grund ?? null) === e.grund &&
    (alt.notiz ?? null) === e.notiz &&
    (alt.follow_up_am ? new Date(alt.follow_up_am).toISOString() : null) === e.followUpAm;
  if (gleich) return { ok: true, neu: false };

  const { error } = await service.from("crm_call_ergebnis").insert({
    termin_id: p.terminId,
    kontakt_id: p.kontaktId,
    version: (alt?.version ?? 0) + 1,
    outcome: e.outcome,
    produkt: e.produkt,
    grund: e.grund,
    notiz: e.notiz,
    follow_up_am: e.followUpAm,
    von: p.von,
  });
  if (error) return { ok: false, fehler: error.code === "23505" ? "parallel_gespeichert" : error.message };

  const jetzt = new Date().toISOString();
  const phase = OUTCOME_ZU_PHASE[e.outcome];
  const update: Record<string, unknown> = { updated_at: jetzt, letzte_aktivitaet_am: jetzt, phase, phase_gesetzt_am: jetzt };
  if (phase === "verloren") {
    update.verlust_grund = verlustgrundAus(e.outcome, e.grund);
    update.verloren_am = jetzt;
    update.wiedervorlage_am = null;
  } else {
    update.wiedervorlage_am = e.followUpAm;
  }
  await service.from("crm_kontakte").update(update).eq("id", p.kontaktId).not("phase", "eq", "gewonnen");

  const label = CALL_OUTCOMES.find((o) => o.id === e.outcome)?.label ?? e.outcome;
  const grundLabel = e.grund ? ` · ${CALL_GRUENDE.find((g) => g.id === e.grund)?.label}` : "";
  const produktLabel = e.produkt !== "none" ? ` · ${CALL_PRODUKTE.find((x) => x.id === e.produkt)?.label}` : "";
  await service.from("crm_aktivitaeten").insert({
    kontakt_id: p.kontaktId,
    art: "ergebnis",
    text: `${alt ? "Ergebnis geändert" : "Ergebnis"}: ${label}${produktLabel}${grundLabel}`,
    von: p.von,
    daten: { termin_id: p.terminId, version: (alt?.version ?? 0) + 1, outcome: e.outcome, produkt: e.produkt, grund: e.grund, follow_up_am: e.followUpAm, phase_vorher: p.phaseVorher },
  });
  // „Verloren" schließt den Lead im Training-Board mit (wie der Phasenwechsel im CRM).
  if (phase === "verloren") {
    const { data: k } = await service.from("crm_kontakte").select("email").eq("id", p.kontaktId).maybeSingle();
    const email = (k as { email: string } | null)?.email;
    if (email) {
      await service
        .from("training_leads")
        .update({ status: "verloren", updated_at: jetzt })
        .ilike("email", email.replace(/[\\%_]/g, (c) => `\\${c}`))
        .not("status", "in", "(gewonnen,verloren)");
    }
  }
  return { ok: true, neu: true };
}
