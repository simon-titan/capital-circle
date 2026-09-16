import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Auth-Konto anhand der E-Mail finden (Service-Role nötig).
 *
 * Gebraucht vom Gast-Checkout: Stripe kennt nur die E-Mail, die der Käufer in
 * der Kasse eingegeben hat, und daraus muss die interne `user_id` werden — im
 * Webhook (Konto anlegen oder wiederfinden) und auf der Erfolgsseite (Ist das
 * Konto schon da?).
 *
 * `profiles` führt keine `email`-Spalte, die Adresse lebt ausschließlich in
 * `auth.users`. Die Admin-API von supabase-js v2 kennt dafür keinen
 * serverseitigen Filter, also wird seitenweise gelesen und hier verglichen.
 * Genau deshalb steht der Vergleich (trimmen, kleinschreiben) an EINER Stelle:
 * Liefen Webhook und Erfolgsseite auseinander, entstünde für denselben Käufer
 * einmal ein Treffer und einmal ein zweites Konto.
 *
 * Grenze: Bei sehr vielen Konten werden das viele Abfragen. Der saubere Weg
 * wäre eine gespiegelte `email`-Spalte auf `profiles` — solange die fehlt,
 * ist das hier die ehrliche Variante.
 */

/** Sicherheitsnetz gegen eine Endlosschleife, falls die API immer volle Seiten meldet. */
const MAX_SEITEN = 25;
const PRO_SEITE = 200;

export async function findeUserIdZuEmail(
  service: SupabaseClient,
  email: string,
): Promise<string | null> {
  const gesucht = email.trim().toLowerCase();
  if (!gesucht) return null;

  for (let seite = 1; seite <= MAX_SEITEN; seite++) {
    const { data, error } = await service.auth.admin.listUsers({ page: seite, perPage: PRO_SEITE });
    if (error) {
      throw new Error(`listUsers(page=${seite}) fehlgeschlagen: ${error.message}`);
    }

    const users = data?.users ?? [];
    const treffer = users.find((u) => u.email?.trim().toLowerCase() === gesucht);
    if (treffer) return treffer.id;

    // Letzte Seite erreicht — weitere Abfragen wären leer.
    if (users.length < PRO_SEITE) return null;
  }

  return null;
}
