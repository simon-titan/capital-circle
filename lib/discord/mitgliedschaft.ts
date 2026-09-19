import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateAccess, type AccessTier } from "@/lib/access-control/has-access";
import { addRole, discordBotConfigured, getGuildMember, removeRole } from "@/lib/discord/api";
import { discordIdRoh } from "@/lib/discord/konto";

/**
 * Die Mitgliederrolle an den Zugang angleichen — aufgerufen aus den
 * Stripe-Webhooks, dem Nachtlauf und dem Adminbereich.
 *
 * ── Zwei Rollen, und nur diese zwei ─────────────────────────────────────────
 *
 * `DISCORD_ROLE_ID` ist die Mitgliederrolle: Sie macht die Mitgliederkanäle
 * sichtbar. `DISCORD_WAITING_ROOM_ROLE_ID` ist der Warteraum („Zugang
 * pausiert"): genau ein Kanal mit einer Erklärung. Alles andere auf dem Server
 * — Moderatoren, Farbrollen, die Funnel-Rolle `DISCORD_FUNNEL_ROLE_ID` —
 * fasst dieser Code nicht an.
 *
 * ── Die Warteraumrolle wird hier nur abgenommen, nie vergeben ──────────────
 *
 * Vergeben wird sie ausschliesslich über `inDenWarteraum`
 * (`lib/discord/warteraum.ts`), weil dort die Bedingungen stehen. Abgenommen
 * wird sie hier, sobald jemand wieder Zugang bekommt — damit ist jeder Weg
 * abgedeckt, der Zugang herstellt (Zahlung, Aufschub, Lifetime-Kauf,
 * Fortsetzen nach einer Pause, OAuth-Rückweg), ohne dass ein Aufrufer davon
 * wissen muss.
 *
 * **Umgekehrt gilt das ausdrücklich nicht.** Beim Entzug bleibt die
 * Warteraumrolle stehen: Sonst nähme die Sperre am siebten Tag dem Kunden den
 * Warteraum in derselben Sekunde wieder ab, in der er ihn bekommt. Aus
 * demselben Grund entzieht der Bestandsabgleich (`lib/discord/reconcile.ts`)
 * die Warteraumrolle nie von sich aus.
 *
 * ── Die Datenbank ist die Wahrheit ─────────────────────────────────────────
 *
 * Ob jemand Zugang hat, entscheidet `evaluateAccess()` — Stufe plus
 * `access_until`, dieselbe Regel wie im Mitgliederbereich. `is_paid` allein
 * reicht nicht: Eine Pause setzt `is_paid` sofort auf falsch, der Zugang läuft
 * aber bis zum Ende der bezahlten Periode weiter.
 */

export function mitgliedsRolleId(): string | null {
  return process.env.DISCORD_ROLE_ID?.trim() || null;
}

/**
 * Die Rolle „Zugang pausiert", oder `null`.
 *
 * Ohne den Wert passiert nirgends etwas, und das ist der sichere
 * Ausfallzustand: Der Zugang wird weiterhin gesperrt, es fehlt nur der
 * erklärende Kanal.
 */
export function warteraumRolleId(): string | null {
  return process.env.DISCORD_WAITING_ROOM_ROLE_ID?.trim() || null;
}

export type RollenErgebnis = "gesetzt" | "entzogen" | "unveraendert" | "nicht_im_server" | "nicht_eingerichtet";

/**
 * Setzt die Mitgliederrolle passend zum Zugang. **Wirft** bei einem
 * Discord-Fehler — der Aufrufer entscheidet, ob das den Vorgang aufhält.
 *
 * Mit Zugang: Mitgliederrolle an, Warteraumrolle ab.
 * Ohne Zugang: Mitgliederrolle ab, Warteraumrolle bleibt, wie sie ist.
 */
export async function setzeMitgliedsrolle(discordId: string, zugang: boolean): Promise<RollenErgebnis> {
  const rolle = mitgliedsRolleId();
  if (!rolle || !discordBotConfigured()) return "nicht_eingerichtet";

  const mitglied = await getGuildMember(discordId);
  // Nicht mehr im Server — dann gibt es nichts zu setzen und nichts zu entziehen.
  if (!mitglied) return "nicht_im_server";

  const hat = mitglied.roles.includes(rolle);
  let ergebnis: RollenErgebnis = "unveraendert";

  if (zugang) {
    if (!hat) {
      await addRole(discordId, rolle);
      ergebnis = "gesetzt";
    }
    const warteraum = warteraumRolleId();
    if (warteraum && mitglied.roles.includes(warteraum)) {
      await removeRole(discordId, warteraum);
      ergebnis = "gesetzt";
    }
  } else if (hat) {
    await removeRole(discordId, rolle);
    ergebnis = "entzogen";
  }

  return ergebnis;
}

/**
 * Hat dieses Konto laut Datenbank gerade Zugang?
 *
 * **Wirft** bei einem Lesefehler: „nicht lesbar" darf nie „kein Zugang"
 * heissen, sonst nähme ein Datenbank-Aussetzer einem zahlenden Kunden die Rolle.
 */
export async function hatZugangLautProfil(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("membership_tier,is_paid,access_until")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Profil nicht lesbar (user=${userId}): ${error.message}`);
  if (!data) return false;
  const profil = data as { membership_tier: AccessTier | null; is_paid: boolean | null; access_until: string | null };
  return evaluateAccess(profil).hasAccess;
}

/**
 * Webhook-taugliche Fassung: schlägt nie fehl, protokolliert aber laut.
 *
 * `zugang` ist der Zustand **nach** der Änderung. Gibt zurück, ob Discord jetzt
 * dem entspricht (oder nichts zu tun war), damit der Nachtlauf es in den
 * Verlauf eines Zahlungsfalls schreiben kann.
 *
 * ── Die einzige Stelle, an der ein Zahlungsaufschub wirkt ───────────────────
 *
 * Wer einen laufenden Aufschub hat, behält seine Rolle, auch wenn Stripe das
 * Abo gerade beendet hat. Die Prüfung steht **nur beim Entzug**, und sie
 * verhindert nur, sie stellt nichts her.
 */
export async function synchronisiereRollen(
  supabase: SupabaseClient,
  userId: string,
  zugang: boolean,
  anlass: string,
): Promise<boolean> {
  if (!discordBotConfigured() || !mitgliedsRolleId()) {
    console.warn(`[discord] ${anlass}: Bot oder DISCORD_ROLE_ID nicht eingerichtet, Rollenabgleich übersprungen (user=${userId}).`);
    return false;
  }

  try {
    const discordId = await discordIdRoh(supabase, userId);
    if (!discordId) {
      // Kein Fehler: Wer nie verknüpft hat, hat auch keine Rolle.
      console.info(`[discord] ${anlass}: keine Discord-Verknüpfung für user=${userId}, nichts zu tun.`);
      return true;
    }

    if (!zugang) {
      const { laufenderAufschub } = await import("@/lib/zahlung/aufschub");
      const aufschub = await laufenderAufschub(supabase, userId);
      if (aufschub) {
        console.info(
          `[discord] ${anlass}: Rollenentzug ausgesetzt, Aufschub bis ${aufschub.bis} (user=${userId}, Fall ${aufschub.fallId}).`,
        );
        return true;
      }
    }

    const ergebnis = await setzeMitgliedsrolle(discordId, zugang);
    console.info(`[discord] ${anlass}: Mitgliederrolle ${ergebnis} (user=${userId}, zugang=${zugang}).`);
    return ergebnis !== "nicht_eingerichtet";
  } catch (err) {
    console.error(
      `[discord] ${anlass}: Rollenabgleich fehlgeschlagen (user=${userId}). ` +
        "Die Datenbank ist aktuell, Discord nicht; der Nachtlauf holt es nach.",
      err,
    );
    return false;
  }
}

/**
 * Die Rolle nach dem richten, was im Profil steht. **Wirft nie.**
 *
 * Für Webhooks, die den Zugang gerade geändert haben und nicht selbst
 * ausrechnen sollen, ob er jetzt besteht: Das weiss nur `evaluateAccess()`.
 */
export async function synchronisiereNachProfil(
  supabase: SupabaseClient,
  userId: string,
  anlass: string,
): Promise<boolean> {
  let zugang: boolean;
  try {
    zugang = await hatZugangLautProfil(supabase, userId);
  } catch (err) {
    console.error(`[discord] ${anlass}: Zugang nicht prüfbar (user=${userId}), Rollen bleiben unverändert:`, err);
    return false;
  }
  return synchronisiereRollen(supabase, userId, zugang, anlass);
}
