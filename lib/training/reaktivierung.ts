import type { SupabaseClient } from "@supabase/supabase-js";
import { FUNNEL_QUELLE_TRAINING, ZUGANG_TAGE } from "@/config/training";
import { plusKalendertageBerlin } from "@/lib/mailsystem/zeit";
import { aktuellesEnde, type BewerbungZeile, type TrainingZugangZeile } from "./zugang";

/**
 * Reaktivierung der ehemaligen Free-Kurs-Mitglieder (Retargeting-Mail RT01,
 * 15.11.2026). Entscheidung Simon: **ohne Bewerbung** — der persönliche Link aus
 * der Mail schaltet den Zugang direkt für 30 Kalendertage frei.
 *
 * Damit die Freischaltung überall gleich aussieht wie eine angenommene
 * Bewerbung (Proxy, ICP-Fragen 1–7, Board, Free-Mails S/L/I/E), legt sie eine
 * Bewerbungszeile mit Status `angenommen`, leeren Antworten und `kanal =
 * retargeting` an. A01/A02 gehen dabei nicht raus — die Mail war die Einladung.
 *
 * Regeln:
 *   - Zahlende und Admins brauchen nichts, sie sehen das Training ohnehin.
 *   - Eine Ablehnung bleibt endgültig (A03), auch gegen den Link.
 *   - Eine offene Bewerbung wird angenommen.
 *   - Ein laufender Zugang bleibt, wie er ist.
 *   - Ein Zugang, der **vor** der Kampagne lief und abgelaufen ist (Bestand aus
 *     Migration 110), startet einmal neu. Einer, der nach Kampagnenstart begann
 *     und abgelaufen ist, nicht — sonst ließe sich der Link endlos wiederholen.
 */

export const RETARGETING_KANAL = "retargeting";
/** Zugänge vor diesem Zeitpunkt zählen als „alt" und dürfen einmal neu starten. */
export const REAKTIVIERUNG_KAMPAGNE_AB = new Date("2026-11-15T00:00:00+01:00");
/** So lange meldet der Link ohne Passwort an (Magic Link). Danach nur noch über den Login. */
export const REAKTIVIERUNG_LOGIN_TAGE = 45;

export type ReaktivierungStand =
  | { art: "bezahlt" }
  | { art: "abgelehnt" }
  | { art: "aktiv"; endeAm: Date }
  | { art: "abgelaufen" }
  | { art: "bereit" };

type Profil = { full_name: string | null; is_paid: boolean | null; is_admin: boolean | null };

async function lade(service: SupabaseClient, userId: string) {
  const [{ data: p }, { data: b }, { data: z }] = await Promise.all([
    service.from("profiles").select("full_name,is_paid,is_admin").eq("id", userId).maybeSingle(),
    service.from("training_bewerbungen").select("*").eq("user_id", userId).maybeSingle(),
    service.from("training_zugang").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    profil: p as Profil | null,
    bewerbung: b as BewerbungZeile | null,
    zugang: z as TrainingZugangZeile | null,
  };
}

function standAus(
  profil: Profil | null,
  bewerbung: BewerbungZeile | null,
  zugang: TrainingZugangZeile | null,
  jetzt: Date,
): ReaktivierungStand {
  if (profil?.is_paid || profil?.is_admin) return { art: "bezahlt" };
  if (bewerbung?.status === "abgelehnt") return { art: "abgelehnt" };
  if (zugang) {
    const ende = aktuellesEnde(zugang);
    if (ende > jetzt) return { art: "aktiv", endeAm: ende };
    if (new Date(zugang.freigeschaltet_am) >= REAKTIVIERUNG_KAMPAGNE_AB) return { art: "abgelaufen" };
  }
  return { art: "bereit" };
}

export async function pruefeReaktivierung(service: SupabaseClient, userId: string): Promise<ReaktivierungStand> {
  const { profil, bewerbung, zugang } = await lade(service, userId);
  return standAus(profil, bewerbung, zugang, new Date());
}

/**
 * `quelle` legt fest, woher die Freischaltung kommt (Spalte `kanal` und Notiz der
 * Bewerbungszeile). Ohne Angabe: Retargeting-Mail. Seit 17.11.2026 nutzt auch
 * die Buchung eines Analysegesprächs diesen Weg (`lib/training/nach-buchung.ts`).
 */
export async function reaktiviere(
  service: SupabaseClient,
  userId: string,
  email: string,
  quelle?: { kanal: string; notiz: string },
): Promise<{ ok: true; stand: ReaktivierungStand } | { ok: false; fehler: "abgelehnt" | "abgelaufen" | "server" }> {
  const jetzt = new Date();
  const { profil, bewerbung, zugang } = await lade(service, userId);
  const stand = standAus(profil, bewerbung, zugang, jetzt);
  if (stand.art === "bezahlt" || stand.art === "aktiv") return { ok: true, stand };
  if (stand.art === "abgelehnt" || stand.art === "abgelaufen") return { ok: false, fehler: stand.art };

  const notiz = quelle?.notiz ?? `Über die Retargeting-Mail freigeschaltet (${jetzt.toISOString().slice(0, 10)}), ohne Bewerbung.`;
  let bewerbungId = bewerbung?.id ?? null;
  if (!bewerbung) {
    const { data, error } = await service
      .from("training_bewerbungen")
      .insert({
        user_id: userId,
        name: profil?.full_name?.trim() || email.split("@")[0],
        email,
        antworten: {},
        kontakt_gewuenscht: false,
        status: "angenommen",
        eingereicht_am: jetzt.toISOString(),
        adresse_bestaetigt_am: jetzt.toISOString(),
        geprueft_am: jetzt.toISOString(),
        notiz,
        kanal: quelle?.kanal ?? RETARGETING_KANAL,
      })
      .select("id")
      .maybeSingle();
    // 23505: parallel schon angelegt (Doppelklick) — dann die vorhandene nehmen.
    if (error && error.code !== "23505") {
      console.error("[training/reaktivierung] Bewerbung:", error.message);
      return { ok: false, fehler: "server" };
    }
    bewerbungId = (data as { id: string } | null)?.id ?? null;
  } else if (bewerbung.status === "offen") {
    await service
      .from("training_bewerbungen")
      .update({ status: "angenommen", geprueft_am: jetzt.toISOString(), updated_at: jetzt.toISOString(), notiz })
      .eq("id", bewerbung.id)
      .eq("status", "offen");
  }

  const ende = plusKalendertageBerlin(jetzt, ZUGANG_TAGE);
  const zeile = {
    user_id: userId,
    bewerbung_id: bewerbungId,
    freigeschaltet_am: jetzt.toISOString(),
    original_ende_am: ende.toISOString(),
    verlaengerung_status: "keine",
    verlaengert_am: null,
    verlaengerung_ende_am: null,
    aus_bestand: false,
  };
  const { error: zFehler } = zugang
    ? await service.from("training_zugang").update(zeile).eq("user_id", userId)
    : await service.from("training_zugang").upsert(zeile, { onConflict: "user_id", ignoreDuplicates: true });
  if (zFehler) {
    console.error("[training/reaktivierung] Zugang:", zFehler.message);
    return { ok: false, fehler: "server" };
  }

  // Im Board unter „Registrierungen" sichtbar machen; vorhandene Werte bleiben.
  await service.from("profiles").update({ training_registriert_am: jetzt.toISOString() }).eq("id", userId).is("training_registriert_am", null);
  await service.from("profiles").update({ funnel_quelle: FUNNEL_QUELLE_TRAINING }).eq("id", userId).is("funnel_quelle", null);

  return { ok: true, stand: { art: "aktiv", endeAm: ende } };
}
