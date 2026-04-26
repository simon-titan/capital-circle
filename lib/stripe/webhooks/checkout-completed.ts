import type Stripe from "stripe";
import { sendWelcomePaid } from "@/lib/email/templates/welcome-paid";
import {
  extractCustomerId,
  loadAuthEmail,
  loadProfileByUserId,
  pickFirstName,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `checkout.session.completed`
 *
 * Zwei Modi:
 *   - `mode: 'payment'`  → Lifetime (einmalige Zahlung). Wir markieren das
 *     Profil sofort als `lifetime` und schicken die Welcome-Mail.
 *   - `mode: 'subscription'` → Monthly. Hier KEIN Profil-Update — der
 *     `customer.subscription.created`/`.updated` Event kümmert sich darum
 *     (inkl. `current_period_end` für `access_until`). Würden wir hier auch
 *     schreiben, hätten wir Race-Conditions zwischen den Events.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: WebhookSupabase,
): Promise<void> {
  const userId = session.metadata?.user_id;
  if (!userId) {
    throw new Error(
      `checkout.session.completed ohne metadata.user_id (session=${session.id})`,
    );
  }

  if (session.mode === "subscription") {
    return;
  }

  if (session.mode !== "payment") {
    return;
  }

  const customerId = extractCustomerId(session.customer);

  const update: Record<string, unknown> = {
    membership_tier: "lifetime",
    is_paid: true,
    lifetime_purchased_at: new Date().toISOString(),
    access_until: null,
  };
  if (customerId) {
    update.stripe_customer_id = customerId;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId);

  if (updateError) {
    throw new Error(
      `Lifetime-Update für ${userId} fehlgeschlagen: ${updateError.message}`,
    );
  }

  const profile = await loadProfileByUserId(supabase, userId);
  const email =
    session.customer_details?.email ??
    session.customer_email ??
    (await loadAuthEmail(supabase, userId));
  if (!email) {
    return;
  }

  await sendWelcomePaid({
    firstName: pickFirstName(profile),
    email,
    userId,
    tier: "lifetime",
  });
}
