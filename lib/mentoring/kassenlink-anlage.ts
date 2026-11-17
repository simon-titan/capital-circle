import type { SupabaseClient } from "@supabase/supabase-js";
import { CLOSER_AUSWAHL, KASSENLINK_GUELTIG_TAGE, PRODUKTE, UPGRADE_ANRECHNUNG_CENTS, erlaubteRaten, istKassenProdukt } from "@/config/mentoring";
import { kassenlinkZeile, tabelleFehlt, type KassenlinkZeile } from "./admin";
import { KASSENLINK_SPALTEN, erzeugeKassenToken, ladeKunde, type Kassenlink } from "./kasse";

/**
 * Einen Kassenlink anlegen — gemeinsam für das Admin (`/api/admin/kassenlinks`)
 * und das CRM (`/api/crm/kontakte/[id]/kassenlink`). Der Preis kommt fest aus
 * `config/mentoring.ts`; es gibt absichtlich kein Betragsfeld.
 */

const EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_MUSTER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_GUELTIG_TAGE = 60;

export type KassenlinkAnlage = {
  produkt: unknown;
  raten?: unknown;
  email: unknown;
  name?: unknown;
  closer?: unknown;
  lead_id?: unknown;
  gueltig_tage?: unknown;
  notiz?: unknown;
  /** `false` schaltet die automatische Upgrade-Anrechnung ab (Sonderfall, Closer entscheidet). */
  anrechnung?: unknown;
};

/**
 * Upgrade Ausbildung → Main/Premium (Tracking-Playbook 2.3): Hat die Adresse
 * eine bezahlte Ausbildung, die noch nicht angerechnet wurde, gilt der Preis
 * minus 499 €. Nur die Zusatzsumme ist neuer Umsatz (2.501 € bzw. 4.501 €).
 */
export async function findeAnrechenbareAusbildung(service: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await service
    .from("mentoring_kauf")
    .select("id")
    .ilike("email", email.replace(/[\\%_]/g, (c) => `\\${c}`))
    .eq("produkt", "ausbildung")
    .in("status", ["aktiv", "vollstaendig"])
    .order("gekauft_am", { ascending: true });
  if (error || !data?.length) return null;
  const ids = (data as { id: string }[]).map((k) => k.id);
  const { data: genutzt } = await service.from("mentoring_kauf").select("upgrade_von_kauf_id").in("upgrade_von_kauf_id", ids);
  const vergeben = new Set(((genutzt ?? []) as { upgrade_von_kauf_id: string }[]).map((g) => g.upgrade_von_kauf_id));
  return ids.find((id) => !vergeben.has(id)) ?? null;
}

function text(wert: unknown, max: number): string | null {
  if (typeof wert !== "string") return null;
  const t = wert.trim();
  return t ? t.slice(0, max) : null;
}

export async function legeKassenlinkAn(
  service: SupabaseClient,
  body: KassenlinkAnlage,
  erstelltVon: string | null,
  appUrl: string,
): Promise<{ ok: true; item: KassenlinkZeile } | { ok: false; fehler: string; status: number }> {
  if (!istKassenProdukt(body.produkt)) return { ok: false, fehler: "produkt_ungueltig", status: 400 };
  const produkt = body.produkt;
  const raten = produkt === "live" ? 1 : Number(body.raten ?? 1);
  if (!Number.isInteger(raten) || !erlaubteRaten(produkt).includes(raten)) return { ok: false, fehler: "raten_ungueltig", status: 400 };

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_MUSTER.test(email)) return { ok: false, fehler: "email_ungueltig", status: 400 };

  const closer = text(body.closer, 40);
  if (closer && !CLOSER_AUSWAHL.some((c) => c.id === closer)) return { ok: false, fehler: "closer_ungueltig", status: 400 };
  const leadId = text(body.lead_id, 64);
  if (leadId && !UUID_MUSTER.test(leadId)) return { ok: false, fehler: "lead_ungueltig", status: 400 };
  const tage = body.gueltig_tage == null || body.gueltig_tage === "" ? KASSENLINK_GUELTIG_TAGE : Number(body.gueltig_tage);
  if (!Number.isInteger(tage) || tage < 1 || tage > MAX_GUELTIG_TAGE) return { ok: false, fehler: "gueltigkeit_ungueltig", status: 400 };

  if (produkt === "live") {
    const kunde = await ladeKunde(service, email);
    if (kunde.tier !== "mentoring") return { ok: false, fehler: "kein_mentoring_konto", status: 400 };
  }

  let anrechnungCents = 0;
  let upgradeVonKaufId: string | null = null;
  if ((produkt === "main" || produkt === "premium") && body.anrechnung !== false) {
    upgradeVonKaufId = await findeAnrechenbareAusbildung(service, email);
    if (upgradeVonKaufId) anrechnungCents = UPGRADE_ANRECHNUNG_CENTS;
  }

  const gueltigBis = new Date(Date.now() + tage * 24 * 60 * 60 * 1000).toISOString();
  for (let versuch = 0; versuch < 2; versuch++) {
    const { data, error } = await service
      .from("kassenlink")
      .insert({
        token: erzeugeKassenToken(),
        produkt,
        raten,
        betrag_cents: PRODUKTE[produkt].preisCents - anrechnungCents,
        anrechnung_cents: anrechnungCents,
        upgrade_von_kauf_id: upgradeVonKaufId,
        email,
        name: text(body.name, 120),
        closer,
        lead_id: leadId,
        notiz: text(body.notiz, 1000),
        erstellt_von: erstelltVon,
        gueltig_bis: gueltigBis,
      })
      .select(KASSENLINK_SPALTEN)
      .single();
    if (!error && data) return { ok: true, item: kassenlinkZeile(data as unknown as Kassenlink, appUrl) };
    if (error?.code === "23505" && versuch === 0) continue;
    if (tabelleFehlt(error)) return { ok: false, fehler: "migration_fehlt", status: 500 };
    if (error?.code === "23503") return { ok: false, fehler: "lead_unbekannt", status: 400 };
    if (error?.code === "23514") return { ok: false, fehler: "raten_migration_111", status: 500 };
    console.error(`[kassenlink] Anlage fehlgeschlagen: ${error?.code ?? ""} ${error?.message ?? "ohne Zeile"}`);
    return { ok: false, fehler: error?.message ?? "anlage_fehlgeschlagen", status: 500 };
  }
  return { ok: false, fehler: "anlage_fehlgeschlagen", status: 500 };
}
