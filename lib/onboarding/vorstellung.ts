import type { SupabaseClient } from "@supabase/supabase-js";
import { discordBotConfigured, listChannelMessages } from "@/lib/discord/api";
import { protokolliere, stempleSchritt } from "@/lib/onboarding/server";

export type VorstellungsErgebnis = {
  gelaufen: boolean;
  nachrichten: number;
  erkannt: number;
  grund?: string;
};

/**
 * Schritt 2 der Start-Checkliste automatisch abhaken: Wer im
 * Vorstellungskanal (`DISCORD_VORSTELLUNG_CHANNEL_ID`) geschrieben hat, gilt
 * als vorgestellt. Der Bot liest die letzten 100 Nachrichten (nur Autor, nicht
 * den Inhalt) und gleicht sie mit `profiles.discord_id` ab.
 *
 * Läuft im nächtlichen Cron. Ohne Kanal-ID oder Bot still übersprungen —
 * dann bleibt „Als erledigt markieren" in der Checkliste der einzige Weg.
 * Wirft nie: Das Ergebnis ist Statistik, kein Betriebszustand.
 */
export async function erkenneVorstellungen(service: SupabaseClient): Promise<VorstellungsErgebnis> {
  const kanal = process.env.DISCORD_VORSTELLUNG_CHANNEL_ID?.trim();
  if (!kanal) return { gelaufen: false, nachrichten: 0, erkannt: 0, grund: "DISCORD_VORSTELLUNG_CHANNEL_ID fehlt." };
  if (!discordBotConfigured()) return { gelaufen: false, nachrichten: 0, erkannt: 0, grund: "Discord-Bot nicht eingerichtet." };

  try {
    const nachrichten = await listChannelMessages(kanal, 100);
    const autoren = [...new Set(nachrichten.map((n) => n.authorId).filter(Boolean))];
    if (autoren.length === 0) return { gelaufen: true, nachrichten: nachrichten.length, erkannt: 0 };

    const { data: profile, error } = await service.from("profiles").select("id").in("discord_id", autoren);
    if (error) throw new Error(error.message);

    let erkannt = 0;
    for (const p of profile ?? []) {
      const userId = p.id as string;
      if (await stempleSchritt(service, userId, "community_vorgestellt_am")) {
        await protokolliere(service, userId, "onboarding_community_intro_completed", { erkannt: "discord_kanal" });
        erkannt++;
      }
    }
    return { gelaufen: true, nachrichten: nachrichten.length, erkannt };
  } catch (err) {
    console.warn("[onboarding] Vorstellungskanal nicht lesbar:", err);
    return {
      gelaufen: false,
      nachrichten: 0,
      erkannt: 0,
      grund: err instanceof Error ? err.message : String(err),
    };
  }
}
