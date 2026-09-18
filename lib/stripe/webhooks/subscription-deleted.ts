import type Stripe from "stripe";
import { sendCancellationSurvey } from "@/lib/email/templates/cancellation-survey";
import { removeGuildMemberRole } from "@/lib/discord/roles";
import {
  loadAuthEmail,
  loadProfileByCustomerId,
  pickFirstName,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `customer.subscription.deleted`
 *
 * Tritt am Periodenende ein, nachdem im Portal gekündigt wurde — oder sofort,
 * wenn Stripe-Admin die Subscription killt. Ablauf:
 *   1. `subscriptions.status='canceled'`, `canceled_at=now()`
 *   2. Profil zurück auf `free`, `is_paid=false`, `access_until=now()`
 *   3. Cancellation-Survey (idempotent über `email_sequence_log`)
 *   4. `cancellations`-Row als Vorlage für Offboarding-Survey
 */
export async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  supabase: WebhookSupabase,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    throw new Error(`Subscription ${sub.id} ohne customer-ID`);
  }

  const profile = await loadProfileByCustomerId(supabase, customerId);
  if (!profile) {
    console.warn(
      `[stripe-webhook] subscription.deleted: Kein Profil für customer=${customerId}`,
    );
    return;
  }

  const nowISO = new Date().toISOString();

  const { data: subRow, error: subError } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: nowISO })
    .eq("stripe_subscription_id", sub.id)
    .select("id")
    .maybeSingle();

  if (subError) {
    throw new Error(
      `subscriptions UPDATE (cancel) fehlgeschlagen (sub=${sub.id}): ${subError.message}`,
    );
  }

  /*
    Lifetime und 1:1 ueberleben das Ende eines Abos.

    Seit Lifetime aus dem Mitgliederbereich heraus verkauft wird, ist der
    Normalfall: jemand hat ein Monatsabo, kauft Lifetime, und das Abo laeuft
    zum Periodenende aus. Genau dann kommt dieses Ereignis — und wuerde den
    frisch bezahlten Dauerzugang auf `free` zuruecksetzen. Der Kunde haette
    699 Euro gezahlt und stuende vor der Bezahlschranke.
  */
  const dauerzugang =
    profile.membership_tier === "lifetime" || profile.membership_tier === "ht_1on1";

  if (!dauerzugang) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        membership_tier: "free",
        is_paid: false,
        access_until: nowISO,
      })
      .eq("id", profile.id);

    if (profileError) {
      throw new Error(
        `Profil-Reset bei Cancel (user=${profile.id}) fehlgeschlagen: ${profileError.message}`,
      );
    }
  }

  const { error: cancelInsertError } = await supabase
    .from("cancellations")
    .insert({
      user_id: profile.id,
      subscription_id: (subRow as { id?: string } | null)?.id ?? null,
      canceled_at: nowISO,
    });

  // Doppelte Insert (Webhook 2x) tolerieren — sonst wirft RLS/Unique nicht,
  // weil `cancellations` keine Eindeutigkeit auf user+sub hat. Doppel-Insert
  // wäre ein Daten-Hygiene-Issue, aber nicht fatal — wir loggen es.
  if (cancelInsertError) {
    console.warn(
      `[stripe-webhook] cancellations INSERT warn (user=${profile.id}, sub=${sub.id}): ${cancelInsertError.message}`,
    );
  }

  // Wer Lifetime gekauft hat, bekommt keine Abschiedsumfrage und behaelt seine
  // Discord-Rolle — er ist nicht weg, sein Abo ist es.
  if (dauerzugang) return;

  const email = await loadAuthEmail(supabase, profile.id);
  if (email) {
    await sendCancellationSurvey({
      firstName: pickFirstName(profile),
      email,
      userId: profile.id,
    });
  }

  await revokeDiscordRoles(supabase, profile.id);
}

/**
 * Best-effort: reguläre Rolle UND Warteraum-Rolle entfernen (kein Kick — der
 * Nutzer bleibt im Server, das entspricht der bestehenden Politik; nur der
 * manuelle disconnect-Endpoint kickt explizit). Läuft nach den kritischen
 * DB-Writes oben.
 */
async function revokeDiscordRoles(supabase: WebhookSupabase, userId: string): Promise<void> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const roleId = process.env.DISCORD_ROLE_ID;
  const waitingRoomRoleId = process.env.DISCORD_WAITING_ROOM_ROLE_ID;

  if (!guildId || !botToken) {
    console.warn(
      "[stripe-webhook] subscription.deleted: DISCORD_GUILD_ID / DISCORD_BOT_TOKEN nicht gesetzt — Rollen-Entzug übersprungen.",
    );
    return;
  }

  try {
    const { data: dc } = await supabase
      .from("discord_connections")
      .select("discord_user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const discordUserId = (dc?.discord_user_id as string | null) ?? null;
    if (!discordUserId) return;

    if (roleId) await removeGuildMemberRole(guildId, botToken, discordUserId, roleId);
    if (waitingRoomRoleId) await removeGuildMemberRole(guildId, botToken, discordUserId, waitingRoomRoleId);
  } catch (err) {
    console.error("[stripe-webhook] subscription.deleted: Discord-Rollen-Entzug fehlgeschlagen:", err);
  }
}
