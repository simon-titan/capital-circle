import type Stripe from "stripe";
import { sendCancellationSurvey } from "@/lib/email/templates/cancellation-survey";
import { zugangBeendetInDiscord } from "@/lib/discord/warteraum";
import { resolvePlanFromPriceId } from "@/lib/stripe/plan-map";
import { laufenderAufschub } from "@/lib/zahlung/aufschub";
import {
  loadAuthEmail,
  loadProfileByCustomerId,
  pickFirstName,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `customer.subscription.deleted`
 *
 * Tritt am Periodenende ein, nachdem gekündigt wurde — oder sofort, wenn das
 * Abo in Stripe beendet wird (auch, wenn Stripe nach den Wiederholungen einer
 * gescheiterten Abbuchung aufgibt). Ablauf:
 *   1. `subscriptions.status='canceled'`, `canceled_at=now()`
 *   2. Zugang beenden — ausser in drei Fällen (siehe unten)
 *   3. `cancellations`-Zeile, aber nur, wenn es noch keine gibt
 *   4. Kündigungsumfrage per Mail
 *   5. Discord: Mitgliederrolle weg, Warteraum („Zugang pausiert")
 *
 * ── Drei Gründe, den Zugang NICHT abzuräumen ────────────────────────────────
 *
 * **Lifetime und 1:1** überleben das Ende eines Abos: Wer Lifetime kauft, lässt
 * sein Monatsabo auslaufen, und genau dann kommt dieses Ereignis.
 *
 * **Ein anderes laufendes Abo.** Wer über die Kasse ein zweites Abo abschliesst
 * und das alte auslaufen lässt, bekäme sonst den Zugang genommen, den das neue
 * gerade bezahlt. Im Schwesterprojekt traf das die Hälfte der überholten
 * Abo-Zeilen (Meldung aus dem Kaufweg-Test, 19.09.2026). Die Stufe wandert dann
 * auf das verbleibende Abo.
 *
 * **Ein laufender Zahlungsaufschub.** Dann ist der Vertrag bei Stripe beendet,
 * und wir halten den Zugang trotzdem, weil ein Mensch das zugesagt hat. Das
 * Ende des Aufschubs räumt der Nachtlauf ab.
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

  const dauerzugang =
    profile.membership_tier === "lifetime" || profile.membership_tier === "ht_1on1";

  const verbleibend = dauerzugang ? null : await verbleibendesAbo(supabase, profile.id, sub.id);
  const aufschub = dauerzugang || verbleibend ? null : await laufenderAufschub(supabase, profile.id);

  if (verbleibend) {
    /*
      Die Stufe wandert auf das verbleibende Abo, `is_paid` bleibt, und
      `access_until` wird nie verkürzt. Ein unbekannter Preis lässt die Stufe
      stehen, statt sie zu raten.
    */
    const plan = resolvePlanFromPriceId(verbleibend.stripe_price_id);
    const { error } = await supabase
      .from("profiles")
      .update({
        ...(plan ? { membership_tier: plan } : {}),
        is_paid: true,
        access_until: spaeteresDatum(await ladeAccessUntil(supabase, profile.id), verbleibend.current_period_end),
      })
      .eq("id", profile.id);
    if (error) {
      throw new Error(`Profil-Update auf verbleibendes Abo (user=${profile.id}) fehlgeschlagen: ${error.message}`);
    }
    console.info(
      `[stripe-webhook] subscription.deleted: Zugang bleibt, es läuft ein weiteres Abo ` +
        `(${verbleibend.stripe_subscription_id}, user=${profile.id}).`,
    );
  } else if (aufschub) {
    const { error } = await supabase
      .from("profiles")
      .update({ access_until: spaeteresDatum(await ladeAccessUntil(supabase, profile.id), aufschub.bis) })
      .eq("id", profile.id);
    if (error) {
      throw new Error(`Profil-Update bei Aufschub (user=${profile.id}) fehlgeschlagen: ${error.message}`);
    }
    console.info(
      `[stripe-webhook] subscription.deleted: Zugang bleibt, Aufschub bis ${aufschub.bis} (user=${profile.id}).`,
    );
  } else if (!dauerzugang) {
    /*
      `access_until` wird auf jetzt gesetzt, aber **nie nach hinten
      verschoben**: Wer am siebten Tag eines Zahlungsfalls schon gesperrt
      wurde, endete dort, und ab dort zählt die Karenz bis zum Rauswurf.
    */
    const bisher = await ladeAccessUntil(supabase, profile.id);
    const ende = bisher && new Date(bisher).getTime() < Date.now() ? bisher : nowISO;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        membership_tier: "free",
        is_paid: false,
        access_until: ende,
      })
      .eq("id", profile.id);

    if (profileError) {
      throw new Error(
        `Profil-Reset bei Cancel (user=${profile.id}) fehlgeschlagen: ${profileError.message}`,
      );
    }
  }

  await vermerkeKuendigung(supabase, profile.id, (subRow as { id?: string } | null)?.id ?? null, nowISO);

  // Wer weiterhin Zugang hat, ist nicht weg: keine Abschiedsumfrage.
  if (!dauerzugang && !verbleibend && !aufschub) {
    const email = await loadAuthEmail(supabase, profile.id);
    if (email) {
      await sendCancellationSurvey({
        firstName: pickFirstName(profile),
        email,
        userId: profile.id,
      });
    }
  }

  /*
    Discord nach dem Profil richten: Mit Zugang bleibt (oder kommt) die
    Mitgliederrolle, ohne Zugang geht sie, und wer verknüpft ist, landet im
    Warteraum statt vor einem Server, auf dem plötzlich etwas fehlt. Wirft nie.
  */
  await zugangBeendetInDiscord(supabase, profile.id, "subscription.deleted");
}

/**
 * Die Kündigung für die Auswertung vermerken — **höchstens einmal je Abo**.
 *
 * Wer über `/einstellungen/abonnement` oder den Kündigungsbutton kündigt, hat
 * seine Zeile samt Grund bereits (`lib/stripe/kuendigung.ts`); dieses Ereignis
 * kommt dann Wochen später am Periodenende. Bis 19.09.2026 legte es eine zweite
 * Zeile an, und jede Kündigung zählte in der Auswertung doppelt (Meldung aus
 * dem Kaufweg-Test). Neu angelegt wird nur, wenn es noch keine gibt — etwa
 * wenn Stripe das Abo nach gescheiterten Zahlungen beendet oder es im
 * Dashboard beendet wurde. Ein Fehler hier hält den Webhook nicht auf.
 */
async function vermerkeKuendigung(
  supabase: WebhookSupabase,
  userId: string,
  subscriptionId: string | null,
  nowISO: string,
): Promise<void> {
  if (subscriptionId) {
    const { data, error } = await supabase
      .from("cancellations")
      .select("id")
      .eq("user_id", userId)
      .eq("subscription_id", subscriptionId)
      .limit(1);
    if (!error && (data ?? []).length > 0) return;
  }

  const { error } = await supabase.from("cancellations").insert({
    user_id: userId,
    subscription_id: subscriptionId,
    canceled_at: nowISO,
  });
  if (error) {
    console.warn(
      `[stripe-webhook] cancellations INSERT warn (user=${userId}, sub=${subscriptionId ?? "unbekannt"}): ${error.message}`,
    );
  }
}

/** Ein anderes laufendes Abo derselben Person, oder `null`. Wirft bei einem Lesefehler. */
async function verbleibendesAbo(
  supabase: WebhookSupabase,
  userId: string,
  ausser: string,
): Promise<{ stripe_subscription_id: string; stripe_price_id: string; current_period_end: string } | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id,stripe_price_id,current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .neq("stripe_subscription_id", ausser)
    .order("current_period_end", { ascending: false })
    .limit(1);
  if (error) {
    throw new Error(`Verbleibendes Abo nicht prüfbar (user=${userId}): ${error.message}`);
  }
  return ((data ?? [])[0] as { stripe_subscription_id: string; stripe_price_id: string; current_period_end: string } | undefined) ?? null;
}

async function ladeAccessUntil(supabase: WebhookSupabase, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("access_until").eq("id", userId).maybeSingle();
  return (data as { access_until: string | null } | null)?.access_until ?? null;
}

function spaeteresDatum(a: string | null, b: string): string {
  if (!a) return b;
  return new Date(a).getTime() > new Date(b).getTime() ? a : b;
}
