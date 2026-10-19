import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRODUKTE,
  euro,
  istKassenProdukt,
  rateCents,
  sollCents,
  type KassenProdukt,
} from "@/config/mentoring";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";
import { kassenRechtsMetadata, kassenRechtsangabenMitText, mentoringLaufzeittext } from "@/lib/stripe/kasse-recht";
import { getStripe } from "@/lib/stripe/server";

/**
 * Kassenlink nach dem Closing-Call.
 *
 * Der Closer legt im Admin (`/admin/kassenlinks`) ein Angebot an: Produkt,
 * Zahlweise (einmal oder 2–4 Raten), E-Mail des Kunden. Der Kunde bekommt
 * `/kasse/<token>`, sieht dort, was er kauft, und geht von dort in Stripes
 * Kasse. Jeder Klick erzeugt eine frische Stripe-Session — der Link bleibt
 * gültig, bis bezahlt, storniert oder abgelaufen ist.
 *
 * Unterschiede zum MoonTrading-Ratenlink, der hier Vorbild war:
 *
 * - **Ein Link je Kunde mit Closer**, gespeichert in `kassenlink`, statt einer
 *   von Hand getippten Adresse mit Query-Parametern. Preis und Ratenzahl sind
 *   beim Anlegen festgeschrieben; am Link selbst lässt sich nichts verstellen.
 * - **Preise inline** (`price_data`) statt einer Umgebungsvariablen je
 *   Kombination aus Produkt und Ratenzahl (das wären hier elf). Erkannt wird
 *   der Kauf im Webhook an `metadata.art` — die Metadaten setzt ausschließlich
 *   dieser Server, der Kunde kann sie nicht beeinflussen.
 * - **Die Raten enden von selbst** (Subscription Schedule, eingerichtet im
 *   Webhook), statt dass jemand nach der letzten Rate von Hand kündigt.
 *
 * Arten in `metadata.art`, gelesen von `lib/stripe/webhooks/mentoring.ts`:
 *   `mentoring`         Einmalzahlung eines Programms
 *   `mentoring_raten`   Programm in Monatsraten (Abo mit Schedule)
 *   `live_abo`          Live-Trading-Abo, 99 €/Monat
 */

export const ART_EINMAL = "mentoring";
export const ART_RATEN = "mentoring_raten";
export const ART_LIVE = "live_abo";
export type MentoringArt = typeof ART_EINMAL | typeof ART_RATEN | typeof ART_LIVE;

export function istMentoringArt(wert: unknown): wert is MentoringArt {
  return wert === ART_EINMAL || wert === ART_RATEN || wert === ART_LIVE;
}

export type KassenlinkStatus = "offen" | "bezahlt" | "storniert";

export interface Kassenlink {
  id: string;
  token: string;
  produkt: KassenProdukt;
  raten: number;
  betrag_cents: number;
  email: string;
  name: string | null;
  closer: string | null;
  lead_id: string | null;
  notiz: string | null;
  erstellt_am: string;
  gueltig_bis: string;
  status: KassenlinkStatus;
  stripe_session_id: string | null;
  bezahlt_am: string | null;
  kauf_id: string | null;
}

export const KASSENLINK_SPALTEN =
  "id,token,produkt,raten,betrag_cents,email,name,closer,lead_id,notiz,erstellt_am,gueltig_bis,status,stripe_session_id,bezahlt_am,kauf_id";

/** 24 Zeichen, URL-sicher, 144 Bit Zufall — nicht erratbar, kurz genug für WhatsApp. */
export function erzeugeKassenToken(): string {
  return randomBytes(18).toString("base64url");
}

/** Was die Kassenseite mit einem Link anfangen kann. */
export type KassenlinkZustand = "offen" | "bezahlt" | "storniert" | "abgelaufen";

export function kassenlinkZustand(link: Pick<Kassenlink, "status" | "gueltig_bis">, jetzt = Date.now()): KassenlinkZustand {
  if (link.status !== "offen") return link.status;
  return new Date(link.gueltig_bis).getTime() <= jetzt ? "abgelaufen" : "offen";
}

export async function ladeKassenlink(service: SupabaseClient, token: string): Promise<Kassenlink | null> {
  const t = token.trim();
  // Grobe Formprüfung, damit Unsinn gar nicht erst als Abfrage läuft.
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(t)) return null;
  const { data, error } = await service.from("kassenlink").select(KASSENLINK_SPALTEN).eq("token", t).maybeSingle();
  if (error) {
    // Fehlt die Tabelle (Migration 108 nicht eingespielt), ist der Link schlicht unbekannt.
    if (error.code !== "PGRST205" && error.code !== "42P01") {
      console.error(`[kasse] Kassenlink nicht lesbar: ${error.code ?? ""} ${error.message}`);
    }
    return null;
  }
  const link = data as Kassenlink | null;
  if (!link || !istKassenProdukt(link.produkt)) return null;
  return link;
}

/** Kurzbeschreibung des Angebots für Kassenseite, Admin und Mail. */
export function angebotsZusammenfassung(link: Pick<Kassenlink, "produkt" | "raten" | "betrag_cents">) {
  const produkt = PRODUKTE[link.produkt];
  const rate = rateCents(link.betrag_cents, link.raten);
  return {
    produkt,
    raten: link.raten,
    gesamtCents: link.betrag_cents,
    rateCents: rate,
    sollCents: sollCents(link.betrag_cents, link.raten),
    istAbo: link.produkt === "live",
    istRaten: link.produkt !== "live" && link.raten > 1,
  };
}

interface Kunde {
  userId: string | null;
  customerId: string | null;
  tier: string | null;
  liveBis: string | null;
}

/** Konto und Stripe-Kunde zur E-Mail des Links, falls es beides schon gibt. */
export async function ladeKunde(service: SupabaseClient, email: string): Promise<Kunde> {
  const leer: Kunde = { userId: null, customerId: null, tier: null, liveBis: null };
  let userId: string | null = null;
  try {
    userId = await findeUserIdZuEmail(service, email);
  } catch (err) {
    // Ein Lesefehler macht aus dem Kunden einen Gast; das Konto findet der Webhook wieder.
    console.warn("[kasse] Konto zur E-Mail nicht prüfbar:", err);
    return leer;
  }
  if (!userId) return leer;
  const { data } = await service
    .from("profiles")
    .select("stripe_customer_id,membership_tier,live_bis")
    .eq("id", userId)
    .maybeSingle();
  const p = data as { stripe_customer_id: string | null; membership_tier: string | null; live_bis: string | null } | null;
  return { userId, customerId: p?.stripe_customer_id ?? null, tier: p?.membership_tier ?? null, liveBis: p?.live_bis ?? null };
}

export type KasseStart = { ok: true; url: string; sessionId: string } | { ok: false; grund: KasseFehler };
export type KasseFehler = "nicht_offen" | "kein_mentoring_konto" | "live_laeuft" | "stripe_fehler";

/** Stripes Untergrenze für `trial_end`: mindestens 48 Stunden in der Zukunft. */
const TRIAL_MIN_MS = 48 * 60 * 60 * 1000;

/**
 * Wann das Live-Abo zum ersten Mal abbucht: am Ende des noch laufenden
 * Live-Zugangs, sonst sofort (`null`). Dieselbe Regel nutzt die Kasse für
 * `trial_end` und die Kassenseite für den Satz „Erste Abbuchung am …" —
 * deshalb an einer Stelle.
 */
export function ersteLiveAbbuchung(liveBis: string | null, jetzt = Date.now()): Date | null {
  if (!liveBis) return null;
  const ende = new Date(liveBis).getTime();
  return ende - jetzt > TRIAL_MIN_MS ? new Date(ende) : null;
}

/**
 * Stripe-Kasse für einen Kassenlink öffnen.
 *
 * `quelle` unterscheidet den Kassenlink vom Knopf „Live-Zugang verlängern" im
 * Mitgliederbereich (dort gibt es keinen Link, nur das Konto).
 */
export async function starteKasse(
  service: SupabaseClient,
  appUrl: string,
  angebot: {
    produkt: KassenProdukt;
    raten: number;
    betragCents: number;
    email: string;
    name?: string | null;
    closer?: string | null;
    kassenlinkId?: string | null;
    token?: string | null;
    /** Schon bekanntes Konto (Live-Abo aus dem Mitgliederbereich). */
    userId?: string | null;
  },
): Promise<KasseStart> {
  const produkt = PRODUKTE[angebot.produkt];
  const istLive = angebot.produkt === "live";
  const raten = istLive ? 1 : Math.min(Math.max(1, angebot.raten), produkt.maxRaten);
  const istRaten = !istLive && raten > 1;
  const art: MentoringArt = istLive ? ART_LIVE : istRaten ? ART_RATEN : ART_EINMAL;

  const kunde = await ladeKunde(service, angebot.email);
  const userId = angebot.userId ?? kunde.userId;

  /*
    Das Live-Abo verlängert den Live-Bereich eines Programms. Ohne Programm
    öffnete es nichts (die Plattform selbst bleibt zu), der Kunde zahlte also
    für eine verschlossene Tür. Deshalb nur für Konten der Stufe `mentoring`.
  */
  if (istLive && kunde.tier !== "mentoring") {
    return { ok: false, grund: "kein_mentoring_konto" };
  }

  // Ein zweites Live-Abo neben einem laufenden wäre doppelt bezahlt.
  if (istLive && userId) {
    const { data: laufend, error } = await service
      .from("mentoring_kauf")
      .select("id")
      .eq("user_id", userId)
      .eq("produkt", "live")
      .eq("status", "aktiv")
      .limit(1);
    if (!error && (laufend ?? []).length > 0) return { ok: false, grund: "live_laeuft" };
  }

  const rate = rateCents(angebot.betragCents, raten);
  const metadata: Record<string, string> = {
    art,
    produkt: angebot.produkt,
    raten: String(raten),
    betrag_cents: String(angebot.betragCents),
    ...(istRaten ? { rate_cents: String(rate) } : {}),
    ...(angebot.kassenlinkId ? { kassenlink_id: angebot.kassenlinkId } : {}),
    ...(angebot.closer ? { closer: angebot.closer } : {}),
    ...(userId ? { user_id: userId } : {}),
    ...kassenRechtsMetadata,
  };

  /*
    Stripe-Produkt: aus der Umgebung, sonst inline. Mit eigenem Produkt landen
    alle Käufe eines Programms im Dashboard unter einem Eintrag; inline legt
    Stripe für jede Kasse ein neues an — das funktioniert, ist aber unordentlich.
  */
  const produktId = process.env[`STRIPE_PRODUCT_${angebot.produkt.toUpperCase()}`]?.trim();
  const produktAngabe = produktId
    ? { product: produktId }
    : { product_data: { name: istLive ? produkt.name : `Capital Circle ${produkt.name}` } };

  const priceData: NonNullable<NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]>[number]["price_data"]> = {
    currency: "eur",
    // Alle Preise sind Endpreise inkl. MwSt. (Board: „3.000 € inkl. MwSt.").
    tax_behavior: "inclusive",
    unit_amount: istLive ? produkt.preisCents : istRaten ? rate : angebot.betragCents,
    ...(istLive || istRaten ? { recurring: { interval: "month" as const } } : {}),
    ...produktAngabe,
  };

  /*
    Live-Abo, solange der Live-Zugang noch läuft: Die erste Abbuchung kommt
    erst, wenn der bezahlte Zeitraum endet. Sonst zahlte jemand, der früh
    verlängert, doppelt für dieselben Wochen.
  */
  const erste = istLive ? ersteLiveAbbuchung(kunde.liveBis) : null;
  const trialEnd = erste ? Math.floor(erste.getTime() / 1000) : undefined;

  const laufzeit = mentoringLaufzeittext({
    produkt: angebot.produkt,
    liveMonate: produkt.liveMonate,
    raten,
    rateText: istRaten ? euro(rate) : undefined,
  });

  const zahlarten = process.env.STRIPE_PMC_MENTORING?.trim();

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: istLive || istRaten ? "subscription" : "payment",
      line_items: [{ price_data: priceData, quantity: 1 }],
      /*
        Mit bestehendem Stripe-Kunden braucht Stripe Tax `customer_update` (siehe
        AGENTS.md, 22.09.2026); bei `customer_email` ist das Feld verboten.
      */
      ...(kunde.customerId
        ? { customer: kunde.customerId, customer_update: { address: "auto" as const, name: "auto" as const } }
        : { customer_email: angebot.email }),
      // Einmalzahlung: Stripe legt den Kunden an und schickt eine Rechnung.
      ...(!istLive && !istRaten
        ? {
            ...(kunde.customerId ? {} : { customer_creation: "always" as const }),
            invoice_creation: { enabled: true, invoice_data: { metadata } },
            payment_intent_data: { metadata },
          }
        : {
            subscription_data: {
              metadata,
              description: istLive ? produkt.name : `${produkt.name}, ${raten} Monatsraten`,
              ...(trialEnd ? { trial_end: trialEnd } : {}),
            },
          }),
      ...(zahlarten ? { payment_method_configuration: zahlarten } : {}),
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: angebot.token ? `${appUrl}/kasse/${angebot.token}` : `${appUrl}/live-session`,
      expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
      automatic_tax: { enabled: true },
      allow_promotion_codes: false,
      billing_address_collection: "required",
      ...kassenRechtsangabenMitText(appUrl, laufzeit),
      metadata,
    });

    if (!session.url) {
      console.error(`[kasse] Stripe-Session ${session.id} ohne URL.`);
      return { ok: false, grund: "stripe_fehler" };
    }

    if (angebot.kassenlinkId) {
      const { error } = await service
        .from("kassenlink")
        .update({ stripe_session_id: session.id })
        .eq("id", angebot.kassenlinkId);
      if (error) console.warn(`[kasse] Session am Kassenlink nicht vermerkt: ${error.message}`);
    }

    return { ok: true, url: session.url, sessionId: session.id };
  } catch (err) {
    console.error("[kasse] Stripe-Session konnte nicht erstellt werden:", err);
    return { ok: false, grund: "stripe_fehler" };
  }
}
