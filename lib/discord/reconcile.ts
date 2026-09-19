import { createServiceClient } from "@/lib/supabase/server";
import { evaluateAccess, type AccessTier } from "@/lib/access-control/has-access";
import { discordBotConfigured, listGuildMembers } from "@/lib/discord/api";
import { mitgliedsRolleId, setzeMitgliedsrolle, warteraumRolleId } from "@/lib/discord/mitgliedschaft";

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
  /** Wie vielen die Mitgliederrolle genommen würde bzw. wurde. */
  entzugGeplant: number;
  /** Gesetzt, wenn der Entzug wegen der Obergrenze ausgesetzt wurde. */
  entzugAusgesetzt?: string;
  details: ReconcileDetail[];
}

/**
 * Soll-Zustand der Mitgliederrolle für ein Profil.
 *
 * ── Seit 19.09.2026: der Zugang entscheidet, nicht die letzte Zahlung ──────
 *
 * Bis hierher galt „bezahlt, Zugang läuft, letzte Zahlung `failed`" als
 * Warteraum. Damit sass jedes Mitglied ab der ersten gescheiterten Abbuchung
 * sofort im Warteraum, obwohl es sieben Tage lang vollwertig bleiben soll
 * (Mahnsystem wie MoonTrading, `config/zahlung.ts`), und `is_paid` allein
 * übersah, dass eine Pause den Zugang bis zum Periodenende weiterlaufen lässt.
 *
 * Jetzt: Zugang laut `evaluateAccess()` (Stufe plus `access_until`) heisst
 * Mitgliederrolle, sonst keine. Ein laufender Aufschub zählt als Zugang.
 *
 * ── Den Warteraum setzt dieser Abgleich nicht als Soll ──────────────────────
 *
 * Wer keinen Zugang hat, soll die Mitgliederrolle nicht tragen — ob er
 * zusätzlich im Warteraum sitzt, entscheidet `inDenWarteraum`
 * (`lib/discord/warteraum.ts`). Eine vorhandene Warteraumrolle ist deshalb
 * mit dem Soll „none" vereinbar und wird hier **nie** entzogen, ausser jemand
 * hat wieder Zugang. Sonst räumte jeder Abgleich den Warteraum leer.
 */
export function computeDesiredRoleState(params: {
  membershipTier: string | null;
  isPaid: boolean;
  accessUntil: string | null;
  aufschub?: boolean;
}): DesiredRoleState {
  if (params.aufschub) return "regular";
  const zugang = evaluateAccess({
    membership_tier: (params.membershipTier ?? "free") as AccessTier,
    is_paid: params.isPaid,
    access_until: params.accessUntil,
  }).hasAccess;
  return zugang ? "regular" : "none";
}

/**
 * Bestandsabgleich: Soll (Datenbank) gegen Ist (Discord), und bei `apply` die
 * Abweichungen beheben.
 *
 * - Zugang, aber keine Mitgliederrolle (oder im Warteraum) → Rolle geben,
 *   Warteraum abnehmen. Das Netz für einen Webhook, der einmal ausblieb.
 * - Kein Zugang, aber Mitgliederrolle → Rolle nehmen und, mit
 *   `warteraumSetzen`, in den Warteraum. Das deckt die Fälle ab, für die es
 *   kein Stripe-Ereignis gibt: das Ende einer Pause am Periodenende, oder ein
 *   Zugang, der vor diesem System endete.
 *
 * ── Die Obergrenze beim Entzug ──────────────────────────────────────────────
 *
 * Mit `maxEntzug` wird **niemandem** etwas genommen, sobald mehr Entzüge
 * anstünden als erlaubt — Zurückgeben läuft trotzdem. Die Grenze schützt nicht
 * gegen falsche Regeln, sondern gegen falsche Daten: Käme `access_until` einmal
 * leer zurück, sähe jedes Mitglied aus wie ausgelaufen.
 *
 * Verknüpfte Konten aus **beiden** Quellen (`discord_connections` und
 * `profiles.discord_id`). Jeder Lauf schreibt eine Zeile in `discord_sync_log`.
 */
export async function reconcileDiscordRoles({
  apply,
  triggeredBy,
  maxEntzug,
  warteraumSetzen = false,
}: {
  apply: boolean;
  triggeredBy: "admin" | "script";
  maxEntzug?: number;
  warteraumSetzen?: boolean;
}): Promise<ReconcileResult> {
  const roleId = mitgliedsRolleId();
  if (!discordBotConfigured() || !roleId) {
    throw new Error(
      "DISCORD_GUILD_ID / DISCORD_BOT_TOKEN / DISCORD_ROLE_ID müssen gesetzt sein, um den Bestand abzugleichen.",
    );
  }
  const warteraumId = warteraumRolleId();

  const service = createServiceClient();

  const [verbindungRes, profilRes, aufschubRes] = await Promise.all([
    service.from("discord_connections").select("user_id, discord_user_id"),
    service
      .from("profiles")
      .select("id, membership_tier, is_paid, access_until, discord_id")
      .not("discord_id", "is", null),
    service
      .from("zahlungsfall")
      .select("user_id")
      .eq("status", "aufschub")
      .gt("aufschub_bis", new Date().toISOString()),
  ]);

  if (verbindungRes.error) throw new Error(`discord_connections laden fehlgeschlagen: ${verbindungRes.error.message}`);
  if (profilRes.error) throw new Error(`profiles laden fehlgeschlagen: ${profilRes.error.message}`);
  /*
    Ein Aufschub-Abruf, der scheitert, ist nicht dasselbe wie „keine Aufschübe":
    Er nähme genau den Menschen die Rolle, denen etwas zugesagt wurde. Fehlt die
    Tabelle (Migration 080), gibt es dagegen wirklich keine.
  */
  if (aufschubRes.error && aufschubRes.error.code !== "PGRST205" && aufschubRes.error.code !== "42P01") {
    throw new Error(`zahlungsfall laden fehlgeschlagen: ${aufschubRes.error.message}`);
  }

  const mitAufschub = new Set(((aufschubRes.data ?? []) as Array<{ user_id: string }>).map((z) => z.user_id));

  type ProfilZeile = {
    id: string;
    membership_tier: string | null;
    is_paid: boolean | null;
    access_until: string | null;
    discord_id: string | null;
  };
  const profile = new Map(((profilRes.data ?? []) as ProfilZeile[]).map((p) => [p.id, p]));

  // Verknüpfung je Konto: `discord_connections` zuerst, dann das Profil.
  const verknuepft = new Map<string, string>();
  for (const p of profile.values()) if (p.discord_id) verknuepft.set(p.id, p.discord_id);
  for (const v of (verbindungRes.data ?? []) as Array<{ user_id: string; discord_user_id: string }>) {
    if (v.discord_user_id) verknuepft.set(v.user_id, v.discord_user_id);
  }

  // Profile, die nur über `discord_connections` verknüpft sind, nachladen.
  const fehlend = [...verknuepft.keys()].filter((id) => !profile.has(id));
  if (fehlend.length > 0) {
    const { data, error } = await service
      .from("profiles")
      .select("id, membership_tier, is_paid, access_until, discord_id")
      .in("id", fehlend);
    if (error) throw new Error(`profiles nachladen fehlgeschlagen: ${error.message}`);
    for (const p of (data ?? []) as ProfilZeile[]) profile.set(p.id, p);
  }

  if (verknuepft.size === 0) {
    return writeLogAndReturn(service, {
      apply,
      triggeredBy,
      checkedCount: 0,
      fixedCount: 0,
      entzugGeplant: 0,
      details: [],
    });
  }

  // Wirft bei jedem Fehler — eine halbe Mitgliederliste sähe aus wie eine ganze.
  const mitglieder = await listGuildMembers();
  const rollenJeMitglied = new Map(mitglieder.map((m) => [m.id, m.roles]));

  const details: ReconcileDetail[] = [];
  const zurueck: ReconcileDetail[] = [];
  const entzug: ReconcileDetail[] = [];

  for (const [userId, discordUserId] of verknuepft) {
    const p = profile.get(userId);
    const desired = computeDesiredRoleState({
      membershipTier: p?.membership_tier ?? null,
      isPaid: Boolean(p?.is_paid),
      accessUntil: p?.access_until ?? null,
      aufschub: mitAufschub.has(userId),
    });

    const roles = rollenJeMitglied.get(discordUserId);
    if (!roles) {
      details.push({
        userId,
        discordUserId,
        desired,
        actual: "not_in_guild",
        fixed: false,
        note: "Nicht (mehr) auf dem Discord-Server.",
      });
      continue;
    }

    const actual: ActualRoleState = roles.includes(roleId)
      ? "regular"
      : warteraumId && roles.includes(warteraumId)
        ? "waiting_room"
        : "none";

    const zeile: ReconcileDetail = { userId, discordUserId, desired, actual, fixed: false };
    details.push(zeile);

    if (desired === "regular" && actual !== "regular") zurueck.push(zeile);
    else if (desired === "none" && actual === "regular") entzug.push(zeile);
  }

  let entzugAusgesetzt: string | undefined;
  if (maxEntzug !== undefined && entzug.length > maxEntzug) {
    entzugAusgesetzt =
      `${entzug.length} Mitgliedern würde die Rolle genommen, erlaubt sind ${maxEntzug} je Lauf. ` +
      "Es wurde niemandem etwas genommen. Das ist fast immer ein Datenfehler (etwa leeres access_until), " +
      "keine echte Abwanderung — bitte die Liste im Admin unter Discord prüfen.";
    for (const z of entzug) z.note = "Entzug ausgesetzt (Obergrenze überschritten).";
  }

  let fixedCount = 0;
  if (apply) {
    for (const z of zurueck) {
      try {
        await setzeMitgliedsrolle(z.discordUserId, true);
        z.fixed = true;
        fixedCount++;
      } catch (err) {
        z.note = err instanceof Error ? err.message : "Rolle nicht setzbar.";
      }
    }

    if (!entzugAusgesetzt) {
      const { inDenWarteraum } = await import("@/lib/discord/warteraum");
      for (const z of entzug) {
        try {
          await setzeMitgliedsrolle(z.discordUserId, false);
          z.fixed = true;
          fixedCount++;
          if (warteraumSetzen) {
            const drin = await inDenWarteraum(service, z.userId, "Bestandsabgleich, Zugang abgelaufen");
            if (drin) z.note = "Rolle entzogen, Warteraum gesetzt.";
          }
        } catch (err) {
          z.note = err instanceof Error ? err.message : "Rolle nicht entziehbar.";
        }
      }
    }
  }

  return writeLogAndReturn(service, {
    apply,
    triggeredBy,
    checkedCount: verknuepft.size,
    fixedCount,
    entzugGeplant: entzug.length,
    entzugAusgesetzt,
    details,
  });
}

async function writeLogAndReturn(
  service: ReturnType<typeof createServiceClient>,
  params: ReconcileResult & { triggeredBy: "admin" | "script" },
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

  return {
    apply,
    checkedCount,
    fixedCount,
    entzugGeplant: params.entzugGeplant,
    entzugAusgesetzt: params.entzugAusgesetzt,
    details,
  };
}
