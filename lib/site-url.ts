/**
 * Basis-URL der Anwendung — eine Stelle für alle absoluten Links.
 *
 * Absolute URLs tauchen in Mails, OAuth-Rückleitungen und Stripe-Weiterleitungen
 * auf. Bis hierher lag dieselbe Funktion in `lib/email/resend.ts` (das Email-Modul
 * als Heimat für eine allgemeine Anwendungsangabe), und daneben existierten
 * wortgleiche Kopien in mehreren Route-Handlern. Laufen die auseinander, merkt
 * man es erst, wenn ein Kunde auf einer 404 landet.
 *
 * `lib/email/resend.ts` re-exportiert diese Funktion, damit die bestehenden
 * Email-Importe unverändert weiterlaufen.
 *
 * Reihenfolge: `NEXT_PUBLIC_APP_URL` → `NEXT_PUBLIC_SITE_URL` → Produktions-Domain.
 * Der Produktions-Default statt `localhost` ist Absicht: Fehlt die Variable im
 * Deployment, ist ein Link auf die echte Domain harmlos, ein Link auf
 * `http://localhost:3000` in einer Kundenmail dagegen tot.
 */
export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.capitalcircletrading.com";
  return url.replace(/\/$/, "");
}
