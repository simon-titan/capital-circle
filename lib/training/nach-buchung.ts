import type { SupabaseClient } from "@supabase/supabase-js";
import { leadSchluessel, terminLinks, type LeadArt } from "@/lib/mailsystem/termine";
import { normEmail } from "@/lib/mailsystem/versand";
import { terminZeit } from "@/lib/mailsystem/zeit";
import { reaktiviere } from "./reaktivierung";

/**
 * Nach der Buchung eines Analysegesprächs (Feedback 17.11.2026): Wer **angemeldet**
 * bucht — über `/call` oder das Analysegespräch im Mitgliederbereich —, landet im
 * Free-Dashboard, und dort steht eine Karte mit seinem Termin.
 *
 * Entscheidung Simon: nur Angemeldete (Besucher ohne Konto bleiben bei der
 * Bestätigung im Modal), und Free-Konten ohne laufenden Trainingszugang bekommen
 * mit der Buchung **30 Tage** frei — derselbe Weg wie die Retargeting-Freischaltung
 * (`reaktiviere`), mit `kanal = analysegespraech`. Eine Ablehnung bleibt endgültig;
 * ein nach dem 15.11. abgelaufener Zugang startet nicht neu.
 */
export const NACH_BUCHUNG_KANAL = "analysegespraech";
/** Ziel nach der Buchung. `termin=neu` lässt die Karte warten, bis der Calendly-Webhook den Termin angelegt hat. */
export const NACH_BUCHUNG_ZIEL = "/dashboard?termin=neu";

export async function freischaltenNachBuchung(
  service: SupabaseClient,
  userId: string,
  email: string,
): Promise<{ ziel: string | null }> {
  const { data: profil } = await service.from("profiles").select("is_paid, is_admin").eq("id", userId).maybeSingle();
  const p = profil as { is_paid: boolean | null; is_admin: boolean | null } | null;
  // Zahlende und Admins haben ihr eigenes Dashboard — dort bleibt die Bestätigung im Modal.
  if (p?.is_paid || p?.is_admin) return { ziel: null };

  const r = await reaktiviere(service, userId, email, {
    kanal: NACH_BUCHUNG_KANAL,
    notiz: `Mit der Buchung eines Analysegesprächs freigeschaltet (${new Date().toISOString().slice(0, 10)}), ohne Bewerbung.`,
  });
  if (!r.ok) return { ziel: null };
  return { ziel: r.stand.art === "aktiv" ? NACH_BUCHUNG_ZIEL : null };
}

/* ─── Termin-Karte im Free-Dashboard ────────────────────────────────────── */

export type TerminKarteDaten = {
  id: string;
  /** „Freitag, 20. November 2026" */
  tag: string;
  /** „16:00–16:45 Uhr (deutsche Zeit)" */
  spanne: string;
  startAm: string;
  berater: string | null;
  joinUrl: string | null;
  umbuchenUrl: string | null;
  absageUrl: string | null;
  kalenderUrl: string | null;
  vorbereitungUrl: string | null;
};

/**
 * Nächster gebuchter Termin des Kontos (über `user_id` oder die Adresse — Termine
 * aus `/call` hängen an einem Discord-Lead ohne Konto). Bis eine Stunde nach
 * Beginn sichtbar, damit der Einwahlknopf während des Gesprächs da ist. Fehlt
 * Migration 111, gibt es keine Karte.
 */
export async function ladeNaechstenTermin(service: SupabaseClient, userId: string, email: string | null): Promise<TerminKarteDaten | null> {
  const ab = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const adresse = email ? normEmail(email) : null;
  const filter = adresse ? `user_id.eq.${userId},email.eq."${adresse.replace(/"/g, "")}"` : `user_id.eq.${userId}`;
  const { data, error } = await service
    .from("termine")
    .select("id, lead_art, lead_token, start_am, ende_am, zeitzone, berater_name, join_url, absage_url, umbuchen_url")
    .eq("status", "gebucht")
    .gte("start_am", ab)
    .or(filter)
    .order("start_am", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const t = data as {
    id: string;
    lead_art: LeadArt;
    lead_token: string | null;
    start_am: string;
    ende_am: string | null;
    zeitzone: string | null;
    berater_name: string | null;
    join_url: string | null;
    absage_url: string | null;
    umbuchen_url: string | null;
  };
  const zeit = terminZeit(new Date(t.start_am), t.ende_am ? new Date(t.ende_am) : null, t.zeitzone);
  const links = terminLinks(t.lead_art, t.lead_token, t.id);
  return {
    id: t.id,
    tag: zeit.tag,
    spanne: zeit.spanne,
    startAm: t.start_am,
    berater: t.berater_name?.trim() || null,
    joinUrl: t.join_url,
    umbuchenUrl: t.umbuchen_url,
    absageUrl: t.absage_url,
    kalenderUrl: links.kalenderEintragUrl,
    vorbereitungUrl: t.lead_token ? `/termin/vorbereitung/${leadSchluessel(t.lead_art, t.lead_token)}` : null,
  };
}
