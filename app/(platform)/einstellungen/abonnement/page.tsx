import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { Box } from "@chakra-ui/react";
import { CancelFlow } from "@/components/billing/CancelFlow";
import { LifetimeOffer } from "@/components/billing/LifetimeOffer";
import { ManageSubscriptionButton } from "@/components/billing/ManageSubscriptionButton";
import { SubscriptionCard } from "@/components/billing/SubscriptionCard";
import { istAbo, type Tier } from "@/components/billing/format";
import { PricingCards } from "@/components/marketing/PricingCards";
import { pruefeLifetimeAngebot } from "@/lib/access-control/lifetime-offer";
import { createClient } from "@/lib/supabase/server";
import { aboLaeuftSeit, ladeAboKontext } from "@/lib/stripe/abo-kontext";
import { getStripe } from "@/lib/stripe/server";
import { istUpgradeQuelle, pruefeUpgrade } from "@/lib/stripe/upgrade";

export const metadata: Metadata = {
  title: "Abonnement · Capital Circle",
};

export const dynamic = "force-dynamic";

export default async function AbonnementPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect("/login?next=/einstellungen/abonnement");

  const kontext = await ladeAboKontext(user.id);
  const tier = (kontext?.tier ?? "free") as Tier;

  /*
    Die Abo-Zeile aus der Datenbank reicht für Tarif und Periode, weiß aber
    nichts über eine laufende Pause oder einen vergebenen Rabatt — beides lebt
    ausschliesslich bei Stripe. Deshalb einmal nachfragen. Fällt der Aufruf
    aus, arbeitet die Seite mit den lokalen Werten weiter; sie sind dann
    lediglich in der Pausenfrage blind, statt gar nichts zu zeigen.
  */
  let stripeAbo: Stripe.Subscription | null = null;
  if (kontext?.abo) {
    try {
      stripeAbo = await getStripe().subscriptions.retrieve(kontext.abo.stripeSubscriptionId);
    } catch (err) {
      console.error("[einstellungen/abonnement] Stripe-Abo nicht abrufbar:", err);
    }
  }

  const item = stripeAbo?.items?.data?.[0] as { current_period_end?: number } | undefined;
  const periodenEnde =
    typeof item?.current_period_end === "number"
      ? new Date(item.current_period_end * 1000).toISOString()
      : (kontext?.abo?.currentPeriodEnd ?? null);

  const cancelAtPeriodEnd = stripeAbo?.cancel_at_period_end ?? kontext?.abo?.cancelAtPeriodEnd ?? false;
  const pausiertBis = stripeAbo?.pause_collection?.resumes_at
    ? new Date(stripeAbo.pause_collection.resumes_at * 1000).toISOString()
    : null;
  const status = stripeAbo?.status ?? kontext?.abo?.status ?? null;

  /*
    Einmal berechnet und zweifach gebraucht: `pruefeUpgrade()` sperrt den
    Knopf in der Jahreskarte, `upgradeFreiAb()` schreibt das Datum in den
    Sperrtext darunter. Beide lesen denselben Beginn — zwei Quellen liefen
    auseinander, und der Nutzer läse ein Datum, an dem der Knopf immer noch
    nicht geht.
  */
  const laufendSeit = aboLaeuftSeit(kontext?.abo ?? null);
  const upgrade = pruefeUpgrade({
    tier,
    status,
    cancelAtPeriodEnd,
    laufendSeit,
    // Gefragt ist `pause_collection` selbst, nicht `pausiertBis`: Eine im
    // Stripe-Dashboard von Hand gesetzte Pause hat kein `resumes_at` und
    // wäre über das Datum unsichtbar.
    pausiert: Boolean(stripeAbo?.pause_collection),
  });

  const lifetime = await pruefeLifetimeAngebot(user.id);

  const aboAnsicht =
    kontext?.abo && periodenEnde
      ? {
          status: status ?? kontext.abo.status,
          currentPeriodEnd: periodenEnde,
          cancelAtPeriodEnd,
          pausiertBis,
        }
      : null;

  return (
    <>
      <SubscriptionCard
        tier={tier}
        abo={aboAnsicht}
        lifetimeGekauftAm={kontext?.lifetimePurchasedAt ?? null}
        accessUntil={kontext?.accessUntil ?? null}
        action={
          kontext?.customerId && tier !== "free" ? (
            <ManageSubscriptionButton label="Im Stripe-Portal öffnen" variant="outline" />
          ) : null
        }
      />

      {/*
        Lifetime steht seit 20.09.2026 **über** der Paketreihe (Nutzerwunsch):
        Es ist das Angebot, bei dem nichts mehr abgebucht wird, und stand unter
        drei Laufzeiten, die alle weiterlaufen.

        Es bleibt das einzige Angebot, das wirklich verschwindet, statt
        gesperrt dazustehen: Es hat keinen öffentlichen Preis und gilt nur für
        Mitglieder, die zahlen oder je gezahlt haben (seit 19.09.2026 auch
        Gekündigte und Gesperrte — auf sie verweisen Mahnung, Warteraum und
        Abschied). Eine gesperrte Karte wäre genau die Werbung, die dieses
        Angebot nicht haben soll — und ohne `STRIPE_PRICE_LIFETIME` führte ihr
        Knopf ohnehin ins Leere (`pruefeLifetimeAngebot` → `kein_preis`).
      */}
      {lifetime.erlaubt ? <LifetimeOffer ehemalig={Boolean(lifetime.ehemalig)} /> : null}

      {/*
        Die Laufzeiten stehen hier direkt statt hinter einem Link: `/pricing`
        ist entfallen, und die Verkaufsseite auf `/` leitet eingeloggte Nutzer
        ins Dashboard um — ein Knopf dorthin wäre eine Sackgasse gewesen.

        Sie stehen hier seit 09/2026 für **jeden** Tarif, nicht mehr nur für
        Free: Wer zahlt, sah bis dahin nirgends, welche Pakete es gibt und in
        welchem er selbst steckt. Gekauft wird aus einem laufenden Abo heraus
        trotzdem nichts — `kontoAnsicht` macht aus der Preisliste eine
        Übersicht und aus den Kaufknöpfen Wege zum Wechsel.

        Der Wechsel auf das Jahr sitzt seit 20.09.2026 in der Jahreskarte
        selbst, statt in einer eigenen Angebotskarte darunter. Die Lage prüft
        weiterhin der Server: `istUpgradeQuelle()` beantwortet, ob es diesen
        Weg für den Tarif überhaupt gibt, `pruefeUpgrade()`, ob der Knopf
        klickbar ist. Ist er es nicht, nennt die Karte Grund und Datum, statt
        zu verschwinden — ein verstecktes Angebot verkauft nichts. Der Riegel
        selbst sitzt unverändert in `/api/stripe/subscription/upgrade`.
      */}
      <Box id="mitgliedschaft" className="cc-rise" style={{ animationDelay: "220ms" }}>
        <PricingCards
          isLoggedIn
          membershipTier={tier}
          kontoAnsicht
          hatAbo={Boolean(kontext?.abo)}
          jahreswechsel={
            istUpgradeQuelle(tier) ? { grund: upgrade.grund } : null
          }
        />
      </Box>

      {istAbo(tier) && kontext?.abo && periodenEnde ? (
        <CancelFlow
          periodenEnde={periodenEnde}
          bereitsGekuendigt={cancelAtPeriodEnd}
          pausiertBis={pausiertBis}
        />
      ) : null}
    </>
  );
}
