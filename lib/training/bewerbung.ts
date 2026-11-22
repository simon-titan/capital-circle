import type { SupabaseClient } from "@supabase/supabase-js";
import { VERLAENGERUNG_TAGE, ZUGANG_TAGE, bewerbung as texte } from "@/config/training";
import { freeMail, type FreeMailId } from "@/lib/email/templates/playbook/free-kurs";
import { benachrichtigeTeamBewerbung } from "@/lib/email/templates/training-team";
import { sendeVorlage } from "@/lib/mailsystem/versand";
import { plusKalendertageBerlin } from "@/lib/mailsystem/zeit";
import { trainingLinks, vornameAus, type BewerbungZeile, type TrainingZugangZeile } from "./zugang";

/**
 * Die Handlungen rund um die Free-Kurs-Bewerbung — jeweils mit genau der Mail,
 * die das Playbook an dieses Ereignis hängt:
 *
 *   Adresse bestätigt        → A01 (einmal), Team-Benachrichtigung
 *   Emre nimmt an            → Zugang 30 Tage, A02
 *   Emre lehnt ab            → A03, endgültig
 *   Team verlängert          → +7 Tage ab jetzt, E03
 *
 * Alles mit Service-Client. Die Mails gehen über `sendeVorlage` (Protokoll +
 * Dedupe): Ein doppelter Klick erzeugt weder eine zweite Mail noch eine neue
 * Laufzeit (Playbook Test 02).
 */

export type BewerbungsAntworten = Record<(typeof texte.fragen)[number]["id"], string>;

export async function bewerbungAnlegen(
  service: SupabaseClient,
  b: {
    userId: string;
    name: string;
    email: string;
    antworten: BewerbungsAntworten;
    kontaktGewuenscht: boolean;
    telefon: string | null;
    kanal: string | null;
  },
): Promise<{ ok: true; id: string } | { ok: false; fehler: "schon_beworben" | "server" | "tabelle_fehlt" }> {
  const { data, error } = await service
    .from("training_bewerbungen")
    .insert({
      user_id: b.userId,
      name: b.name,
      email: b.email.trim().toLowerCase(),
      antworten: b.antworten,
      kontakt_gewuenscht: b.kontaktGewuenscht,
      telefon: b.telefon,
      kanal: b.kanal,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { ok: false, fehler: "schon_beworben" };
    // Migration 110 noch nicht eingespielt: Registrierung nicht kippen (alter Weg).
    if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message)) {
      return { ok: false, fehler: "tabelle_fehlt" };
    }
    console.error("[training/bewerbung] Anlegen fehlgeschlagen:", error.message);
    return { ok: false, fehler: "server" };
  }
  return { ok: true, id: (data as { id: string }).id };
}

async function sende(
  service: SupabaseClient,
  vorlage: FreeMailId,
  bezug: string,
  email: string,
  userId: string,
  vorname: string,
  endeAm: Date | null,
) {
  const mail = freeMail(vorlage, { vorname, endeAm, ...trainingLinks() });
  return sendeVorlage(service, { vorlage, bezug, email, userId, betreff: mail.betreff, jsx: mail.jsx });
}

/**
 * Nach bestätigter Adresse (Link aus der Mail oder schon bestätigtes Konto):
 * Bewerbung „kommt bei Emre an". Idempotent — zweiter Aufruf tut nichts.
 */
export async function nachAdressbestaetigung(service: SupabaseClient, userId: string): Promise<void> {
  const { data } = await service
    .from("training_bewerbungen")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "offen")
    .maybeSingle();
  const bew = data as BewerbungZeile | null;
  if (!bew) return;

  let erstmals = false;
  if (!bew.adresse_bestaetigt_am) {
    const { data: gesetzt } = await service
      .from("training_bewerbungen")
      .update({ adresse_bestaetigt_am: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", bew.id)
      .is("adresse_bestaetigt_am", null)
      .select("id")
      .maybeSingle();
    erstmals = Boolean(gesetzt);
  }

  // A01 auch nachholen, wenn der erste Versand scheiterte — der Dedupe-Schlüssel verhindert eine zweite.
  try {
    await sende(service, "A01", `bewerbung:${bew.id}`, bew.email, userId, vornameAus(bew.name), null);
  } catch (err) {
    console.error("[training/bewerbung] A01 fehlgeschlagen:", err);
  }
  if (!erstmals) return; // Lead und Team-Mail nur beim ersten Mal

  // Kontaktwunsch: Lead fürs Board, damit der Vertrieb anrufen kann. Kein
  // Fragebogen — das ist noch keine Gesprächsanfrage im Sinne des Playbooks.
  if (bew.kontakt_gewuenscht) {
    const { error } = await service.from("training_leads").insert({
      user_id: userId,
      name: bew.name,
      email: bew.email,
      phone: bew.telefon,
      stelle: "bewerbung",
      kanal: bew.kanal,
      videos_gesehen: 0,
    });
    if (error) console.error("[training/bewerbung] Kontakt-Lead nicht angelegt:", error.message);
  }

  await benachrichtigeTeamBewerbung({
    name: bew.name,
    email: bew.email,
    telefon: bew.telefon,
    kontaktGewuenscht: bew.kontakt_gewuenscht,
    antworten: bew.antworten,
  });
}

export async function bewerbungAnnehmen(
  service: SupabaseClient,
  bewerbungId: string,
  adminId: string,
): Promise<{ ok: true; endeAm: string } | { ok: false; fehler: string }> {
  const { data } = await service.from("training_bewerbungen").select("*").eq("id", bewerbungId).maybeSingle();
  const bew = data as BewerbungZeile | null;
  if (!bew) return { ok: false, fehler: "nicht_gefunden" };
  if (bew.status !== "offen") return { ok: false, fehler: "schon_entschieden" };
  // Altbestand mit unbestätigter Adresse: beim Annehmen bestätigen, sonst kann sich das Konto nicht anmelden.
  if (!bew.adresse_bestaetigt_am) {
    const { error } = await service.auth.admin.updateUserById(bew.user_id, { email_confirm: true });
    if (error) {
      console.error("[training/bewerbung] Adresse beim Annehmen nicht bestätigt:", error.message);
      return { ok: false, fehler: "zugang_fehlgeschlagen" };
    }
    await service
      .from("training_bewerbungen")
      .update({ adresse_bestaetigt_am: new Date().toISOString() })
      .eq("id", bew.id)
      .is("adresse_bestaetigt_am", null);
  }

  const jetzt = new Date();
  const { data: gesetzt } = await service
    .from("training_bewerbungen")
    .update({ status: "angenommen", geprueft_von: adminId, geprueft_am: jetzt.toISOString(), updated_at: jetzt.toISOString() })
    .eq("id", bew.id)
    .eq("status", "offen")
    .select("id")
    .maybeSingle();
  if (!gesetzt) return { ok: false, fehler: "schon_entschieden" };

  // Freischaltung — besteht schon ein Zugang (Bestand), bleibt dessen Laufzeit.
  const ende = plusKalendertageBerlin(jetzt, ZUGANG_TAGE);
  const { error: zFehler } = await service.from("training_zugang").upsert(
    {
      user_id: bew.user_id,
      bewerbung_id: bew.id,
      freigeschaltet_am: jetzt.toISOString(),
      original_ende_am: ende.toISOString(),
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  const { data: z } = await service.from("training_zugang").select("*").eq("user_id", bew.user_id).maybeSingle();
  const zugang = z as TrainingZugangZeile | null;
  if (zFehler || !zugang) {
    // Ohne Zugang keine Annahme-Mail: Status zurück, damit Emre es erneut versuchen kann.
    await service.from("training_bewerbungen").update({ status: "offen", geprueft_von: null, geprueft_am: null }).eq("id", bew.id);
    console.error("[training/bewerbung] Zugang nicht angelegt:", zFehler?.message);
    return { ok: false, fehler: "zugang_fehlgeschlagen" };
  }
  const endeAm = new Date(zugang.original_ende_am);

  try {
    await sende(service, "A02", `free:${bew.user_id}`, bew.email, bew.user_id, vornameAus(bew.name), endeAm);
  } catch (err) {
    console.error("[training/bewerbung] A02 fehlgeschlagen:", err);
  }
  return { ok: true, endeAm: endeAm.toISOString() };
}

export async function bewerbungAblehnen(
  service: SupabaseClient,
  bewerbungId: string,
  adminId: string,
  notiz: string | null,
): Promise<{ ok: true } | { ok: false; fehler: string }> {
  const { data } = await service.from("training_bewerbungen").select("*").eq("id", bewerbungId).maybeSingle();
  const bew = data as BewerbungZeile | null;
  if (!bew) return { ok: false, fehler: "nicht_gefunden" };
  if (bew.status !== "offen") return { ok: false, fehler: "schon_entschieden" };

  const jetzt = new Date().toISOString();
  const { data: gesetzt } = await service
    .from("training_bewerbungen")
    .update({ status: "abgelehnt", geprueft_von: adminId, geprueft_am: jetzt, notiz: notiz?.slice(0, 1000) ?? null, updated_at: jetzt })
    .eq("id", bew.id)
    .eq("status", "offen")
    .select("id")
    .maybeSingle();
  if (!gesetzt) return { ok: false, fehler: "schon_entschieden" };

  // Kontaktwunsch-Lead schließen: Nach einer endgültigen Absage ruft der Vertrieb nicht an.
  await service
    .from("training_leads")
    .update({ status: "verloren", notizen: "Free-Bewerbung abgelehnt", updated_at: jetzt })
    .eq("user_id", bew.user_id)
    .eq("stelle", "bewerbung")
    .eq("status", "neu");

  try {
    await sende(service, "A03", `bewerbung:${bew.id}`, bew.email, bew.user_id, vornameAus(bew.name), null);
  } catch (err) {
    console.error("[training/bewerbung] A03 fehlgeschlagen:", err);
  }
  return { ok: true };
}

/** Einmalig +7 Kalendertage ab jetzt (nicht ab dem alten Ende), dann E03. */
export async function zugangVerlaengern(
  service: SupabaseClient,
  userId: string,
  adminId: string,
): Promise<{ ok: true; endeAm: string } | { ok: false; fehler: string }> {
  const { data } = await service.from("training_zugang").select("*").eq("user_id", userId).maybeSingle();
  const z = data as TrainingZugangZeile | null;
  if (!z) return { ok: false, fehler: "kein_zugang" };
  if (z.verlaengerung_status === "aktiv") return { ok: false, fehler: "schon_verlaengert" };
  const jetzt = new Date();
  // Die Woche gibt es nach dem Ablauf (Playbook E02/E03) — vorher würde sie den Zugang verkürzen.
  if (new Date(z.original_ende_am).getTime() > jetzt.getTime()) return { ok: false, fehler: "noch_aktiv" };

  const ende = plusKalendertageBerlin(jetzt, VERLAENGERUNG_TAGE);
  const { data: gesetzt } = await service
    .from("training_zugang")
    .update({
      verlaengerung_status: "aktiv",
      verlaengert_am: jetzt.toISOString(),
      verlaengerung_ende_am: ende.toISOString(),
      verlaengert_von: adminId,
    })
    .eq("user_id", userId)
    .neq("verlaengerung_status", "aktiv")
    .select("user_id")
    .maybeSingle();
  if (!gesetzt) return { ok: false, fehler: "schon_verlaengert" };

  const [{ data: auth }, { data: profil }] = await Promise.all([
    service.auth.admin.getUserById(userId),
    service.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  const email = auth?.user?.email;
  if (email) {
    try {
      await sende(service, "E03", `free:${userId}`, email, userId, vornameAus(profil?.full_name as string | null), ende);
    } catch (err) {
      console.error("[training/bewerbung] E03 fehlgeschlagen:", err);
    }
  }
  return { ok: true, endeAm: ende.toISOString() };
}
