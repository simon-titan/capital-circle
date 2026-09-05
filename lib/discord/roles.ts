/**
 * Gemeinsame Discord-Bot-Helper (REST-API via Bot-Token). Extrahiert aus
 * `app/api/discord/callback/route.ts` und `app/api/discord/disconnect/route.ts`,
 * damit Stripe-Webhooks und der Bestandsabgleich dieselbe Logik nutzen.
 */

const DISCORD_API_BASE = "https://discord.com/api/v10";

/** Bestehende Mitglieder: Discord ignoriert `roles` im Add-Member-Body bei 204 — Rolle separat setzen. */
export async function addGuildMemberRole(
  guildId: string,
  botToken: string,
  discordUserId: string,
  roleId: string,
): Promise<void> {
  const res = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    },
  );

  if (!res.ok && res.status !== 204) {
    const errBody = await res.text();
    console.error("[discord/roles] add member role failed:", res.status, errBody);
  }
}

/** 404 (Rolle bereits entfernt / Nutzer kein Mitglied mehr) wird toleriert. */
export async function removeGuildMemberRole(
  guildId: string,
  botToken: string,
  discordUserId: string,
  roleId: string,
): Promise<void> {
  const res = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    },
  );

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const errBody = await res.text();
    console.error("[discord/roles] remove member role failed:", res.status, errBody);
  }
}

/**
 * Entfernt den Nutzer per Bot-Token vom Discord-Server.
 * Schlägt fehl → nur loggen, DB-Cleanup trotzdem durchführen.
 */
export async function removeFromGuild(
  guildId: string,
  botToken: string,
  discordUserId: string,
): Promise<void> {
  const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  });

  // 204 = erfolgreich entfernt, 404 = war kein Mitglied (beides ok)
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const body = await res.text();
    console.error("[discord/roles] guild member DELETE failed:", res.status, body);
  }
}

export interface DiscordGuildMember {
  user?: { id: string };
  roles: string[];
}

/** Einzelnes Mitglied inkl. Rollen lesen. `null` bei 404 (kein Mitglied mehr) oder Request-Fehler. */
export async function getGuildMember(
  guildId: string,
  botToken: string,
  discordUserId: string,
): Promise<DiscordGuildMember | null> {
  const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`, {
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    console.error("[discord/roles] get guild member failed:", res.status, body);
    return null;
  }
  return (await res.json()) as DiscordGuildMember;
}

/**
 * Alle Mitglieder eines Servers paginiert laden (Discord-Limit: 1000/Request,
 * `after` = letzte User-ID der vorherigen Seite) — für den Bestandsabgleich,
 * um nicht pro Nutzer einen eigenen Request abzusetzen.
 */
export async function listGuildMembers(
  guildId: string,
  botToken: string,
): Promise<DiscordGuildMember[]> {
  const members: DiscordGuildMember[] = [];
  let after = "0";

  for (;;) {
    const res = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members?limit=1000&after=${after}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("[discord/roles] list guild members failed:", res.status, body);
      break;
    }

    const page = (await res.json()) as DiscordGuildMember[];
    if (page.length === 0) break;

    members.push(...page);
    if (page.length < 1000) break;

    const lastId = page[page.length - 1]?.user?.id;
    if (!lastId) break;
    after = lastId;
  }

  return members;
}
