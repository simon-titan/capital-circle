import { createServiceClient } from "@/lib/supabase/server";
import { addGuildMemberRole, listGuildMembers, removeGuildMemberRole } from "@/lib/discord/roles";

export type DesiredRoleState = "regular" | "waiting_room" | "none";
export type ActualRoleState = DesiredRoleState | "not_in_guild";

export interface ReconcileDetail {
  userId: string;
  discordUserId: string;
  desired: DesiredRoleState;
  actual: ActualRoleState;
  fixed: boolean;
  note?: string;
}

export interface ReconcileResult {
  apply: boolean;
  checkedCount: number;
  fixedCount: number;
  details: ReconcileDetail[];
}

/**
 * Soll-Zustand einer Discord-Rolle für ein Profil.
 *
 * Es gibt kein eigenes "in Grace"-Flag in der DB — `access_until` trägt
 * sowohl die normale Zugriffsdauer als auch die 48h-Grace nach einem
 * Zahlungsausfall. Als Signal dafür, ob die aktuelle `access_until`-Frist
 * eine Grace ist, dient die letzte `payments`-Zeile des Nutzers: steht sie
 * auf `failed` und die Frist läuft noch, ist der Nutzer im Warteraum-Fall.
 */
export function computeDesiredRoleState(params: {
  isPaid: boolean;
  accessUntil: string | null;
  latestPaymentStatus: string | null;
}): DesiredRoleState {
  const { isPaid, accessUntil, latestPaymentStatus } = params;
  if (!isPaid) return "none";

  const accessActive = accessUntil ? new Date(accessUntil).getTime() > Date.now() : true;
  if (!accessActive) return "none";

  return latestPaymentStatus === "failed" ? "waiting_room" : "regular";
}

/**
 * Lädt alle `discord_connections`, berechnet den Soll-Zustand je Nutzer
 * (Payments + Profile), vergleicht ihn mit dem Ist-Zustand auf Discord
 * (einmalig paginiert geladene Mitgliederliste statt Request pro Nutzer) und
 * behebt Abweichungen bei `apply=true`. Jeder Lauf schreibt eine Zeile in
 * `discord_sync_log`.
 */
export async function reconcileDiscordRoles({
  apply,
  triggeredBy,
}: {
  apply: boolean;
  triggeredBy: "admin" | "script";
}): Promise<ReconcileResult> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const roleId = process.env.DISCORD_ROLE_ID;
  const waitingRoomRoleId = process.env.DISCORD_WAITING_ROOM_ROLE_ID;

  if (!guildId || !botToken || !roleId) {
    throw new Error(
      "DISCORD_GUILD_ID / DISCORD_BOT_TOKEN / DISCORD_ROLE_ID müssen gesetzt sein, um den Bestand abzugleichen.",
    );
  }

  const service = createServiceClient();

  const { data: connections, error: dcError } = await service
    .from("discord_connections")
    .select("user_id, discord_user_id");
  if (dcError) {
    throw new Error(`discord_connections laden fehlgeschlagen: ${dcError.message}`);
  }

  const rows = (connections ?? []) as { user_id: string; discord_user_id: string }[];

  if (rows.length === 0) {
    return writeLogAndReturn(service, { apply, triggeredBy, checkedCount: 0, fixedCount: 0, details: [] });
  }

  const userIds = rows.map((r) => r.user_id);

  const [profilesRes, paymentsRes, members] = await Promise.all([
    service.from("profiles").select("id, is_paid, access_until").in("id", userIds),
    service
      .from("payments")
      .select("user_id, status, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
    listGuildMembers(guildId, botToken),
  ]);

  if (profilesRes.error) {
    throw new Error(`profiles laden fehlgeschlagen: ${profilesRes.error.message}`);
  }
  if (paymentsRes.error) {
    throw new Error(`payments laden fehlgeschlagen: ${paymentsRes.error.message}`);
  }

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id as string,
      { isPaid: Boolean(p.is_paid), accessUntil: (p.access_until as string | null) ?? null },
    ]),
  );

  // Payments sind desc nach created_at sortiert — erster Treffer je user_id ist der neueste.
  const latestPaymentStatus = new Map<string, string>();
  for (const p of paymentsRes.data ?? []) {
    const uid = p.user_id as string;
    if (!latestPaymentStatus.has(uid)) {
      latestPaymentStatus.set(uid, p.status as string);
    }
  }

  const memberRoleMap = new Map<string, string[]>();
  for (const m of members) {
    if (m.user?.id) memberRoleMap.set(m.user.id, m.roles ?? []);
  }

  const details: ReconcileDetail[] = [];
  let fixedCount = 0;

  for (const row of rows) {
    const { user_id: userId, discord_user_id: discordUserId } = row;
    const profile = profileMap.get(userId);

    const desired = computeDesiredRoleState({
      isPaid: profile?.isPaid ?? false,
      accessUntil: profile?.accessUntil ?? null,
      latestPaymentStatus: latestPaymentStatus.get(userId) ?? null,
    });

    const roles = memberRoleMap.get(discordUserId);
    if (!roles) {
      details.push({
        userId,
        discordUserId,
        desired,
        actual: "not_in_guild",
        fixed: false,
        note: "Nutzer ist nicht (mehr) auf dem Discord-Server.",
      });
      continue;
    }

    const actual: ActualRoleState = roles.includes(roleId)
      ? "regular"
      : waitingRoomRoleId && roles.includes(waitingRoomRoleId)
        ? "waiting_room"
        : "none";

    if (actual === desired) {
      details.push({ userId, discordUserId, desired, actual, fixed: false });
      continue;
    }

    let fixed = false;
    let note: string | undefined;

    if (apply) {
      if (desired === "waiting_room" && !waitingRoomRoleId) {
        note = "DISCORD_WAITING_ROOM_ROLE_ID nicht gesetzt — Warteraum-Rolle konnte nicht vergeben werden.";
      } else {
        try {
          if (actual === "regular") {
            await removeGuildMemberRole(guildId, botToken, discordUserId, roleId);
          } else if (actual === "waiting_room" && waitingRoomRoleId) {
            await removeGuildMemberRole(guildId, botToken, discordUserId, waitingRoomRoleId);
          }

          if (desired === "regular") {
            await addGuildMemberRole(guildId, botToken, discordUserId, roleId);
          } else if (desired === "waiting_room" && waitingRoomRoleId) {
            await addGuildMemberRole(guildId, botToken, discordUserId, waitingRoomRoleId);
          }

          fixed = true;
        } catch (err) {
          note = err instanceof Error ? err.message : "Unbekannter Fehler beim Rollen-Fix.";
        }
      }
    }

    if (fixed) fixedCount++;
    details.push({ userId, discordUserId, desired, actual, fixed, note });
  }

  return writeLogAndReturn(service, {
    apply,
    triggeredBy,
    checkedCount: rows.length,
    fixedCount,
    details,
  });
}

async function writeLogAndReturn(
  service: ReturnType<typeof createServiceClient>,
  params: {
    apply: boolean;
    triggeredBy: "admin" | "script";
    checkedCount: number;
    fixedCount: number;
    details: ReconcileDetail[];
  },
): Promise<ReconcileResult> {
  const { apply, triggeredBy, checkedCount, fixedCount, details } = params;

  const { error: logError } = await service.from("discord_sync_log").insert({
    triggered_by: triggeredBy,
    dry_run: !apply,
    checked_count: checkedCount,
    fixed_count: fixedCount,
    details,
  });
  if (logError) {
    console.error("[discord/reconcile] discord_sync_log INSERT fehlgeschlagen:", logError.message);
  }

  return { apply, checkedCount, fixedCount, details };
}
