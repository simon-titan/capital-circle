import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";

/**
 * Service-Role-Client-Typ. Wir verwenden bewusst `SupabaseClient` ohne
 * `Database`-Generic, weil unsere Tabellen-Types unter `[key: string]`
 * generisch deklariert sind und PostgREST sonst engere Insert/Update-Typen
 * fordert als nötig.
 */
export type WebhookSupabase = SupabaseClient;

export interface ProfileLookup {
  id: string;
  full_name: string | null;
  username: string | null;
  membership_tier: string | null;
  payment_failed_email_1_sent_at: string | null;
}

/**
 * Profil über `stripe_customer_id` laden. Webhook-Handler nutzen das, weil
 * Stripe-Events (Subscription, Invoice) die `customer`-ID liefern, nicht die
 * interne `user_id`.
 *
 * Hinweis: `profiles` enthält keine `email`-Spalte — die Auth-Email lebt in
 * `auth.users`. Für Mail-Versand `loadAuthEmail()` separat aufrufen.
 */
export async function loadProfileByCustomerId(
  supabase: WebhookSupabase,
  customerId: string,
): Promise<ProfileLookup | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,full_name,username,membership_tier,payment_failed_email_1_sent_at",
    )
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `loadProfileByCustomerId(${customerId}) failed: ${error.message}`,
    );
  }
  return (data as ProfileLookup | null) ?? null;
}

export async function loadProfileByUserId(
  supabase: WebhookSupabase,
  userId: string,
): Promise<ProfileLookup | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,full_name,username,membership_tier,payment_failed_email_1_sent_at",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`loadProfileByUserId(${userId}) failed: ${error.message}`);
  }
  return (data as ProfileLookup | null) ?? null;
}

/**
 * Konto für einen Gast-Checkout anlegen — oder das bestehende wiederfinden.
 *
 * Der Kaufweg über `/go/<plan>` hat keinen vorgelagerten Login: Der erste
 * Kontakt mit dem System ist die Zahlung. Das Konto entsteht deshalb hier, im
 * Webhook, aus der E-Mail, die der Käufer bei Stripe eingegeben hat. Die
 * `profiles`-Zeile legt der Trigger `on_auth_user_created` (Migration 003) an.
 *
 * Idempotent über die E-Mail: Kauft jemand ein zweites Mal oder rüstet ein
 * bestehendes Free-Mitglied auf, liefert die Funktion das vorhandene Konto
 * zurück. `isNew` steuert im Aufrufer, ob eine Willkommensmail mit
 * Passwort-Link rausgeht — eine zweite wäre für den Kunden verwirrend und für
 * ein bestehendes Passwort schlicht falsch.
 */
export async function getOrCreateUserByEmail(
  supabase: WebhookSupabase,
  email: string,
): Promise<{ userId: string; isNew: boolean }> {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (!createError && created.user) {
    return { userId: created.user.id, isNew: true };
  }

  // „already registered" o. Ä. → bestehendes Konto anhand der E-Mail suchen.
  const existingUserId = await findeUserIdZuEmail(supabase, email);
  if (!existingUserId) {
    throw new Error(
      `getOrCreateUserByEmail(${email}) fehlgeschlagen: ${createError?.message ?? "Konto weder anlegbar noch auffindbar"}`,
    );
  }
  return { userId: existingUserId, isNew: false };
}

/**
 * Auth-Email aus `auth.users` laden. Erfordert Service-Role-Client.
 */
export async function loadAuthEmail(
  supabase: WebhookSupabase,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    return null;
  }
  return data.user?.email ?? null;
}

/**
 * Stripe-API-Version `2025-09-30.clover` hat `current_period_start/end` von
 * `Stripe.Subscription` auf `Stripe.SubscriptionItem` verschoben. Dieser
 * Helper liest die Werte aus dem ersten Item; Fallback auf die alten Felder,
 * falls das SDK-Type-Shape sie noch unterstützt (für ältere API-Versions).
 */
export function extractCurrentPeriod(sub: Stripe.Subscription): {
  startISO: string;
  endISO: string;
} {
  const subWithLegacy = sub as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const item = sub.items?.data?.[0];
  const itemWithPeriod = item as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number;
        current_period_end?: number;
      })
    | undefined;

  const startUnix =
    itemWithPeriod?.current_period_start ?? subWithLegacy.current_period_start;
  const endUnix =
    itemWithPeriod?.current_period_end ?? subWithLegacy.current_period_end;

  if (typeof startUnix !== "number" || typeof endUnix !== "number") {
    throw new Error(
      `Subscription ${sub.id} hat keine current_period_start/end Felder`,
    );
  }

  return {
    startISO: unixToISO(startUnix),
    endISO: unixToISO(endUnix),
  };
}

export function unixToISO(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

/**
 * Bevorzugte Stripe-`price.id` aus dem Subscription-Item extrahieren.
 */
export function extractPriceId(sub: Stripe.Subscription): string {
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) {
    throw new Error(`Subscription ${sub.id} hat keine price.id im ersten Item`);
  }
  return priceId;
}

/**
 * Customer-ID aus Stripe-Object (Subscription, Invoice, Checkout-Session)
 * extrahieren. Stripe liefert `customer` entweder als String oder als
 * expandiertes Objekt — wir wollen immer den String.
 */
export function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return customer.id;
}

/**
 * "Vorname" für Email-Templates: `full_name` → erstes Token, Fallback auf
 * `username`, dann `"da"` (kleine, freundliche Default-Anrede).
 */
export function pickFirstName(profile: ProfileLookup | null): string {
  const full = profile?.full_name?.trim();
  if (full) {
    const first = full.split(/\s+/)[0];
    if (first) return first;
  }
  const username = profile?.username?.trim();
  if (username) return username;
  return "da";
}
