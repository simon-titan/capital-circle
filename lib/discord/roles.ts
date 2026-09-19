/**
 * @deprecated Übergangshülle. Neue Aufrufer nutzen `lib/discord/api.ts`
 * (Rohaufrufe) bzw. `lib/discord/mitgliedschaft.ts` (Mitgliederrolle).
 *
 * Hier lagen bis zum 19.09.2026 vier eigene `fetch`-Aufrufe ohne Wartelogik bei
 * 429. Sie laufen jetzt durch `lib/discord/api.ts`, damit es die Wartelogik nur
 * einmal gibt. Die alten Signaturen (`guildId`, `botToken` vorneweg) bleiben
 * nur, bis der letzte Aufrufer umgezogen ist; `guildId` und `botToken` werden
 * dabei ignoriert, `api.ts` liest dieselben Umgebungsvariablen selbst.
 *
 * Diese Datei wird gelöscht, sobald nichts mehr sie importiert.
 */

import {
  addRole,
  getGuildMember as getMember,
  kickGuildMember,
  listGuildMembers as listMembers,
  removeRole,
} from "@/lib/discord/api";

export interface DiscordGuildMember {
  user?: { id: string };
  roles: string[];
}

/** Best-effort wie bisher: loggt statt zu werfen. */
export async function addGuildMemberRole(
  _guildId: string,
  _botToken: string,
  discordUserId: string,
  roleId: string,
): Promise<void> {
  try {
    await addRole(discordUserId, roleId);
  } catch (err) {
    console.error("[discord/roles] add member role failed:", err);
  }
}

/** Best-effort wie bisher: loggt statt zu werfen. 404 gilt als erledigt. */
export async function removeGuildMemberRole(
  _guildId: string,
  _botToken: string,
  discordUserId: string,
  roleId: string,
): Promise<void> {
  try {
    await removeRole(discordUserId, roleId);
  } catch (err) {
    console.error("[discord/roles] remove member role failed:", err);
  }
}

/** @deprecated Einziger Aufrufer war `app/api/discord/disconnect`; Trennen wirft künftig nicht mehr vom Server. */
export async function removeFromGuild(_guildId: string, _botToken: string, discordUserId: string): Promise<void> {
  try {
    const ergebnis = await kickGuildMember(discordUserId, "Discord-Verknüpfung getrennt");
    if (ergebnis.art === "fehler" || ergebnis.art === "keine_berechtigung") {
      console.error("[discord/roles] guild member DELETE failed:", ergebnis);
    }
  } catch (err) {
    console.error("[discord/roles] guild member DELETE failed:", err);
  }
}

/** `null` bei 404 oder Fehler — wie bisher. */
export async function getGuildMember(
  _guildId: string,
  _botToken: string,
  discordUserId: string,
): Promise<DiscordGuildMember | null> {
  try {
    const m = await getMember(discordUserId);
    return m ? { user: { id: m.id }, roles: m.roles } : null;
  } catch (err) {
    console.error("[discord/roles] get guild member failed:", err);
    return null;
  }
}

/** **Wirft** jetzt bei einem Fehler, statt eine halbe Liste zu liefern. */
export async function listGuildMembers(_guildId: string, _botToken: string): Promise<DiscordGuildMember[]> {
  const alle = await listMembers();
  return alle.map((m) => ({ user: { id: m.id }, roles: m.roles }));
}
