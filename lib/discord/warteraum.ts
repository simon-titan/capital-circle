/**
 * Die Rolle „Zugang pausiert": der Warteraum.
 *
 * Übernommen aus MoonTrading (`lib/discord/pausenrolle.ts`).
 *
 * ── Was sie tut ─────────────────────────────────────────────────────────────
 *
 * Wer seinen Zugang verliert (siebter Tag eines Zahlungsfalls, Ende eines
 * Aufschubs, Kündigung, Ende einer Pause), verliert die Mitgliederrolle und
 * damit die Mitglieder-Kanäle. Ohne Warteraum sässe er vor einem Server, auf
 * dem plötzlich etwas fehlt, ohne dass irgendwo dort steht, warum. Diese Rolle
 * gibt ihm stattdessen einen Kanal mit einer angepinnten Erklärung und einem
 * Knopf („Anliegen klären"), in dem er nicht schreiben kann.
 *
 * Sie vergibt keinerlei Rechte: Alles, was sie bewirkt, steht in den
 * Kanalrechten auf dem Server (`docs/discord-retention.md`). Hier steht nur,
 * wer sie bekommt und wer sie wieder los wird.
 *
 * ── Warum der Bestandsabgleich sie nie entzieht ─────────────────────────────
 *
 * `lib/discord/reconcile.ts` nimmt die Warteraumrolle nur ab, wenn jemand
 * **wieder Zugang** hat — nie, weil sie „nicht im Soll" steht. Sonst räumte ein
 * `npm run discord:sync -- --apply` den Warteraum bei jedem Lauf still leer,
 * denn für einen Nichtzahler ist das Soll „keine Mitgliederrolle".
 *
 * ── Wer sie vergibt, wer sie abnimmt ────────────────────────────────────────
 *
 * Vergeben: ausschliesslich über `inDenWarteraum` (die Bedingungen stehen
 * dort). Abgenommen: `setzeMitgliedsrolle(…, true)` in
 * `lib/discord/mitgliedschaft.ts`, sobald jemand wieder Zugang bekommt, dazu
 * das Trennen der Verknüpfung (`/api/discord/disconnect`) und der Nachtlauf als
 * Netz.
 *
 * ── Und sie ist die Spur für den Rauswurf ───────────────────────────────────
 *
 * Wer die Mitgliederrolle verloren hat, trägt keine Rolle mehr, an der der
 * Rauswurf-Lauf ihn erkennen könnte. Die Warteraumrolle ist diese Spur
 * (`lib/discord/aufraeumen.ts`). Im Schwesterprojekt liefen die dreissig Tage
 * genau für diese Gruppe zuerst überhaupt nicht.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { addRole, discordBotConfigured, getGuildMember, removeRole } from "@/lib/discord/api";
import { discordIdRoh } from "@/lib/discord/konto";
import { hatZugangLautProfil, warteraumRolleId } from "@/lib/discord/mitgliedschaft";

/**
 * Setzt oder entzieht die Warteraumrolle an einem Discord-Konto.
 *
 * **Wirft nie.** Der Rückgabewert sagt, ob es tatsächlich geklappt hat; die
 * Sperre schreibt ihn in den Verlauf des Falls.
 */
export async function setzeWarteraumrolle(discordId: string, an: boolean): Promise<boolean> {
  const rolle = warteraumRolleId();
  if (!rolle) {
    console.info("[discord] Keine DISCORD_WAITING_ROOM_ROLE_ID gesetzt, Warteraum übersprungen.");
    return false;
  }
  if (!discordBotConfigured()) return false;

  try {
    const mitglied = await getGuildMember(discordId);
    // Nicht im Server: kein Warteraum, in den man ihn setzen könnte.
    if (!mitglied) return false;

    const hat = mitglied.roles.includes(rolle);
    if (an === hat) return true;

    if (an) await addRole(discordId, rolle);
    else await removeRole(discordId, rolle);
    return true;
  } catch (err) {
    console.error(`[discord] Warteraumrolle ${an ? "setzen" : "entziehen"} fehlgeschlagen (${discordId}):`, err);
    return false;
  }
}

/**
 * Jemanden in den Warteraum setzen, nachdem sein Zugang geendet hat.
 *
 * Die **Entscheidung**, nicht der Handgriff: Sie steht an einer Stelle, damit
 * jeder Aufrufer dieselben Prüfungen bekommt.
 *
 * 1. **Ein verknüpftes Discord-Konto** — gelesen ohne Rücksicht auf den
 *    DM-Widerspruch: Wer keine Direktnachricht will, soll trotzdem den Kanal
 *    mit der Erklärung sehen.
 * 2. **Kein Zugang laut Profil** (`hatZugang`: `is_paid` oder Admin, dieselbe
 *    Regel wie bei den Inhalten). Die Sicherung gegen den
 *    Wettlauf: Zahlt die Person zwischen dem Ende des alten Vertrags und
 *    diesem Aufruf schon wieder, gehört sie nicht in den Warteraum.
 * 3. **Kein laufender Aufschub.** Ein Warteraum wäre die sichtbare Gegenrede
 *    zu einer Zusage, die ein Mensch gegeben hat.
 *
 * Sie vergibt nur, sie nimmt nie. Ein Fehler in einer der Abfragen lässt
 * jemanden ausserhalb des Warteraums, statt einen Zahler hineinzustecken.
 *
 * **Wirft nie.** Alle Aufrufer hängen an Stripe-Webhooks oder am Nachtlauf.
 */
export async function inDenWarteraum(supabase: SupabaseClient, userId: string, anlass: string): Promise<boolean> {
  if (!warteraumRolleId() || !discordBotConfigured()) return false;

  try {
    const discordId = await discordIdRoh(supabase, userId);
    if (!discordId) return false;

    if (await hatZugangLautProfil(supabase, userId)) {
      console.info(`[discord] ${anlass}: Warteraum übersprungen, Zugang besteht (user=${userId}).`);
      return false;
    }

    const { laufenderAufschub } = await import("@/lib/zahlung/aufschub");
    const aufschub = await laufenderAufschub(supabase, userId);
    if (aufschub) {
      console.info(`[discord] ${anlass}: Warteraum übersprungen, Aufschub bis ${aufschub.bis} (user=${userId}).`);
      return false;
    }

    const gesetzt = await setzeWarteraumrolle(discordId, true);
    if (gesetzt) console.info(`[discord] ${anlass}: Warteraum gesetzt (user=${userId}).`);
    return gesetzt;
  } catch (err) {
    console.error(`[discord] ${anlass}: Warteraum nicht setzbar (user=${userId}):`, err);
    return false;
  }
}

/**
 * Das Ende eines Zugangs in Discord nachziehen: Mitgliederrolle weg, Warteraum
 * drauf — in dieser Reihenfolge. **Wirft nie.**
 *
 * Für die Stripe-Webhooks (`subscription.deleted`, `.paused`, das Ende einer
 * Pause). Hat die Person laut Profil weiterhin Zugang, passiert nichts
 * ausser dem Abgleich der Rolle.
 */
export async function zugangBeendetInDiscord(supabase: SupabaseClient, userId: string, anlass: string): Promise<void> {
  const { synchronisiereNachProfil } = await import("@/lib/discord/mitgliedschaft");
  await synchronisiereNachProfil(supabase, userId, anlass);
  await inDenWarteraum(supabase, userId, anlass);
}
