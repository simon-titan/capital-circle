import { lifetimePriceId } from "@/lib/stripe/plan-map";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Wer darf Lifetime kaufen?
 *
 * Die Regel steht hier, damit Seite und Kasse dieselbe Antwort geben. Die
 * Karte auszublenden reicht nicht: Wer die Kasse direkt aufruft, käme sonst
 * an ein Angebot, das ihm nie gezeigt wurde.
 *
 * In dieser Reihenfolge:
 *   1. Ohne aktives, zahlendes Abo sieht es niemand. Lifetime ist kein
 *      Einstiegsprodukt — es gibt keinen öffentlichen Preis und keinen Link
 *      von der Landingpage.
 *   2. Globaler Schalter an → jedes zahlende Mitglied sieht das Angebot.
 *      Das ist der Normalfall und der Auslieferungszustand (Migration 071).
 *   3. Globaler Schalter aus → nur wer in einer Freischalt-Gruppe steht,
 *      etwa ein später importiertes Segment wie `whop-import-2026`.
 *
 * Wer bereits Lifetime hat oder im 1:1-Mentoring ist, sieht es ebenfalls
 * nicht — beiden würde man etwas verkaufen, das sie schon haben.
 */

export const LIFETIME_SETTINGS_KEY = "lifetime_offer_enabled";

/** Aus diesen Stufen heraus ist der Kauf möglich. */
const ZAHLENDE_ABOS: ReadonlySet<string> = new Set(["monthly", "quarterly", "yearly"]);

export type LifetimeGrund =
  | "erlaubt"
  | "kein_profil"
  | "kein_zahlendes_abo"
  | "abo_abgelaufen"
  | "hat_bereits_lifetime"
  | "nicht_freigeschaltet"
  | "kein_preis";

export interface LifetimeAngebot {
  erlaubt: boolean;
  grund: LifetimeGrund;
  /** Die Gruppe, über die der Nutzer freigeschaltet ist (null = über den globalen Schalter). */
  gruppe: string | null;
}

/** Globaler Schalter aus `app_settings`. Fehlt die Zeile, gilt „an" — so liefert 071 aus. */
export async function istLifetimeGlobalOffen(): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", LIFETIME_SETTINGS_KEY)
    .maybeSingle();

  if (error || !data) return true;
  const value = (data as { value: { enabled?: unknown } | null }).value;
  if (!value || typeof value !== "object" || !("enabled" in value)) return true;
  return Boolean(value.enabled);
}

/**
 * Vollständige Prüfung für einen Nutzer. Liest Profil und Schalter selbst,
 * damit Aufrufer nichts vergessen können.
 */
export async function pruefeLifetimeAngebot(userId: string): Promise<LifetimeAngebot> {
  /*
    Ohne hinterlegten Preis gibt es das Angebot nicht — und zwar an dieser
    Stelle, vor jeder Datenbankfrage: Die Karte würde sonst zwar erscheinen,
    ihr Knopf aber in einen 500er der Kasse laufen (`config_missing`). Gefragt
    wird über `lifetimePriceId()` statt über `process.env`, damit der Name der
    Variablen nur an einer Stelle steht; wer ihn umbenennt, findet sonst diese
    hier nicht und schaltet das Angebot stillschweigend ab.
  */
  if (!lifetimePriceId()) {
    return { erlaubt: false, grund: "kein_preis", gruppe: null };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("membership_tier,access_until,lifetime_offer_group")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return { erlaubt: false, grund: "kein_profil", gruppe: null };

  const profil = data as {
    membership_tier: string | null;
    access_until: string | null;
    lifetime_offer_group: string | null;
  };
  const gruppe = profil.lifetime_offer_group?.trim() || null;
  const tier = profil.membership_tier ?? "free";

  if (tier === "lifetime" || tier === "ht_1on1") {
    return { erlaubt: false, grund: "hat_bereits_lifetime", gruppe };
  }
  if (!ZAHLENDE_ABOS.has(tier)) {
    return { erlaubt: false, grund: "kein_zahlendes_abo", gruppe };
  }

  const bis = profil.access_until ? new Date(profil.access_until) : null;
  if (!bis || Number.isNaN(bis.getTime()) || bis <= new Date()) {
    return { erlaubt: false, grund: "abo_abgelaufen", gruppe };
  }

  if (await istLifetimeGlobalOffen()) {
    return { erlaubt: true, grund: "erlaubt", gruppe };
  }

  if (gruppe) return { erlaubt: true, grund: "erlaubt", gruppe };

  return { erlaubt: false, grund: "nicht_freigeschaltet", gruppe };
}
