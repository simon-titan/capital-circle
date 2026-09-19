-- 091_checkout_zustimmung.sql
--
-- Nachweis der Zustimmung in der Stripe-Kasse in der eigenen Datenbank.
--
-- Die Kasse verlangt seit 19.09.2026 ein Pflicht-Häkchen
-- (`consent_collection.terms_of_service = "required"`, `lib/stripe/kasse-recht.ts`):
-- Annahme der AGB, ausdrückliches Verlangen des sofortigen Leistungsbeginns
-- und Kenntnis vom Erlöschen bzw. Wertersatz beim Widerrufsrecht (§ 356
-- Abs. 5 und 6, § 357a Abs. 2 BGB). Stripe speichert das Ergebnis an der
-- Checkout-Session (`consent.terms_of_service = "accepted"`), der Stand der
-- Rechtstexte steht in den Metadaten (`rechtstexte_version`).
--
-- Bisher lag der Beleg nur bei Stripe. Kommt es zum Streit um einen Widerruf
-- („Das Widerrufsrecht war erloschen"), muss der Betreiber die Zustimmung
-- beweisen — mit diesen Spalten steht sie neben dem Kauf in der eigenen
-- Datenbank. Geschrieben vom Webhook `checkout.session.completed`
-- (`schreibeTrichter` in `lib/stripe/webhooks/checkout-completed.ts`).
--
-- Grenze: `checkout_sessions` hat nur Zeilen für den Gast-Checkout über
-- `/go/<plan>`. Käufe über die eingebettete Kasse (`/billing`, Lifetime)
-- haben keine Trichterzeile; dort bleibt Stripe der alleinige Beleg.
--
-- Additiv und idempotent.

alter table public.checkout_sessions
  add column if not exists agb_zustimmung text,
  add column if not exists zustimmung_am timestamptz,
  add column if not exists rechtstexte_version text;

comment on column public.checkout_sessions.agb_zustimmung is
  'Stripe consent.terms_of_service beim Abschluss: ''accepted'' oder NULL (kein Häkchen verlangt/gesetzt).';
comment on column public.checkout_sessions.zustimmung_am is
  'Zeitpunkt, zu dem Stripe den Abschluss mit Zustimmung meldete (Webhook, Sekunden nach dem Bezahlen).';
comment on column public.checkout_sessions.rechtstexte_version is
  'Stand der Rechtstexte beim Kauf (metadata.rechtstexte_version, siehe config/legal.ts).';
