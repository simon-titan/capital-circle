import { createServiceClient } from "@/lib/supabase/service";

export type AccessReason =
  | "lifetime"
  | "monthly_active"
  | "monthly_grace"
  | "monthly_cancel_pending"
  | "monthly_expired"
  | "free_tier"
  | "ht_1on1"
  | "no_profile"
  | "unknown";

export interface AccessResult {
  hasAccess: boolean;
  tier: "free" | "monthly" | "lifetime" | "ht_1on1";
  reason: AccessReason;
  accessUntil: Date | null;
}

interface ProfileRow {
  membership_tier: "free" | "monthly" | "lifetime" | "ht_1on1" | null;
  is_paid: boolean | null;
  access_until: string | null;
}

/**
 * Zentrale Access-Control-Funktion.
 *
 * Wahrheits-Tabelle:
 *
 *   tier=lifetime              → access=true,  reason=lifetime, until=null
 *   tier=ht_1on1               → access=true,  reason=ht_1on1
 *   tier=monthly + until>now() → access=true,  reason=monthly_active|monthly_grace
 *   tier=monthly + until<=now()→ access=false, reason=monthly_expired
 *   tier=free                  → access=false, reason=free_tier
 *
 * `monthly_grace` deckt zwei Fälle:
 *   - 48h-Grace nach payment_failed (access_until = now()+48h)
 *   - cancel_at_period_end=true (access_until = period_end, Subscription
 *     läuft noch bis dahin)
 *
 * Da wir die Subscription-Row für die Granular-Differenzierung lesen müssten
 * und das eine zusätzliche Query kostet, nutzen `monthly_active` für alles
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
  const tier = (profile.membership_tier ?? "free") as AccessResult["tier"];
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

  if (tier === "monthly") {
    if (!accessUntil) {
      return {
        hasAccess: false,
        tier: "monthly",
        reason: "monthly_expired",
        accessUntil: null,
      };
    }
    const now = new Date();
    if (accessUntil > now) {
      return {
        hasAccess: true,
        tier: "monthly",
        reason: "monthly_active",
        accessUntil,
      };
    }
    return {
      hasAccess: false,
      tier: "monthly",
      reason: "monthly_expired",
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
