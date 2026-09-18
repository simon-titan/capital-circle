import { redirect } from "next/navigation";

/**
 * Alte Abrechnungsadresse. Sie bleibt, weil die Dunning-Mails
 * (`lib/email/templates/payment-failed-*.tsx`) sie verlinken und das
 * Stripe-Portal sie als `return_url` bekommt — beides sind Adressen, die
 * draussen in der Welt stehen und nicht nachtraeglich geaendert werden koennen.
 */
export default function BillingRedirect() {
  redirect("/einstellungen/abonnement");
}
