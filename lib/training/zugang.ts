import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TRAINING_MODUL_ID,
  TRAINING_VIDEOS_PFAD,
  WHATSAPP_VERLAENGERUNG_TEXT,
} from "@/config/training";
import { getAppUrl } from "@/lib/site-url";

/**
 * Zugang zum kostenlosen Training (Migration 110, `training_zugang`):
 * 30 Kalendertage ab Freischaltung, einmalig +7 Tage durch das Team.
 * Gesperrt wird nur der Trainingsbereich — das Konto bleibt bestehen.
 *
 * Wer zahlt oder Admin ist, sieht das Training immer (Playbook Regel 15:
 * „Keine Sperre gekaufter Rechte durch einen Free-Timer").
 */

export type TrainingZugangZeile = {
  user_id: string;
  bewerbung_id: string | null;
  freigeschaltet_am: string;
  original_ende_am: string;
  verlaengerung_status: "keine" | "angefragt" | "aktiv";
  verlaengert_am: string | null;
  verlaengerung_ende_am: string | null;
  gestartet_am: string | null;
  aus_bestand: boolean;
};

export type BewerbungZeile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  antworten: Record<string, string>;
  kontakt_gewuenscht: boolean;
  telefon: string | null;
  status: "offen" | "angenommen" | "abgelehnt";
  eingereicht_am: string;
  adresse_bestaetigt_am: string | null;
  geprueft_von: string | null;
  geprueft_am: string | null;
  notiz: string | null;
  kanal: string | null;
};

/** Aktuelles Ende: Verlängerung, sonst das ursprüngliche. */
export function aktuellesEnde(z: Pick<TrainingZugangZeile, "original_ende_am" | "verlaengerung_ende_am" | "verlaengerung_status">): Date {
  if (z.verlaengerung_status === "aktiv" && z.verlaengerung_ende_am) return new Date(z.verlaengerung_ende_am);
  return new Date(z.original_ende_am);
}

export type TrainingFreigabe =
  | { art: "bezahlt" }
  | { art: "aktiv"; zugang: TrainingZugangZeile; endeAm: Date; restTage: number }
  | { art: "beendet"; zugang: TrainingZugangZeile; endeAm: Date; verlaengerbar: boolean }
  | { art: "bewerbung"; bewerbung: BewerbungZeile }
  | { art: "keine" };

/** Fehlt Migration 110, gilt das Training wie bisher als offen (niemand wird ausgesperrt). */
function tabelleFehlt(err: { message?: string } | null | undefined): boolean {
  return Boolean(err && /does not exist|schema cache/i.test(err.message ?? ""));
}

/**
 * Darf dieses Konto das Training sehen — und wenn nicht, warum nicht?
 * Mit Service-Client oder dem Client des Kontos aufrufen (eigene Zeilen sind lesbar).
 */
export async function ladeTrainingFreigabe(
  db: SupabaseClient,
  userId: string,
  profil?: { is_paid?: boolean | null; is_admin?: boolean | null } | null,
): Promise<TrainingFreigabe> {
  let p = profil;
  if (p === undefined) {
    const { data } = await db.from("profiles").select("is_paid,is_admin").eq("id", userId).maybeSingle();
    p = data as { is_paid?: boolean | null; is_admin?: boolean | null } | null;
  }
  if (p?.is_paid || p?.is_admin) return { art: "bezahlt" };

  const [{ data: zugang, error: zFehler }, { data: bew, error: bFehler }] = await Promise.all([
    db.from("training_zugang").select("*").eq("user_id", userId).maybeSingle(),
    db.from("training_bewerbungen").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (tabelleFehlt(zFehler) || tabelleFehlt(bFehler)) return { art: "bezahlt" };

  // Offen oder abgelehnt sperrt, auch wenn (fälschlich) eine Zugangszeile existiert.
  const b = bew as BewerbungZeile | null;
  if (b && b.status !== "angenommen") return { art: "bewerbung", bewerbung: b };

  if (zugang) {
    const z = zugang as TrainingZugangZeile;
    const endeAm = aktuellesEnde(z);
    const rest = endeAm.getTime() - Date.now();
    if (rest > 0) return { art: "aktiv", zugang: z, endeAm, restTage: Math.max(1, Math.ceil(rest / 86_400_000)) };
    return { art: "beendet", zugang: z, endeAm, verlaengerbar: z.verlaengerung_status !== "aktiv" };
  }
  if (bew) return { art: "bewerbung", bewerbung: bew as BewerbungZeile };
  return { art: "keine" };
}

export function trainingOffen(f: TrainingFreigabe): boolean {
  return f.art === "bezahlt" || f.art === "aktiv";
}

/** Gehört das Video zum kostenlosen Training? (für die Abspiel-Routen) */
export function istTrainingModul(moduleId: string | null | undefined): boolean {
  return moduleId === TRAINING_MODUL_ID;
}

/**
 * Wie `istTrainingModul`, löst aber auch die Subkategorie auf — ein Video kann
 * über den allgemeinen Admin in einer Subkategorie des Trainingsmoduls hängen.
 */
export async function istTrainingVideo(
  db: SupabaseClient,
  video: { module_id?: string | null; subcategory_id?: string | null },
): Promise<boolean> {
  if (istTrainingModul(video.module_id)) return true;
  if (video.module_id || !video.subcategory_id) return false;
  const { data } = await db.from("subcategories").select("module_id").eq("id", video.subcategory_id).maybeSingle();
  return istTrainingModul((data as { module_id?: string | null } | null)?.module_id);
}

/* ─── Adressen in den Mails (Playbook Kapitel 10) ───────────────────────── */

export function trainingLinks() {
  const app = getAppUrl();
  return {
    /** free_lesson_n_url — die Seite springt in Lektion n, sofern sie offen ist. */
    lektionUrl: (n: number) => `${app}${TRAINING_VIDEOS_PFAD}?video=${n}`,
    /** resume_free_course_url */
    weiterUrl: `${app}${TRAINING_VIDEOS_PFAD}`,
    /** Vitrine mit Nachweisen und Discord-Beiträgen (L03). */
    vitrineUrl: `${app}/ergebnisse`,
    /** analysis_application_url — öffnet das Analysegespräch direkt. */
    gespraechUrl: `${app}${TRAINING_VIDEOS_PFAD}?gespraech=1`,
    /** whatsapp_extension_url — ohne `TRAINING_WHATSAPP_NUMMER` kein E02-Versand. */
    whatsappUrl: whatsappVerlaengerungUrl(),
  };
}

export function whatsappVerlaengerungUrl(): string | null {
  const nummer = (process.env.TRAINING_WHATSAPP_NUMMER ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  if (nummer.length < 8) return null;
  return `https://wa.me/${nummer}?text=${encodeURIComponent(WHATSAPP_VERLAENGERUNG_TEXT)}`;
}

export function vornameAus(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "du";
}
