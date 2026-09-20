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
 *   1. Wer bereits Lifetime hat oder im 1:1-Mentoring ist, sieht es nicht —
 *      beiden würde man etwas verkaufen, das sie schon haben.
 *   2. Kaufen darf, wer **zahlt oder je gezahlt hat** — seit dem Whop-Umzug
 *      (20.09.2026) zählt auch, wer bei Whop gezahlt hat und importiert wurde
 *      (`profiles.whop_umzug_am`, Migration 100); davon steht in
 *      `subscriptions`/`payments` nichts. Im Einzelnen: ein laufendes Abo
 *      (monatlich, vierteljährlich, jährlich) oder — seit 19.09.2026 — eine
 *      Stripe-Vergangenheit (ein Abo in `subscriptions`, gleich welcher
 *      Status, oder eine erfolgreiche Zahlung in `payments`). Entscheidung
 *      Simon: Lifetime darf auch Gekündigten und Mitgliedern mit
 *      ausgefallener Zahlung angeboten werden (Mahnung, Warteraum, Abschied,
 *      Rückgewinnung). Wer **nie** gezahlt hat, sieht es weiterhin nicht:
 *      Lifetime ist kein Einstiegsprodukt, es gibt keinen öffentlichen Preis.
 *   3. Globaler Schalter an → alle aus Punkt 2 sehen das Angebot. Das ist der
 *      Normalfall und der Auslieferungszustand (Migration 071).
 *   4. Globaler Schalter aus → nur wer in einer Freischalt-Gruppe steht,
 *      etwa ein später importiertes Segment wie `whop-import-2026`.
 */

export const LIFETIME_SETTINGS_KEY = "lifetime_offer_enabled";

/** Aus diesen Stufen heraus ist der Kauf möglich. */
const ZAHLENDE_ABOS: ReadonlySet<string> = new Set(["monthly", "quarterly", "yearly"]);

/**
 * Lifetime steht erst ab einem Monat Mitgliedschaft zur Wahl. Begründung
 * steht bei der Prüfung weiter unten.
 */
export const LIFETIME_MINDESTTAGE = 30;

export type LifetimeGrund =
  | "erlaubt"
  | "zu_jung"
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
  /**
   * `true`, wenn der Kauf über die Stripe-Vergangenheit erlaubt ist und nicht
   * über ein laufendes Abo — die Karte sagt dann nichts über „dein laufendes
   * Abo endet automatisch".
   */
  ehemalig?: boolean;
}

/**
 * Hat dieses Konto je über Stripe gezahlt oder ein Abo gehabt?
 *
 * Ein Abo in `subscriptions` (gleich welcher Status — auch `incomplete` einer
 * ersten, gescheiterten Zahlung zählt als „ausgefallenes zahlendes Mitglied")
 * oder eine erfolgreiche Zahlung in `payments`. Bei einem Lesefehler `false`:
 * Ein nicht gezeigtes Angebot kostet nichts.
 */
async function hatStripeVergangenheit(supabase: ReturnType<typeof createServiceClient>, userId: string): Promise<boolean> {
  const [aboRes, zahlungRes] = await Promise.all([
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "succeeded"),
  ]);
  if (aboRes.error || zahlungRes.error) return false;
  return (aboRes.count ?? 0) > 0 || (zahlungRes.count ?? 0) > 0;
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

  /*
    `whop_umzug_am` kommt erst mit Migration 100. Solange sie nicht eingespielt
    ist, antwortet PostgREST auf die Spalte mit einem Fehler — und der sähe
    hier aus wie „kein Profil", womit die Lifetime-Karte für **alle**
    verschwände, bis jemand den Zusammenhang findet. Deshalb ein zweiter
    Versuch ohne die Spalte; dieselbe Vorsichtsmassnahme wie in
    `app/api/admin/users/route.ts` für `lifetime_offer_group`.
  */
  const SPALTEN = "membership_tier,access_until,lifetime_offer_group,created_at";
  let { data, error } = await supabase
    .from("profiles")
    .select(`${SPALTEN},whop_umzug_am`)
    .eq("id", userId)
    .maybeSingle();

  if (error && /whop_umzug_am|does not exist|schema cache/i.test(error.message)) {
    ({ data, error } = await supabase.from("profiles").select(SPALTEN).eq("id", userId).maybeSingle());
  }

  if (error || !data) return { erlaubt: false, grund: "kein_profil", gruppe: null };

  const profil = data as {
    membership_tier: string | null;
    access_until: string | null;
    lifetime_offer_group: string | null;
    created_at?: string | null;
    whop_umzug_am?: string | null;
  };
  const gruppe = profil.lifetime_offer_group?.trim() || null;
  const tier = profil.membership_tier ?? "free";

  if (tier === "lifetime" || tier === "ht_1on1") {
    return { erlaubt: false, grund: "hat_bereits_lifetime", gruppe };
  }

  const bis = profil.access_until ? new Date(profil.access_until) : null;
  const aboLaeuft = ZAHLENDE_ABOS.has(tier) && Boolean(bis && !Number.isNaN(bis.getTime()) && bis > new Date());

  let ehemalig = false;
  if (!aboLaeuft) {
    /*
      Gekündigt, ausgelaufen, gesperrt oder pausiert: erlaubt, wenn je gezahlt.

      „Je gezahlt" heisst seit dem Whop-Umzug (20.09.2026) nicht mehr nur „bei
      Stripe gezahlt". Die 29 umgezogenen Mitglieder haben bezahlt — nur eben
      bei Whop, und davon steht in `subscriptions` und `payments` nichts. Ohne
      diese Zeile stünde in Mail 1 des Umzugs ein Lifetime-Angebot, dessen
      Karte nach dem Anmelden gar nicht erscheint; der Kaufknopf liefe in den
      `kein_zahlendes_abo`-Zweig der Kasse.

      Sie stehen bewusst auf `ehemalig`, auch solange ihr Whop-Zeitraum noch
      läuft: Das Feld sagt „hier endet kein laufendes Abo automatisch", und
      genau so ist es — ihr Abo liegt bei einem Anbieter, den wir nicht
      steuern, und sie müssen es selbst kündigen.
    */
    const ausWhopUmzug = Boolean(profil.whop_umzug_am);
    if (!ausWhopUmzug && !(await hatStripeVergangenheit(supabase, userId))) {
      return {
        erlaubt: false,
        grund: ZAHLENDE_ABOS.has(tier) ? "abo_abgelaufen" : "kein_zahlendes_abo",
        gruppe,
      };
    }
    ehemalig = true;
  }

  /*
    Erst nach einem Monat Mitgliedschaft (Entscheidung Simon, 20.09.2026).

    Wer gerade erst gekauft hat, bekommt sonst zwei Tage später ein Angebot,
    das seinen frischen Kauf wie einen Fehler aussehen lässt. Die Wartezeit
    lag vorher auf dem Jahreswechsel; der steht jetzt ohne Sperre in der
    Paketreihe, und die Zeit gilt dafür hier.

    Gemessen am Konto (`profiles.created_at`), nicht am Abo: Lifetime löst
    kein Paket ab, es ersetzt die Mitgliedschaft als Ganzes.

    Ehemalige und die aus dem Whop-Umzug sind ausgenommen: Sie sind seit
    Langem dabei, ihr Konto bei uns ist nur neu.
  */
  if (!ehemalig) {
    const seit = profil.created_at ? new Date(profil.created_at) : null;
    const tage = seit && !Number.isNaN(seit.getTime())
      ? Math.floor((Date.now() - seit.getTime()) / 86_400_000)
      : null;
    if (tage !== null && tage < LIFETIME_MINDESTTAGE) {
      return { erlaubt: false, grund: "zu_jung", gruppe, ehemalig };
    }
  }

  if (await istLifetimeGlobalOffen()) {
    return { erlaubt: true, grund: "erlaubt", gruppe, ehemalig };
  }

  if (gruppe) return { erlaubt: true, grund: "erlaubt", gruppe, ehemalig };

  return { erlaubt: false, grund: "nicht_freigeschaltet", gruppe };
}
