import { createServiceClient } from "@/lib/supabase/server";
import { discordBotConfigured, listGuildMembers } from "@/lib/discord/api";
import { hatZugang, mitgliedsRolleId, setzeMitgliedsrolle, warteraumRolleId } from "@/lib/discord/mitgliedschaft";

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
 * (Mahnsystem wie MoonTrading, `config/zahlung.ts`).
 *
 * Jetzt: Zugang laut `hatZugang()` — `is_paid` oder Admin, dieselbe Regel wie
 * bei den Inhalten (`lib/discord/mitgliedschaft.ts` erklärt, warum nicht
 * `evaluateAccess()`: Der Whop-Altbestand steht auf `free` mit `is_paid`).
 * Ein laufender Aufschub zählt ebenfalls als Zugang.
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
  isPaid: boolean;
  isAdmin?: boolean;
  aufschub?: boolean;
}): DesiredRoleState {
  if (params.aufschub) return "regular";
  return hatZugang({ is_paid: params.isPaid, is_admin: params.isAdmin ?? false }) ? "regular" : "none";
}

/**
 * Bestandsabgleich: Soll (Datenbank) gegen Ist (Discord), und bei `apply` die
 * Abweichungen beheben.
 *
 * - Zugang, aber keine Mitgliederrolle (oder im Warteraum) → Rolle geben,
 *   Warteraum abnehmen. Das Netz für einen Webhook, der einmal ausblieb.
 * - Kein Zugang, aber Mitgliederrolle → Rolle nehmen und, mit
 *   `warteraumSetzen`, in den Warteraum. Das Netz für einen Entzug, der im
 *   Webhook an Discord scheiterte. **Nur mit Enddatum** (`access_until`
 *   gesetzt): Wer die Rolle trägt, ohne dass hier je ein Zugang beendet wurde,
 *   wird nicht angefasst (siehe unten).
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
  ohneProtokoll = false,
  zurueckNurAusWarteraum = false,
}: {
  apply: boolean;
  triggeredBy: "admin" | "script";
  maxEntzug?: number;
  warteraumSetzen?: boolean;
  /** Keine Zeile in `discord_sync_log` — für Probeläufe, die nichts schreiben dürfen. */
  ohneProtokoll?: boolean;
  /**
   * Die Rolle nur denen zurückgeben, die im Warteraum sitzen (der Nachtlauf).
   * Wer Zugang hat, aber weder Mitglieder- noch Warteraumrolle trägt, hat die
   * Rolle vielleicht bewusst nicht (von Hand entzogen, anderer Weg). Das
   * entscheidet ein Mensch über den Knopf im Admin, nicht die Nacht.
   */
  zurueckNurAusWarteraum?: boolean;
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
      .select("id, is_paid, is_admin, access_until, discord_id")
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
    is_paid: boolean | null;
    is_admin: boolean | null;
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
      .select("id, is_paid, is_admin, access_until, discord_id")
      .in("id", fehlend);
    if (error) throw new Error(`profiles nachladen fehlgeschlagen: ${error.message}`);
    for (const p of (data ?? []) as ProfilZeile[]) profile.set(p.id, p);
  }

  if (verknuepft.size === 0) {
    return writeLogAndReturn(service, {
      apply,
      triggeredBy,
      ohneProtokoll,
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
      isPaid: Boolean(p?.is_paid),
      isAdmin: Boolean(p?.is_admin),
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

    if (desired === "regular" && actual !== "regular") {
      if (!zurueckNurAusWarteraum || actual === "waiting_room") zurueck.push(zeile);
      else zeile.note = "Zugang ohne Mitgliederrolle — der Nachtlauf gibt sie nur aus dem Warteraum zurück.";
    } else if (desired === "none" && actual === "regular") {
      /*
        ── Ohne Enddatum kein Entzug ──────────────────────────────────────────

        Entzogen wird nur, wessen Zugang nachweislich **an einem Datum**
        geendet hat (`access_until` gesetzt). Das ist eine zweite Sicherung
        neben `is_paid`: Wer die Mitgliederrolle trägt, ohne dass dieses
        System je einen Zugang für ihn beendet hat (Rolle von Hand, aus der
        Whop-Zeit), wird nicht angefasst. Jede Stelle, die einen Zugang
        beendet, setzt ein Datum.
      */
      if (p?.access_until) entzug.push(zeile);
      else zeile.note = "Kein Enddatum im Profil — Rolle stammt nicht aus einem Stripe-Zugang, bleibt unangetastet.";
    }
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
    ohneProtokoll,
    checkedCount: verknuepft.size,
    fixedCount,
    entzugGeplant: entzug.length,
    entzugAusgesetzt,
    details,
  });
}

async function writeLogAndReturn(
  service: ReturnType<typeof createServiceClient>,
  params: ReconcileResult & { triggeredBy: "admin" | "script"; ohneProtokoll: boolean },
): Promise<ReconcileResult> {
  const { apply, triggeredBy, checkedCount, fixedCount, details } = params;

  if (!params.ohneProtokoll) {
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
