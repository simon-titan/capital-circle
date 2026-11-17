import type { SupabaseClient } from "@supabase/supabase-js";
import { normEmail } from "./versand";

/**
 * Persönliche Kontaktpause (Playbook Regel 08–10): Hat jemand geantwortet oder
 * läuft ein persönlicher Dialog, pausieren die automatischen Lern- und
 * Verkaufsmails (M/K). Notwendige Bestätigungen (A02, E03, W01, Q01/Q02) und
 * Terminorganisation laufen weiter. Aufheben nur durch das Team, mit
 * dokumentiertem nächsten Schritt; danach keine nachgeholte Mailflut
 * (übersprungen wird, was mehr als 24 h überfällig ist).
 */

export async function kontaktPauseSetzen(
  service: SupabaseClient,
  p: { email: string; userId: string | null; grund: string; von: string | null },
): Promise<void> {
  const { error } = await service.from("kontakt_pause").insert({
    email: normEmail(p.email),
    user_id: p.userId,
    grund: p.grund,
    gesetzt_von: p.von,
  });
  // 23505: Es gibt schon eine offene Pause — das ist kein Fehler.
  if (error && error.code !== "23505") throw new Error(`kontakt_pause: ${error.message}`);
}

export async function kontaktPauseAufheben(
  service: SupabaseClient,
  p: { email: string; naechsterSchritt: string; von: string | null },
): Promise<void> {
  const { error } = await service
    .from("kontakt_pause")
    .update({ aufgehoben_am: new Date().toISOString(), aufgehoben_von: p.von, naechster_schritt: p.naechsterSchritt })
    .eq("email", normEmail(p.email))
    .is("aufgehoben_am", null);
  if (error) throw new Error(`kontakt_pause: ${error.message}`);
}

/** Adressen mit offener Pause (klein geschrieben). */
export async function offenePausen(service: SupabaseClient, emails: string[]): Promise<Set<string>> {
  if (!emails.length) return new Set();
  const { data, error } = await service
    .from("kontakt_pause")
    .select("email")
    .in("email", emails.map(normEmail))
    .is("aufgehoben_am", null);
  if (error) {
    console.error("[mailsystem] kontakt_pause nicht lesbar:", error.message);
    // Im Zweifel pausieren: lieber eine Mail zu wenig als eine gegen den Dialog.
    return new Set(emails.map(normEmail));
  }
  return new Set(((data ?? []) as { email: string }[]).map((z) => z.email));
}

/**
 * Adressen, die Werbe-Mails abbestellt haben, ohne Konto (`mail_abmeldung`,
 * Migration 110). Konten tragen `profiles.unsubscribed_at`. Bei Lesefehler
 * gelten alle als abgemeldet — eine nicht verschickte Werbe-Mail kostet nichts.
 */
export async function abgemeldeteAdressen(service: SupabaseClient, emails: string[]): Promise<Set<string>> {
  if (!emails.length) return new Set();
  const { data, error } = await service.from("mail_abmeldung").select("email").in("email", emails.map(normEmail));
  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) return new Set();
    console.error("[mailsystem] mail_abmeldung nicht lesbar:", error.message);
    return new Set(emails.map(normEmail));
  }
  return new Set(((data ?? []) as { email: string }[]).map((z) => z.email));
}
