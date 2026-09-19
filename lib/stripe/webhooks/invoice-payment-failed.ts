import type Stripe from "stripe";
import { FRIST_TAGE, nachrichtErster } from "@/config/zahlung";
import { hatZugangLautProfil } from "@/lib/discord/mitgliedschaft";
import {
  datumVon,
  eroeffneZahlungsfall,
  euroVon,
  ladeNachrichtDaten,
  meldeZahlungsfallAnTeam,
  paketName,
  sendeFallMail,
  sendeFallNachricht,
} from "@/lib/zahlung/fall";
import { loadProfileByCustomerId, type WebhookSupabase } from "./_helpers";

/** Die wiederkehrenden Stufen. Nur deren Zugang hängt an `access_until`. */
const ABO_STUFEN: ReadonlySet<string> = new Set(["monthly", "quarterly", "yearly"]);

/**
 * Abo-ID einer Rechnung. Seit API `basil` unter `invoice.parent`, ältere
 * Ereignisse tragen sie an den Zeilen (siehe `aboIdAusRechnung` in
 * `invoice-paid.ts`, wo derselbe Fund beschrieben ist).
 */
function aboIdAusRechnung(invoice: Stripe.Invoice): string | null {
  const ausParent = invoice.parent?.subscription_details?.subscription;
  if (ausParent) return typeof ausParent === "string" ? ausParent : ausParent.id;
  for (const zeile of invoice.lines?.data ?? []) {
    const ausZeile = zeile.parent?.subscription_item_details?.subscription;
    if (ausZeile) return ausZeile;
    const alt = (zeile as { subscription?: string | { id: string } | null }).subscription;
    if (alt) return typeof alt === "string" ? alt : alt.id;
  }
  return null;
}

/**
 * `invoice.payment_failed`
 *
 * ── Der Kunde bleibt sieben Tage lang vollwertiges Mitglied ─────────────────
 *
 * Diese Funktion fasst weder `is_paid` noch `membership_tier` noch die
 * Discord-Rollen an. Die häufigste Ursache ist eine abgelaufene Karte, und
 * niemand soll fünf Minuten nach einer misslungenen Abbuchung vor
 * verschlossenen Türen stehen. Gesperrt wird am siebten Tag, im Nachtlauf.
 *
 *   1. Eine Zeile in `payments` mit `status = 'failed'` (idempotent über die
 *      Rechnungsnummer).
 *   2. Ein **Zahlungsfall** je Rechnung (`lib/zahlung/fall.ts`), eindeutig über
 *      `stripe_invoice_id`. Ein zweiter Ausfall ist eine neue Rechnung und
 *      damit ein neuer Fall — die alte Mahnstrecke über `email_sequence_log`
 *      hat einem zweiten Ausfall keine einzige Mail mehr geschickt.
 *   3. Beim **neuen** Fall: `access_until` bis zum Fristende verlängern, aber
 *      **nie verkürzen**. Die alte Fassung überschrieb es mit „jetzt plus 48
 *      Stunden", auch bei Jahresmitgliedern mit Monaten Restlaufzeit.
 *   4. Beim neuen Fall: erste Nachricht (Mail immer, Direktnachricht dazu, mit
 *      Zahllink und Antworten-Knopf) und die Meldung ans Team.
 *
 * Wiederholungsversuche derselben Rechnung zählen nur `versuche` hoch. Sie
 * verlängern nichts: Nach der Sperre am siebten Tag darf ein weiterer
 * Fehlversuch den Zugang nicht wieder aufmachen.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: WebhookSupabase,
): Promise<void> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) {
    throw new Error(`Invoice ${invoice.id} ohne customer-ID`);
  }

  const profile = await loadProfileByCustomerId(supabase, customerId);
  if (!profile) {
    console.warn(`[stripe-webhook] invoice.payment_failed: Kein Profil für customer=${customerId}`);
    return;
  }

  const failureMessage = invoice.last_finalization_error?.message ?? invoice.last_finalization_error?.code ?? null;

  // `payment_intent` ist seit API `dahlia` kein Top-Level-Feld mehr (siehe
  // Kommentar in invoice-paid.ts). Korrelation läuft über `stripe_invoice_id`.
  const paymentRow = {
    user_id: profile.id,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_due,
    currency: invoice.currency,
    status: "failed" as const,
    failure_reason: failureMessage,
    attempt_count: invoice.attempt_count ?? 1,
  };

  const { error: paymentError } = await supabase.from("payments").upsert(paymentRow, { onConflict: "stripe_invoice_id" });

  if (paymentError) {
    throw new Error(`payments UPSERT (failed) fehlgeschlagen (invoice=${invoice.id}): ${paymentError.message}`);
  }

  await bearbeiteFall(invoice, profile.id, profile.membership_tier, supabase);
}

/**
 * Den Fall eröffnen, den Zugang bis zur Frist halten, den Kunden und das Team
 * informieren. **Wirft nie** — die Zahlung ist oben verbucht, alles hier ist
 * Nachbereitung, und ein Wurf liesse Stripe den Aufruf tagelang wiederholen.
 */
async function bearbeiteFall(
  invoice: Stripe.Invoice,
  userId: string,
  tier: string | null,
  supabase: WebhookSupabase,
): Promise<void> {
  try {
    if (!invoice.id) return;

    const betragCents = invoice.amount_remaining ?? invoice.amount_due ?? 0;
    const versuche = invoice.attempt_count ?? 1;

    /*
      ── Wer hat einen laufenden Abo-Zugang, den die Uhr beenden könnte? ──────

      Stufe wiederkehrend **und** `is_paid`. Das zweite ist die Sicherung gegen
      den Fall, der sonst einen gesperrten Kunden wieder hereinliesse: Bleibt
      das Abo nach der Sperre `past_due`, erzeugt Stripe im nächsten Monat eine
      neue Rechnung, und auch die scheitert. Ein neuer Fall — aber wer am
      siebten Tag des alten gesperrt wurde (`is_paid` falsch), bekommt dadurch
      keine sieben neuen Tage. Er steht mit der zweiten Rechnung in der
      Fallakte, ohne Frist und ohne Nachricht; im Warteraum sitzt er ohnehin.

      `access_until` selbst taugt dafür nicht: Bei einer gescheiterten
      Verlängerung liegt es naturgemäss schon Sekunden in der Vergangenheit.
    */
    const { data: stand } = await supabase.from("profiles").select("is_paid").eq("id", userId).maybeSingle();
    const istAbo = Boolean(tier && ABO_STUFEN.has(tier) && (stand as { is_paid: boolean | null } | null)?.is_paid);

    const fall = await eroeffneZahlungsfall(supabase, {
      userId,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: aboIdAusRechnung(invoice),
      betragCents,
      waehrung: invoice.currency ?? "eur",
      versuche,
      paket: paketName(tier),
      zahlungUrl: invoice.hosted_invoice_url ?? null,
      /*
        Die Sieben-Tage-Uhr läuft nur für jemanden, der einen Abo-Zugang hat,
        den sie beenden könnte. Wer keinen hat (etwa eine von Hand angelegte
        Rechnung an ein Free-Konto), bekommt einen Fall ohne Frist: Er steht in
        der Fallakte, aber niemand wird erinnert oder gesperrt.
      */
      mitFrist: istAbo,
    });

    /*
      ── Ohne Fall: der Rückfall ─────────────────────────────────────────────

      `null` heisst fast immer: Migration 080 ist noch nicht eingespielt. Dann
      darf der Kunde nicht schlechter dastehen als mit der alten Mahnstrecke:
      Beim ersten Versuch wird der Zugang bis zur Frist gehalten und die erste
      Mail verschickt. Erinnerungen und Sperre gibt es ohne Fall keine — gesperrt wird dann
      erst, wenn Stripe das Abo beendet (`subscription.deleted`).
    */
    if (!fall) {
      if (versuche > 1 || !istAbo) return;
      const frist = new Date(Date.now() + FRIST_TAGE * 86_400_000).toISOString();
      await halteZugangBisFrist(supabase, userId, frist);
      const daten = await ladeNachrichtDaten(supabase, {
        userId,
        betragCents,
        paket: paketName(tier),
        zahlungUrl: invoice.hosted_invoice_url ?? null,
        frist,
      });
      await sendeFallMail(supabase, userId, {
        betreff: "Deine Zahlung ist nicht durchgegangen",
        ueberschrift: `Hey ${daten.name}, deine Zahlung ist nicht durchgegangen`,
        knopfText: "Zahlung erledigen",
        knopfUrl: daten.url,
        absaetze: nachrichtErster(daten, "mail").split("\n\n"),
        mitAbmeldung: Boolean(daten.lifetime),
      });
      console.warn(
        `[stripe-webhook] invoice.payment_failed: Kein Zahlungsfall anlegbar (Migration 080?), ` +
          `Zugang bis zur Frist gehalten, erste Mail verschickt (user=${userId}, invoice=${invoice.id}).`,
      );
      return;
    }

    if (!fall.neu) return;

    if (istAbo && fall.frist) await halteZugangBisFrist(supabase, userId, fall.frist);

    /*
      Die erste Nachricht nur, wenn der Zugang auch wirklich bis zur Frist
      steht — sonst verspräche „bis zum X ändert sich nichts" etwas Falsches.
    */
    if (!istAbo || !fall.frist || !(await hatZugang(supabase, userId))) return;

    const daten = await ladeNachrichtDaten(supabase, {
      userId,
      betragCents,
      paket: paketName(tier),
      zahlungUrl: invoice.hosted_invoice_url ?? null,
      frist: fall.frist,
    });

    await sendeFallNachricht(supabase, {
      fallId: fall.fallId,
      userId,
      text: nachrichtErster(daten),
      autorId: null,
      vonAdmin: true,
      mail: {
        betreff: "Deine Zahlung ist nicht durchgegangen",
        ueberschrift: `Hey ${daten.name}, deine Zahlung ist nicht durchgegangen`,
        knopfText: "Zahlung erledigen",
        knopfUrl: daten.url,
        absaetze: nachrichtErster(daten, "mail").split("\n\n"),
        mitAbmeldung: Boolean(daten.lifetime),
      },
    });

    await meldeZahlungsfallAnTeam(supabase, {
      fallId: fall.fallId,
      userId,
      name: daten.name,
      paket: daten.paket,
      betrag: euroVon(betragCents),
      versuche,
      frist: datumVon(fall.frist),
    });
  } catch (err) {
    console.warn(`[stripe-webhook] Zahlungsfall nicht bearbeitet (user=${userId}):`, err);
  }
}

/**
 * `access_until` auf das Fristende heben, **nie senken**: Wer über sein Abo
 * länger Zugang hat, behält ihn. Wirft nie.
 */
async function halteZugangBisFrist(supabase: WebhookSupabase, userId: string, fristIso: string): Promise<void> {
  const { data } = await supabase.from("profiles").select("access_until").eq("id", userId).maybeSingle();
  const bestehend = (data as { access_until: string | null } | null)?.access_until ?? null;
  if (bestehend && new Date(bestehend).getTime() >= new Date(fristIso).getTime()) return;

  const { error } = await supabase.from("profiles").update({ access_until: fristIso }).eq("id", userId);
  if (error) {
    console.error(`[stripe-webhook] access_until bis zur Frist nicht setzbar (user=${userId}): ${error.message}`);
  }
}

/** Zugang laut Profil (`is_paid` oder Admin). Wirft nie: im Zweifel „nein", dann keine Nachricht. */
async function hatZugang(supabase: WebhookSupabase, userId: string): Promise<boolean> {
  try {
    return await hatZugangLautProfil(supabase, userId);
  } catch {
    return false;
  }
}
