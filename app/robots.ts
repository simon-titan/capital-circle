import type { MetadataRoute } from "next";

/**
 * Suchmaschinen-Regeln.
 *
 * Der wichtigste Eintrag ist `/go/`: Diese Route legt bei jedem Aufruf eine
 * echte Stripe-Checkout-Session an. Ein Crawler, der sie abklappert, erzeugt
 * für jeden Preis eine leere Kasse — und verzerrt damit jede Auswertung zur
 * Abschlussquote. Die Route weist Bots zusätzlich selbst ab (siehe
 * `lib/checkout/vorabruf.ts`), weil sich an `robots.txt` nur hält, wer will.
 *
 * Alles Übrige, was hier gesperrt ist, hat entweder keinen Inhalt für die
 * Suche (`/api/`, `/checkout/`, `/auth/`) oder gehört hinter eine Anmeldung.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/go/",
          "/api/",
          "/checkout/",
          "/auth/",
          "/set-password",
          "/admin/",
          "/dashboard",
          "/einsteig",
          "/pending-review",
          "/survey/",
        ],
      },
    ],
  };
}
