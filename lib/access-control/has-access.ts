import { createServiceClient } from "@/lib/supabase/service";

export type AccessReason =
  | "lifetime"
  | "subscription_active"
  | "subscription_grace"
  | "subscription_cancel_pending"
  | "subscription_expired"
  | "free_tier"
  | "ht_1on1"
  | "no_profile"
  | "unknown";

/** Jede Stufe, die ein Profil tragen kann — auch die nicht mehr verkäufliche. */
export type AccessTier =
  | "free"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "lifetime"
  | "ht_1on1";

/**
 * Die wiederkehrend abgerechneten Stufen.
 *
 * „Vierteljährlich" und „Jährlich" sind Abrechnungsintervalle desselben
 * Produkts, keine eigenen Leistungen — sie gehören in jede Prüfung, die
 * `monthly` durchlässt. Genau das fehlte hier bis zum 17.09.2026: Beide
 * fielen in den Default am Ende und wurden wie `free` behandelt, womit
 * Quartals- und Jahresmitglieder aus dem Trading Journal flogen.
 */
const RECURRING_TIERS: ReadonlySet<AccessTier> = new Set([
  "monthly",
  "quarterly",
  "yearly",
]);

export interface AccessResult {
  hasAccess: boolean;
  tier: AccessTier;
  reason: AccessReason;
  accessUntil: Date | null;
}

interface ProfileRow {
  membership_tier: AccessTier | null;
  is_paid: boolean | null;
  access_until: string | null;
}

/**
 * Zentrale Access-Control-Funktion.
 *
 * Wahrheits-Tabelle:
 *
 *   tier=lifetime                  → access=true,  reason=lifetime, until=null
 *   tier=ht_1on1                   → access=true,  reason=ht_1on1
 *   tier=monthly|quarterly|yearly
 *        + until>now()             → access=true,  reason=subscription_active
 *        + until<=now()            → access=false, reason=subscription_expired
 *   tier=free                      → access=false, reason=free_tier
 *
 * `subscription_grace` deckt zwei Fälle:
 *   - 48h-Grace nach payment_failed (access_until = now()+48h)
 *   - cancel_at_period_end=true (access_until = period_end, Subscription
 *     läuft noch bis dahin)
 *
 * Da wir die Subscription-Row für die Granular-Differenzierung lesen müssten
 * und das eine zusätzliche Query kostet, nutzen `subscription_active` für alles
 * mit access_until in der Zukunft. UI/Cron können bei Bedarf separat
 * anhand `cancel_at_period_end` differenzieren.
 */
export async function hasActivePaidAccess(
  userId: string,
): Promise<AccessResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("membership_tier,is_paid,access_until")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      hasAccess: false,
      tier: "free",
      reason: "no_profile",
      accessUntil: null,
    };
  }

  return evaluateAccess(data as ProfileRow);
}

/**
 * Synchroner Helper für Codepfade, die das Profil bereits geladen haben
 * (z. B. `proxy.ts` mit existierendem Profil-Select).
 */
export function evaluateAccess(profile: ProfileRow): AccessResult {
  const tier = (profile.membership_tier ?? "free") as AccessTier;
  const accessUntil = profile.access_until ? new Date(profile.access_until) : null;

  if (tier === "lifetime") {
    return {
      hasAccess: true,
      tier: "lifetime",
      reason: "lifetime",
      accessUntil: null,
    };
  }

  if (tier === "ht_1on1") {
    return {
      hasAccess: true,
      tier: "ht_1on1",
      reason: "ht_1on1",
      accessUntil,
    };
  }

  if (RECURRING_TIERS.has(tier)) {
    if (!accessUntil) {
      return {
        hasAccess: false,
        tier,
        reason: "subscription_expired",
        accessUntil: null,
      };
    }
    const now = new Date();
    if (accessUntil > now) {
      return {
        hasAccess: true,
        tier,
        reason: "subscription_active",
        accessUntil,
      };
    }
    return {
      hasAccess: false,
      tier,
      reason: "subscription_expired",
      accessUntil,
    };
  }

  return {
    hasAccess: false,
    tier: "free",
    reason: "free_tier",
    accessUntil,
  };
}
