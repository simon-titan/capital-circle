import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Konto ↔ Discord: wer ist wer.
 *
 * ── Zwei Quellen, und beide werden gelesen ──────────────────────────────────
 *
 * Der OAuth-Rückweg (`app/api/discord/callback`) schreibt die Verknüpfung in
 * `discord_connections` **und** in `profiles.discord_id`. Stimmen würden sie
 * also immer beide — solange niemand eine davon von Hand oder über einen
 * Abgleich anfasst. Im Schwesterprojekt hat genau das die halbe Kundschaft
 * unsichtbar gemacht, weil eine Stelle nur die eine Quelle las. Deshalb lesen
 * alle Funktionen hier beide, mit `discord_connections` zuerst.
 */

interface ProfilZeile {
  discord_id: string | null;
  discord_dm_widerspruch?: boolean | null;
}

/**
 * Die Discord-Kennung eines Kontos, ohne Rücksicht auf den DM-Widerspruch.
 *
 * Für alles, was **Rollen** betrifft: Wer keine Direktnachrichten will, soll
 * trotzdem seine Rolle bekommen und im Warteraum die Erklärung sehen.
 *
 * **Wirft** bei einem Lesefehler. Ein stilles `null` hiesse „nicht verknüpft",
 * und ein Aufrufer, der daraufhin „nichts zu tun" folgert, liesse eine Rolle
 * an jemandem stehen, dem sie nicht mehr zusteht.
 */
export async function discordIdRoh(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const [profilRes, verbindungRes] = await Promise.all([
    supabase.from("profiles").select("discord_id").eq("id", userId).maybeSingle(),
    supabase.from("discord_connections").select("discord_user_id").eq("user_id", userId).maybeSingle(),
  ]);

  if (profilRes.error) throw new Error(`profiles nicht lesbar (user=${userId}): ${profilRes.error.message}`);
  if (verbindungRes.error) {
    throw new Error(`discord_connections nicht lesbar (user=${userId}): ${verbindungRes.error.message}`);
  }

  const verbunden = (verbindungRes.data as { discord_user_id: string | null } | null)?.discord_user_id ?? null;
  const profil = (profilRes.data as ProfilZeile | null)?.discord_id ?? null;
  return verbunden || profil || null;
}

/**
 * Die Discord-Kennung, an die eine **Direktnachricht** gehen darf.
 *
 * `null`, wenn kein Konto verknüpft ist oder die Person Direktnachrichten
 * widersprochen hat (`profiles.discord_dm_widerspruch`, Migration 081). Der
 * Widerspruch nimmt nur den bequemen Weg, nie die Sache selbst: **Die Mail geht
 * unabhängig davon raus.**
 *
 * **Wirft nie.** Sie läuft im Stripe-Webhook und im Nachtlauf; bei einem
 * Fehler gibt es eben keine Direktnachricht, die Mail ist dann trotzdem raus.
 * Fehlt die Spalte, weil Migration 081 noch nicht eingespielt ist, gilt kein
 * Widerspruch — dann gibt es auch noch keinen Schalter, über den jemand hätte
 * widersprechen können.
 */
export async function discordIdFuerNachricht(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const [profilRes, verbindungRes] = await Promise.all([
      supabase.from("profiles").select("discord_id,discord_dm_widerspruch").eq("id", userId).maybeSingle(),
      supabase.from("discord_connections").select("discord_user_id").eq("user_id", userId).maybeSingle(),
    ]);

    let profil = profilRes.data as ProfilZeile | null;
    if (profilRes.error) {
      // 42703 / PGRST204: Spalte fehlt (Migration 081). Dann ohne sie lesen.
      if (profilRes.error.code === "42703" || profilRes.error.code === "PGRST204") {
        const zweiter = await supabase.from("profiles").select("discord_id").eq("id", userId).maybeSingle();
        profil = (zweiter.data as ProfilZeile | null) ?? null;
      } else {
        console.warn(`[discord] Profil nicht lesbar (user=${userId}): ${profilRes.error.message}`);
        return null;
      }
    }

    if (profil?.discord_dm_widerspruch) return null;

    const verbunden = (verbindungRes.data as { discord_user_id: string | null } | null)?.discord_user_id ?? null;
    return verbunden || profil?.discord_id || null;
  } catch (err) {
    console.warn(`[discord] Discord-Kennung nicht lesbar (user=${userId}):`, err);
    return null;
  }
}

/**
 * Das Konto zu einer Discord-Kennung, für den Rückweg über einen Knopf.
 *
 * `null`, wenn niemand so verknüpft ist oder die Abfrage scheitert. **Wirft
 * nie**: Sie läuft im Interaktions-Endpunkt, der binnen drei Sekunden
 * antworten muss, und „nicht gefunden" ist dort eine gültige Antwort.
 */
export async function findeNutzerZuDiscordId(supabase: SupabaseClient, discordId: string): Promise<string | null> {
  try {
    const [verbindungRes, profilRes] = await Promise.all([
      supabase.from("discord_connections").select("user_id").eq("discord_user_id", discordId).limit(1).maybeSingle(),
      supabase.from("profiles").select("id").eq("discord_id", discordId).limit(1).maybeSingle(),
    ]);
    const ueberVerbindung = (verbindungRes.data as { user_id: string } | null)?.user_id ?? null;
    const ueberProfil = (profilRes.data as { id: string } | null)?.id ?? null;
    return ueberVerbindung ?? ueberProfil;
  } catch (err) {
    console.warn(`[discord] Konto zu Discord-ID ${discordId} nicht lesbar:`, err);
    return null;
  }
}
