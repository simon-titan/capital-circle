import { getAppUrl } from "./resend";
import { generateContactUnsubscribeToken, generateUnsubscribeToken } from "./unsubscribe-token";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Abmeldung von Werbe-Mails (§ 7 Abs. 3 UWG, Art. 21 Abs. 2 DSGVO).
 *
 * ── Welche Mails einen Abmeldelink tragen ──────────────────────────────────
 * Alle werblichen: Inaktivitäts-Erinnerungen (`churn-inactive-7d/14d`),
 * 1:1-Upsell (`ht-upsell-60d`), die Free-Kurs-Folge (`free-course-day-*`),
 * die Feedback-Bitte nach der Kündigung (`cancellation-survey` —
 * Zufriedenheitsbefragungen per Mail sind nach BGH, Urteil vom 10.07.2018,
 * VI ZR 225/17, Werbung) und die Migrations-Kampagnen. `reactivation-offer`
 * gehört dazu, liegt aber beim Retention-Strang.
 *
 * **Keinen** Link tragen Transaktionsmails: Willkommen, Passwort,
 * Vertragsbestätigung, Zahlungs-/Mahnmails, Kündigungs- und
 * Widerrufsbestätigung, Support-Antworten, Bewerbungs-Eingang/-Absage.
 *
 * § 7 Abs. 3 Nr. 4 UWG verlangt bei **jeder** Verwendung einen klaren Hinweis
 * auf das Widerspruchsrecht — den Satz dazu rendert `BaseEmail`, sobald eine
 * `unsubscribeUrl` übergeben wird.
 *
 * ── Zwei Wege, ein Ergebnis ────────────────────────────────────────────────
 *   - Mit Konto: `/api/unsubscribe?token=…` (signierte `userId`) setzt
 *     `profiles.unsubscribed_at`.
 *   - Ohne Konto (Resend-Segment-Kampagnen): `/api/unsubscribe/contact?token=…`
 *     (signierte E-Mail) setzt den Resend-Kontakt auf `unsubscribed`.
 * Beide Routen ziehen die jeweils andere Stelle mit, soweit es sie gibt —
 * die Abmeldeseite verspricht „keine weiteren Marketing-E-Mails", nicht
 * „keine weiteren E-Mails dieser einen Kampagne".
 */
export function abmeldeUrl({ userId, email }: { userId?: string | null; email: string }): string {
  const basis = getAppUrl();
  if (userId) return `${basis}/api/unsubscribe?token=${generateUnsubscribeToken(userId)}`;
  return `${basis}/api/unsubscribe/contact?token=${generateContactUnsubscribeToken(email)}`;
}

/**
 * Hat das Konto Werbe-Mails abbestellt? Für Versender, die nicht schon in
 * ihrer Abfrage auf `unsubscribed_at IS NULL` filtern (z. B. die
 * Feedback-Bitte aus dem Stripe-Webhook).
 *
 * Schlägt die Abfrage fehl, gilt das Konto als abgemeldet: Eine nicht
 * verschickte Werbe-Mail kostet nichts, eine trotz Widerspruch verschickte
 * ist ein Wettbewerbsverstoß.
 */
export async function istAbgemeldet(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await createServiceClient()
    .from("profiles")
    .select("unsubscribed_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error(`[email/abmeldung] unsubscribed_at für ${userId} nicht lesbar:`, error.message);
    return true;
  }
  return Boolean((data as { unsubscribed_at?: string | null } | null)?.unsubscribed_at);
}
