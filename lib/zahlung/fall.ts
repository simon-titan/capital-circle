import type { SupabaseClient } from "@supabase/supabase-js";
import { TIER_LABEL, type Tier } from "@/components/billing/format";
import { lifetimeHinweis } from "@/config/lifetime";
import { TEAM_POSTFACH } from "@/config/team";
import {
  ERINNERUNG_TAGE,
  FRIST_TAGE,
  nachrichtErinnerung,
  nachrichtGesperrt,
  type NachrichtDaten,
} from "@/config/zahlung";
import { evaluateAccess, type AccessTier } from "@/lib/access-control/has-access";
import { sendeDirektnachricht } from "@/lib/discord/api";
import { discordIdFuerNachricht, discordIdRoh } from "@/lib/discord/konto";
import { warteraumRolleId } from "@/lib/discord/mitgliedschaft";
import { getAppUrl } from "@/lib/site-url";
import type { ZahlungsfallStatus } from "./aufschub";

/**
 * Zahlungsfälle: eröffnen, schreiben, erinnern, sperren, schliessen.
 *
 * Übernommen aus MoonTrading (`lib/zahlung/fall.ts`), angepasst an Capital
 * Circle. Eröffnet wird ein Fall im Stripe-Webhook, erinnert und gesperrt im
 * Nachtlauf (`app/api/cron/taeglich`), gelesen und beantwortet im Adminbereich
 * (`lib/admin/zahlungsfaelle.ts`).
 *
 * ── Der Unterschied zu MoonTrading: `access_until` ist die Schranke ─────────
 *
 * In MoonTrading hängt der Zugang an `is_paid`, `access_until` ist dort nur
 * eine Angabe. In Capital Circle entscheidet `evaluateAccess()` über Stufe plus
 * `access_until`. Deshalb:
 *
 * - `invoice.payment_failed` verlängert `access_until` auf das Fristende —
 *   aber nur beim **neuen** Fall und **nie nach hinten**. Ein späterer
 *   Fehlversuch derselben Rechnung darf eine bereits vollzogene Sperre nicht
 *   wieder aufheben.
 * - Die Sperre setzt `access_until` auf jetzt und `is_paid` auf falsch, lässt
 *   die Stufe aber stehen (wie `pausiereProfil`): Zahlt der Kunde doch noch,
 *   stellt `subscription.updated` den Zugang her, ohne ihn für einen
 *   Neukunden zu halten.
 * - Ein Aufschub verlängert `access_until` bis zu seinem Ende
 *   (`gewaehreAufschub` im Adminbereich).
 *
 * ── Mail immer, Discord als Zugabe ─────────────────────────────────────────
 *
 * Jede automatische Nachricht geht als Mail raus, unabhängig davon, ob Discord
 * verknüpft oder eingerichtet ist. Die Direktnachricht kommt dazu, sofern
 * möglich und nicht widersprochen. Im Schwesterprojekt liefen Erinnerungen und
 * Sperre zuerst nur über Discord — wer keine Verknüpfung hatte, wäre ohne ein
 * Wort gesperrt worden.
 *
 * ── Alles hier wirft nie, ausser `hatAnderenZugang` ─────────────────────────
 *
 * Der Stripe-Webhook darf an einer Nebenwirkung nicht scheitern, sonst
 * wiederholt Stripe den Aufruf tagelang. Die Zahlung ist die Wahrheit, der
 * Fall ist die Nachbereitung.
 */

/** Der Knopf unter einer Direktnachricht zum Fall. Die Fall-ID steckt im Wert. */
export const KNOPF_ZAHLUNG_ANTWORT = "zahlung_antwort";

/**
 * Der Knopf unter der angepinnten Erklärung im Warteraum.
 *
 * Er trägt **keine** Fall-ID: Die Nachricht im Kanal ist für alle dieselbe,
 * erst wer drückt, ist jemand. Der Fall wird beim Drücken über die
 * Discord-Kennung gesucht (`juengsterFall`).
 */
export const KNOPF_ZAHLUNG_MELDEN = "zahlung_melden";

const TAG_MS = 86_400_000;

export function euroVon(cents: number): string {
  return `${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** Ein Datum, wie der Kunde es liest. Berliner Zeit, sonst kippt der Tag um Mitternacht UTC. */
export function datumVon(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

/** Der Tarifname, wie er auf der Abo-Seite steht. */
export function paketName(tier: string | null | undefined): string {
  return (tier && TIER_LABEL[tier as Tier]) || "Mitgliedschaft";
}

interface ProfilKurz {
  full_name: string | null;
  username: string | null;
  membership_tier: string | null;
  is_paid: boolean | null;
  access_until: string | null;
  unsubscribed_at: string | null;
}

async function ladeProfilKurz(supabase: SupabaseClient, userId: string): Promise<ProfilKurz | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name,username,membership_tier,is_paid,access_until,unsubscribed_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn(`[zahlung] Profil nicht lesbar (user=${userId}): ${error.message}`);
    return null;
  }
  return (data as ProfilKurz | null) ?? null;
}

/** Die Adresse aus `auth.users` — `profiles` hat keine E-Mail-Spalte. */
export async function ladeEmail(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) return null;
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

function vornameAus(profil: ProfilKurz | null): string {
  const roh = (profil?.full_name || profil?.username || "").trim().split(/\s+/)[0];
  return roh || "du";
}

/**
 * Darf der Lifetime-Hinweis in diese Nachricht? Ja, wenn die Person Werbung
 * nicht widersprochen hat und Lifetime für sie kaufbar ist
 * (`pruefeLifetimeAngebot`). **Wirft nie**: Im Zweifel ohne Hinweis.
 */
export async function lifetimeFuer(userId: string, profil: { unsubscribed_at: string | null } | null): Promise<string | null> {
  if (!profil || profil.unsubscribed_at) return null;
  try {
    const { pruefeLifetimeAngebot } = await import("@/lib/access-control/lifetime-offer");
    const angebot = await pruefeLifetimeAngebot(userId);
    return angebot.erlaubt ? lifetimeHinweis(getAppUrl()) : null;
  } catch (err) {
    console.warn(`[zahlung] Lifetime-Prüfung fehlgeschlagen (user=${userId}):`, err);
    return null;
  }
}

/**
 * Die Bausteine für den Nachrichtentext zu einem Fall.
 *
 * Der Vorname kommt aus dem Profil und nicht aus Stripe (dort steht die
 * Rechnungsangabe, manchmal in Grossbuchstaben oder als Firma). Fehlt er, heisst
 * die Anrede „du": „Hey null" wäre schlimmer als keine.
 */
export async function ladeNachrichtDaten(
  supabase: SupabaseClient,
  p: {
    userId: string;
    betragCents: number;
    paket: string | null;
    zahlungUrl: string | null;
    tageBisSperre?: number;
    /** Wann der Zugang ruht. Fehlt er, rechnet die Funktion sieben Tage ab heute. */
    frist?: string | null;
  },
): Promise<NachrichtDaten & { werbungErlaubt: boolean }> {
  const profil = await ladeProfilKurz(supabase, p.userId);
  const appUrl = getAppUrl();

  let mitDiscord = false;
  try {
    mitDiscord = Boolean(await discordIdRoh(supabase, p.userId));
  } catch {
    mitDiscord = false;
  }

  return {
    name: vornameAus(profil),
    paket: p.paket || paketName(profil?.membership_tier),
    betrag: euroVon(p.betragCents),
    // Stripes Rechnungsseite kann beides, zahlen und Karte wechseln. Ohne sie
    // die Abo-Seite, die zum Stripe-Portal führt.
    url: p.zahlungUrl || `${appUrl}/einstellungen/abonnement`,
    appUrl,
    tageBisSperre: p.tageBisSperre,
    fristDatum: datumVon(p.frist ?? Date.now() + FRIST_TAGE * TAG_MS),
    mitDiscord,
    warteraum: Boolean(warteraumRolleId()),
    lifetime: await lifetimeFuer(p.userId, profil),
    werbungErlaubt: Boolean(profil && !profil.unsubscribed_at),
  };
}

/* ── Meldungen ans Team ────────────────────────────────────────────────────── */

/**
 * „Bei jemandem ist die Abbuchung geplatzt." **Wirft nie** — sie läuft im
 * Stripe-Webhook.
 */
export async function meldeZahlungsfallAnTeam(
  supabase: SupabaseClient,
  p: { fallId: string; userId: string; name: string; paket: string; betrag: string; versuche: number; frist: string },
): Promise<void> {
  try {
    const email = (await ladeEmail(supabase, p.userId)) ?? "ohne Adresse";
    const { sendZahlungsfallIntern } = await import("@/lib/email/templates/zahlungsfall-intern");
    await sendZahlungsfallIntern({
      an: TEAM_POSTFACH,
      art: "neu",
      fallId: p.fallId,
      name: p.name,
      email,
      paket: p.paket,
      betrag: p.betrag,
      versuche: p.versuche,
      frist: p.frist,
    });
  } catch (err) {
    console.warn(`[zahlung] Interne Meldung nicht verschickt (Fall ${p.fallId}):`, err);
  }
}

/**
 * „Der Kunde hat auf seinen Zahlungsfall geantwortet." **Wirft nie.**
 *
 * Ohne diese Meldung hinge alles daran, dass jemand in den Adminbereich
 * schaut — während im Hintergrund die Sieben-Tage-Uhr läuft. Der
 * Interaktions-Endpunkt ruft sie über `after()` auf, also erst nach seiner
 * Antwort an Discord: Die drei Sekunden gehören dem Kunden, nicht Resend.
 */
export async function meldeAntwortAnTeam(
  supabase: SupabaseClient,
  p: { fallId: string; userId: string; text: string },
): Promise<void> {
  try {
    const [profil, email] = await Promise.all([ladeProfilKurz(supabase, p.userId), ladeEmail(supabase, p.userId)]);
    const { sendZahlungsfallIntern } = await import("@/lib/email/templates/zahlungsfall-intern");
    await sendZahlungsfallIntern({
      an: TEAM_POSTFACH,
      art: "antwort",
      fallId: p.fallId,
      name: (profil?.full_name || profil?.username || "").trim() || "Ohne Namen",
      email: email ?? "ohne Adresse",
      auszug: p.text.slice(0, 600),
    });
  } catch (err) {
    console.warn(`[zahlung] Meldung über Kundenantwort nicht verschickt (Fall ${p.fallId}):`, err);
  }
}

/* ── Fall eröffnen ─────────────────────────────────────────────────────────── */

export interface FallEroeffnen {
  userId: string;
  stripeInvoiceId: string;
  stripeSubscriptionId: string | null;
  betragCents: number;
  waehrung: string;
  versuche: number;
  /** Tarifname zum Zeitpunkt des Fehlversuchs, für den Nachrichtentext. */
  paket?: string | null;
  /** Stripes `hosted_invoice_url`: zahlen und Karte ändern in einem Schritt. */
  zahlungUrl?: string | null;
  /**
   * Läuft ab sofort die Sieben-Tage-Uhr?
   *
   * **Keine Nachricht, keine Uhr.** Der Webhook setzt sie, denn dort geht im
   * selben Zug die erste Nachricht raus. Die Probe setzt sie nicht: Sonst
   * sperrte der Nachtlauf eine Woche später das eigene Testkonto. Im
   * Schwesterprojekt stand genau dieser Fehler in der Probe-Route.
   */
  mitFrist?: boolean;
}

/**
 * Einen Fall anlegen oder den vorhandenen fortschreiben.
 *
 * Stripe schickt `invoice.payment_failed` bei **jedem** Wiederholungsversuch.
 * Beim zweiten und jedem weiteren Versuch wandert nur die Zahl der Versuche
 * mit; Status, Aufschub, Frist und Verlauf bleiben unangetastet. Leere Felder
 * (Paket, Zahllink) werden nachgetragen, gefüllte nie überschrieben: Was der
 * Kunde in der ersten Nachricht gelesen hat, soll in der Erinnerung dasselbe
 * sein.
 *
 * Gibt die Fall-ID zurück, oder `null`, wenn etwas schiefging (etwa weil
 * Migration 080 noch fehlt).
 */
export async function eroeffneZahlungsfall(
  supabase: SupabaseClient,
  p: FallEroeffnen,
): Promise<{ fallId: string; neu: boolean; frist: string | null } | null> {
  try {
    const { data: vorhanden, error: leseFehler } = await supabase
      .from("zahlungsfall")
      .select("id,paket,zahlung_url,frist")
      .eq("stripe_invoice_id", p.stripeInvoiceId)
      .maybeSingle();

    if (leseFehler) {
      console.warn(`[zahlung] Fall nicht lesbar (${p.stripeInvoiceId}): ${leseFehler.code ?? ""} ${leseFehler.message}`);
      return null;
    }

    if (vorhanden) {
      const zeile = vorhanden as { id: string; paket: string | null; zahlung_url: string | null; frist: string | null };
      const nachtrag: Record<string, unknown> = { versuche: p.versuche };
      if (!zeile.paket && p.paket) nachtrag.paket = p.paket;
      if (!zeile.zahlung_url && p.zahlungUrl) nachtrag.zahlung_url = p.zahlungUrl;

      const { error } = await supabase.from("zahlungsfall").update(nachtrag).eq("id", zeile.id);
      if (error) console.warn(`[zahlung] Fall nicht aktualisierbar: ${error.message}`);
      return { fallId: zeile.id, neu: false, frist: zeile.frist };
    }

    /*
      Die Frist wird beim Anlegen festgeschrieben und nicht bei jedem Lauf neu
      gerechnet. Wer die Stripe-Einstellung später ändert, verschiebt damit
      nicht rückwirkend die Frist, die einem Kunden schon genannt wurde.
    */
    const frist = p.mitFrist === false ? null : new Date(Date.now() + FRIST_TAGE * TAG_MS).toISOString();

    const { data, error } = await supabase
      .from("zahlungsfall")
      .insert({
        user_id: p.userId,
        stripe_invoice_id: p.stripeInvoiceId,
        stripe_subscription_id: p.stripeSubscriptionId,
        betrag_cents: p.betragCents,
        waehrung: p.waehrung,
        versuche: p.versuche,
        frist,
        paket: p.paket ?? null,
        zahlung_url: p.zahlungUrl ?? null,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      // 23505: Zwei Zustellungen desselben Ereignisses gleichzeitig. Dann gibt
      // es den Fall schon, und zwar aus dem anderen Aufruf — der verschickt auch
      // die Nachricht.
      if (error.code === "23505") {
        const { data: doch } = await supabase
          .from("zahlungsfall")
          .select("id,frist")
          .eq("stripe_invoice_id", p.stripeInvoiceId)
          .maybeSingle();
        const z = doch as { id: string; frist: string | null } | null;
        return z ? { fallId: z.id, neu: false, frist: z.frist } : null;
      }
      console.warn(`[zahlung] Fall nicht anlegbar (${p.stripeInvoiceId}): ${error.code ?? ""} ${error.message}`);
      return null;
    }

    return data ? { fallId: (data as { id: string }).id, neu: true, frist } : null;
  } catch (err) {
    console.warn("[zahlung] Fall nicht anlegbar:", err);
    return null;
  }
}

/* ── Verlauf und Nachrichten ───────────────────────────────────────────────── */

export interface NachrichtSchreiben {
  fallId: string;
  vonAdmin: boolean;
  autorId: string | null;
  text: string;
  kanal: "discord" | "mail" | "notiz" | "system";
  zugestellt?: boolean | null;
  mailGesendet?: boolean | null;
}

/**
 * Eine Zeile in den Verlauf schreiben.
 *
 * `letzte_nachricht_am` wandert **nur bei einer echten Nachricht** mit, nicht
 * bei einer Systemzeile oder Notiz — sonst zählte die Wartezeit in der Liste ab
 * einem Klick statt ab einer Nachricht.
 */
export async function schreibeVerlauf(supabase: SupabaseClient, n: NachrichtSchreiben): Promise<boolean> {
  const { error } = await supabase.from("zahlungsfall_nachricht").insert({
    fall_id: n.fallId,
    von_admin: n.vonAdmin,
    autor_id: n.autorId,
    text: n.text,
    kanal: n.kanal,
    zugestellt: n.zugestellt ?? null,
    mail_gesendet: n.mailGesendet ?? null,
  });

  if (error) {
    console.warn(`[zahlung] Verlaufszeile nicht schreibbar (Fall ${n.fallId}): ${error.message}`);
    return false;
  }

  if (n.kanal === "discord" || n.kanal === "mail") {
    const { error: stempelFehler } = await supabase
      .from("zahlungsfall")
      .update({ letzte_nachricht_am: new Date().toISOString() })
      .eq("id", n.fallId);
    if (stempelFehler) console.warn(`[zahlung] Zeitstempel nicht setzbar: ${stempelFehler.message}`);
  }

  return true;
}

export interface FallMail {
  betreff: string;
  ueberschrift: string;
  knopfText: string;
  knopfUrl: string;
  /**
   * Der Text **für die Mail**, in Absätzen — aus derselben Funktion wie die
   * Direktnachricht, nur mit `kanal: "mail"`. Die Anrede („Hey …") und der
   * nackte Zahllink fallen heraus, weil die Mail beides selbst trägt
   * (Überschrift und Knopf).
   */
  absaetze: string[];
  /** Die Mail trägt einen Werbehinweis (Lifetime) und bekommt deshalb den Abmeldelink. */
  mitAbmeldung?: boolean;
}

/** Mail zum Fall. **Wirft nie**; gibt zurück, ob sie rausging. */
export async function sendeFallMail(supabase: SupabaseClient, userId: string, mail: FallMail): Promise<boolean> {
  try {
    const an = await ladeEmail(supabase, userId);
    if (!an) {
      console.warn(`[zahlung] Keine Adresse für user=${userId}, Mail entfällt.`);
      return false;
    }

    const absaetze = mail.absaetze
      .map((absatz) =>
        absatz
          .split("\n")
          .filter((zeile) => zeile.trim() !== mail.knopfUrl && !zeile.startsWith("Hey "))
          .join("\n")
          .trim(),
      )
      .filter(Boolean);

    let abmeldeToken: string | undefined;
    if (mail.mitAbmeldung) {
      const { generateUnsubscribeToken } = await import("@/lib/email/unsubscribe-token");
      abmeldeToken = generateUnsubscribeToken(userId);
    }

    const { sendZahlungNachricht } = await import("@/lib/email/templates/zahlung-nachricht");
    await sendZahlungNachricht({
      an,
      betreff: mail.betreff,
      ueberschrift: mail.ueberschrift,
      absaetze,
      knopfText: mail.knopfText,
      knopfUrl: mail.knopfUrl,
      abmeldeToken,
    });
    return true;
  } catch (err) {
    console.warn(`[zahlung] Mail nicht verschickt (user=${userId}):`, err);
    return false;
  }
}

/**
 * Eine Nachricht zum Fall verschicken und im Verlauf festhalten.
 *
 * **Die Mail zuerst**, und unabhängig davon, ob Discord überhaupt eingerichtet
 * ist. Danach die Direktnachricht, immer mit dem Knopf „Antworten": Er ist der
 * einzige Rückweg, den es gibt.
 *
 * Gibt zurück, was angekommen ist. `dm` ist `null`, wenn keine Direktnachricht
 * versucht wurde (kein Discord verknüpft, widersprochen, Bot nicht
 * eingerichtet); `mail` ist `null`, wenn keine Mail vorgesehen war.
 */
export async function sendeFallNachricht(
  supabase: SupabaseClient,
  p: {
    fallId: string;
    userId: string;
    text: string;
    autorId: string | null;
    vonAdmin: boolean;
    /** Pflicht bei den automatischen Nachrichten; bei einer Antwort von Hand optional. */
    mail?: FallMail;
  },
): Promise<{ dm: boolean | null; mail: boolean | null }> {
  const mail = p.mail ? await sendeFallMail(supabase, p.userId, p.mail) : null;

  const discordId = await discordIdFuerNachricht(supabase, p.userId);
  let dm: boolean | null = null;
  if (discordId) {
    dm = await sendeDirektnachricht(discordId, p.text, [
      { customId: `${KNOPF_ZAHLUNG_ANTWORT}:${p.fallId}`, label: "Antworten" },
    ]);
  }

  await schreibeVerlauf(supabase, {
    fallId: p.fallId,
    vonAdmin: p.vonAdmin,
    autorId: p.autorId,
    text: p.text,
    kanal: dm === null ? "mail" : "discord",
    zugestellt: dm,
    mailGesendet: mail,
  });

  return { dm, mail };
}

/* ── Der Rückweg des Kunden ────────────────────────────────────────────────── */

/**
 * Der jüngste Zahlungsfall einer Person, offen oder geschlossen.
 *
 * Auch geschlossene, weil der Warteraum ausschliesslich aus geschlossenen
 * Fällen besteht: Wer dort sitzt, hat per Definition keinen offenen Fall mehr.
 * **Wirft nie**: `null` heisst „kein Fall", und der Aufrufer bietet dann ein
 * Support-Ticket an.
 */
export async function juengsterFall(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("zahlungsfall")
      .select("id")
      .eq("user_id", userId)
      .order("eroeffnet_am", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`[zahlung] Fall zu user=${userId} nicht lesbar: ${error.code ?? ""} ${error.message}`);
      return null;
    }
    return (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.warn(`[zahlung] Fall zu user=${userId} nicht lesbar:`, err);
    return null;
  }
}

/**
 * Was der Kunde über den Antworten-Knopf geschrieben hat.
 *
 * ── Die Fall-Nummer aus dem Anfragekörper ist kein Berechtigungsnachweis ────
 *
 * Sie steckt in der `custom_id` eines Knopfes von uns, kommt aber über die
 * Leitung. Die Abfrage verlangt deshalb, dass der Fall **diesem Konto** gehört.
 *
 * ── Ein geschlossener Fall geht durch eine Antwort wieder auf ─────────────
 *
 * Ausgerechnet nach der Sperre ist eine Antwort am wahrscheinlichsten. Der
 * Status geht auf `offen`, die Frist bleibt **leer**: Der Fall soll gelesen
 * werden, nicht wieder mahnen.
 *
 * Die Meldung ans Team schickt der Aufrufer (über `after()`), nicht diese
 * Funktion — der Interaktions-Endpunkt hat drei Sekunden.
 */
export async function schreibeKundenAntwort(
  supabase: SupabaseClient,
  p: { userId: string; fallId: string; text: string },
): Promise<{ ok: boolean; fehler?: "nicht_gefunden" | "leer" | "fehler" }> {
  const text = p.text.trim();
  if (!text) return { ok: false, fehler: "leer" };

  const { data, error } = await supabase
    .from("zahlungsfall")
    .select("id,geschlossen_am")
    .eq("id", p.fallId)
    .eq("user_id", p.userId)
    .maybeSingle();

  if (error) {
    console.warn(`[zahlung] Fall nicht lesbar (${p.fallId}): ${error.message}`);
    return { ok: false, fehler: "fehler" };
  }
  if (!data) return { ok: false, fehler: "nicht_gefunden" };

  const geschrieben = await schreibeVerlauf(supabase, {
    fallId: p.fallId,
    vonAdmin: false,
    autorId: p.userId,
    text: text.slice(0, 4000),
    kanal: "discord",
  });
  if (!geschrieben) return { ok: false, fehler: "fehler" };

  if ((data as { geschlossen_am: string | null }).geschlossen_am) {
    const { error: aufFehler } = await supabase
      .from("zahlungsfall")
      .update({ status: "offen", geschlossen_am: null, geschlossen_grund: null, frist: null })
      .eq("id", p.fallId);
    if (aufFehler) console.warn(`[zahlung] Fall ${p.fallId} nicht wieder zu öffnen: ${aufFehler.message}`);
  }

  return { ok: true };
}

/* ── Der Nachtlauf ─────────────────────────────────────────────────────────── */

export interface FristBericht {
  erinnert: number;
  gesperrt: number;
  weiterZugang: number;
  /** Fälle, die geschlossen wurden, weil die Person wieder Zugang hat. */
  uebersprungen: number;
  fehler: string[];
}

interface OffenerFall {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  betrag_cents: number;
  frist: string | null;
  erinnerungen: number;
  paket: string | null;
  zahlung_url: string | null;
  status: ZahlungsfallStatus;
  eroeffnet_am: string;
}

/**
 * Einen Fall schliessen, weil die Person auf anderem Weg wieder Zugang hat
 * (neues Abo, Lifetime). Der häufigste gute Ausgang. Die Rechnung bleibt bei
 * Stripe stehen, gemahnt wird nicht mehr. Wirft bei einem Schreibfehler.
 */
async function schliesseWegenAnderemZugang(supabase: SupabaseClient, fallId: string, grund: string): Promise<void> {
  const { data, error } = await supabase
    .from("zahlungsfall")
    .update({
      status: "beendet",
      geschlossen_am: new Date().toISOString(),
      geschlossen_grund: `Nicht weiterverfolgt: ${grund}`,
    })
    .eq("id", fallId)
    .eq("status", "offen")
    .select("id");

  if (error) throw new Error(`Fall ${fallId} nicht schliessbar: ${error.message}`);
  if ((data ?? []).length === 0) return;

  await schreibeVerlauf(supabase, {
    fallId,
    vonAdmin: true,
    autorId: null,
    text: `Keine Erinnerung mehr: ${grund} Die offene Rechnung bleibt davon unberührt.`,
    kanal: "system",
  });
}

/**
 * Der Sieben-Tage-Ablauf: erinnern und am Ende sperren.
 *
 * Für jeden offenen Fall mit Frist (ohne Aufschub): an Tag 3 und Tag 5 eine
 * Erinnerung, an Tag 7 ruht der Zugang. **Kein Rauswurf vom Server** — der
 * kommt frühestens `KARENZ_TAGE` später und nur über den eigenen Lauf.
 *
 * ── Warum gezählt und nicht gerechnet wird ──────────────────────────────────
 *
 * `erinnerungen` ist ein Zähler. Läuft der Cron zweimal an einem Tag oder holt
 * er einen ausgefallenen Tag nach, bekommt niemand dieselbe Nachricht zweimal.
 * Vergangene Tage zählen ab der Eröffnung, nicht zurückgerechnet aus der Frist
 * (die Rückrechnung war im Schwesterprojekt um einen Tag verschoben).
 */
export async function fuehreFristAus(supabase: SupabaseClient): Promise<FristBericht> {
  const bericht: FristBericht = { erinnert: 0, gesperrt: 0, weiterZugang: 0, uebersprungen: 0, fehler: [] };
  const jetzt = Date.now();

  const { data, error } = await supabase
    .from("zahlungsfall")
    .select("id,user_id,stripe_subscription_id,betrag_cents,frist,erinnerungen,paket,zahlung_url,status,eroeffnet_am")
    .is("geschlossen_am", null)
    .eq("status", "offen")
    .not("frist", "is", null);

  if (error) {
    // Fehlt die Tabelle (Migration 080), gibt es schlicht nichts zu tun.
    if (error.code === "PGRST205" || error.code === "42P01") return bericht;
    bericht.fehler.push(`Offene Fälle nicht lesbar: ${error.code ?? ""} ${error.message}`);
    return bericht;
  }

  for (const fall of (data ?? []) as OffenerFall[]) {
    if (!fall.frist) continue;
    const fristMs = new Date(fall.frist).getTime();
    const tageBisSperre = Math.ceil((fristMs - jetzt) / TAG_MS);
    const vergangen = Math.floor((jetzt - new Date(fall.eroeffnet_am).getTime()) / TAG_MS);

    try {
      /*
        Vor jeder Handlung: Hat die Person inzwischen wieder Zugang über einen
        anderen Vertrag? Dann weder erinnern noch sperren. Wirft
        `hatAnderenZugang`, fängt der `catch` unten den Fall ab und lässt die
        Person in Ruhe — ein Fall, der eine Nacht später bearbeitet wird,
        kostet nichts.
      */
      const anderer = await hatAnderenZugang(supabase, fall.user_id, fall.stripe_subscription_id);
      if (anderer) {
        await schliesseWegenAnderemZugang(supabase, fall.id, anderer);
        bericht.uebersprungen++;
        continue;
      }

      /*
        Ist der Zugang schon vorher geendet (etwa weil das Abo bei Stripe
        beendet wurde), stimmt „in X Tagen ruht dein Zugang" nicht mehr. Dann
        wird sofort gesperrt, mit dem passenden Text.
      */
      const profil = await ladeProfilKurz(supabase, fall.user_id);
      const zugangNoch = profil
        ? evaluateAccess({
            membership_tier: profil.membership_tier as AccessTier | null,
            is_paid: profil.is_paid,
            access_until: profil.access_until,
          }).hasAccess
        : false;

      if (fristMs <= jetzt || !zugangNoch) {
        await sperreFall(supabase, fall, bericht);
        continue;
      }

      const faelligerTag = ERINNERUNG_TAGE[fall.erinnerungen];
      if (faelligerTag === undefined || vergangen < faelligerTag) continue;

      const daten = await ladeNachrichtDaten(supabase, {
        userId: fall.user_id,
        betragCents: fall.betrag_cents,
        paket: fall.paket,
        zahlungUrl: fall.zahlung_url,
        tageBisSperre,
        frist: fall.frist,
      });

      await sendeFallNachricht(supabase, {
        fallId: fall.id,
        userId: fall.user_id,
        text: nachrichtErinnerung(daten),
        autorId: null,
        vonAdmin: true,
        mail: {
          betreff: `Offene Zahlung über ${daten.betrag}`,
          ueberschrift: `Hey ${daten.name}, deine Zahlung ist noch offen`,
          knopfText: "Jetzt bezahlen",
          knopfUrl: daten.url,
          absaetze: nachrichtErinnerung(daten, "mail").split("\n\n"),
          mitAbmeldung: Boolean(daten.lifetime),
        },
      });

      /*
        Der Zähler muss stimmen, sonst geht dieselbe Erinnerung morgen wieder
        raus. Deshalb steht ein Fehler im Bericht und nicht nur im Protokoll.
      */
      const { error: zaehlFehler } = await supabase
        .from("zahlungsfall")
        .update({ erinnerungen: fall.erinnerungen + 1, letzte_erinnerung_am: new Date().toISOString() })
        .eq("id", fall.id);
      if (zaehlFehler) bericht.fehler.push(`Zähler für Fall ${fall.id}: ${zaehlFehler.message}`);

      bericht.erinnert++;
    } catch (err) {
      bericht.fehler.push(`Fall ${fall.id}: ${(err as Error).message}`);
    }
  }

  return bericht;
}

/**
 * Den Zugang ruhen lassen, wenn die Frist abgelaufen ist. Wirft bei einem
 * Fehler in `hatAnderenZugang` (der Aufrufer fängt je Fall).
 *
 * ── `.select("id")` ist die Sicherung, nicht der Statusfilter ──────────────
 *
 * Zwischen der Auswahl und diesem Update können Minuten liegen. Trifft in
 * dieses Fenster ein `invoice.paid` oder ein Aufschub, darf nichts mehr
 * passieren. PostgREST antwortet auf ein Update ohne Treffer aber **ohne**
 * Fehler — erst `.select("id")` macht den Filter sichtbar.
 */
async function sperreFall(supabase: SupabaseClient, fall: OffenerFall, bericht: FristBericht): Promise<void> {
  const anderer = await hatAnderenZugang(supabase, fall.user_id, fall.stripe_subscription_id);
  const jetztIso = new Date().toISOString();

  const { data: geaendert, error } = await supabase
    .from("zahlungsfall")
    .update({
      status: "beendet",
      geschlossen_am: jetztIso,
      geschlossen_grund: anderer
        ? "Frist abgelaufen, Zugang läuft über einen anderen Vertrag"
        : "Frist abgelaufen, Zugang ruht",
    })
    .eq("id", fall.id)
    .eq("status", "offen")
    .select("id");

  if (error) {
    bericht.fehler.push(`Fall ${fall.id} nicht schliessbar: ${error.message}`);
    return;
  }
  if ((geaendert ?? []).length === 0) {
    // Jemand war schneller: bezahlt, gestundet oder von Hand geschlossen.
    bericht.uebersprungen++;
    return;
  }

  if (anderer) {
    bericht.weiterZugang++;
    await schreibeVerlauf(supabase, {
      fallId: fall.id,
      vonAdmin: true,
      autorId: null,
      text: `Frist abgelaufen. Der Zugang bleibt trotzdem bestehen: ${anderer}`,
      kanal: "system",
    });
    return;
  }

  await entziehZugang(supabase, fall.user_id, jetztIso, bericht);

  const profil = await ladeProfilKurz(supabase, fall.user_id);
  const aboBeendet = (profil?.membership_tier ?? "free") === "free";
  const daten = {
    ...(await ladeNachrichtDaten(supabase, {
      userId: fall.user_id,
      betragCents: fall.betrag_cents,
      paket: fall.paket,
      zahlungUrl: aboBeendet ? null : fall.zahlung_url,
      frist: fall.frist,
    })),
    aboBeendet,
  };

  /*
    Die Nachricht geht **vor** dem Rollenentzug raus: Solange die Person die
    Rolle hat, teilt der Bot sicher einen Server mit ihr.
  */
  await sendeFallNachricht(supabase, {
    fallId: fall.id,
    userId: fall.user_id,
    text: nachrichtGesperrt(daten),
    autorId: null,
    vonAdmin: true,
    mail: {
      betreff: "Dein Zugang ruht, bis die Rechnung beglichen ist",
      ueberschrift: `Hey ${daten.name}, dein Zugang ruht`,
      knopfText: aboBeendet ? "Wieder einsteigen" : "Rechnung bezahlen",
      knopfUrl: daten.url,
      absaetze: nachrichtGesperrt(daten, "mail").split("\n\n"),
      mitAbmeldung: Boolean(daten.lifetime),
    },
  });

  const { synchronisiereRollen } = await import("@/lib/discord/mitgliedschaft");
  const rollenOk = await synchronisiereRollen(supabase, fall.user_id, false, "Zahlungsfrist abgelaufen");

  /*
    Der Warteraum, **nach** dem Entzug. Die Bedingungen stehen in
    `inDenWarteraum` und nicht hier: Dieselbe Entscheidung trifft auch
    `subscription.deleted`, und zwei Fassungen liefen auseinander.
  */
  const { inDenWarteraum } = await import("@/lib/discord/warteraum");
  const imWarteraum = await inDenWarteraum(supabase, fall.user_id, "Zahlungsfrist abgelaufen");

  await schreibeVerlauf(supabase, {
    fallId: fall.id,
    vonAdmin: true,
    autorId: null,
    text:
      "Frist abgelaufen: Zugang zum Mitgliederbereich beendet (access_until = jetzt). " +
      (rollenOk ? "Mitgliederrolle entzogen" : "Mitgliederrolle nicht bestätigt, bitte in Discord nachsehen") +
      (imWarteraum ? ", Warteraum gesetzt." : ", kein Warteraum (nicht verknüpft, nicht eingerichtet oder Fehler)."),
    kanal: "system",
  });

  bericht.gesperrt++;
}

/**
 * Den Zugang im Profil beenden: `is_paid` falsch, `access_until` auf jetzt —
 * aber nie nach hinten verschieben, falls er schon früher endete. Die Stufe
 * bleibt stehen (siehe Kopf der Datei).
 */
async function entziehZugang(
  supabase: SupabaseClient,
  userId: string,
  jetztIso: string,
  bericht: { fehler: string[] },
): Promise<void> {
  const profil = await ladeProfilKurz(supabase, userId);
  const bisher = profil?.access_until ? new Date(profil.access_until) : null;
  const ziel = bisher && !Number.isNaN(bisher.getTime()) && bisher.toISOString() < jetztIso ? bisher.toISOString() : jetztIso;

  const { error } = await supabase.from("profiles").update({ is_paid: false, access_until: ziel }).eq("id", userId);
  if (error) bericht.fehler.push(`Profil ${userId}: ${error.message}`);
}

export interface AblaufBericht {
  geprueft: number;
  beendet: number;
  zugangEntzogen: number;
  weiterZugang: number;
  fehler: string[];
}

/**
 * Abgelaufene Aufschübe beenden. Der nächtliche Lauf.
 *
 * Wer einen Aufschub hatte und nicht bezahlt hat, wird behandelt wie am
 * siebten Tag: Zugang beendet, Rolle weg, Warteraum, dieselbe Nachricht.
 * Vorher wird nachgesehen, ob es inzwischen einen anderen Zugang gibt — sonst
 * nähme der Lauf einem Neukunden den Zugang wegen einer alten Rechnung.
 */
export async function beendeAbgelaufeneAufschuebe(supabase: SupabaseClient): Promise<AblaufBericht> {
  const bericht: AblaufBericht = { geprueft: 0, beendet: 0, zugangEntzogen: 0, weiterZugang: 0, fehler: [] };
  const jetzt = new Date().toISOString();

  const { data, error } = await supabase
    .from("zahlungsfall")
    .select("id,user_id,stripe_subscription_id,betrag_cents,paket,zahlung_url,aufschub_bis")
    .eq("status", "aufschub")
    .lt("aufschub_bis", jetzt);

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return bericht;
    bericht.fehler.push(`Fälle nicht lesbar: ${error.code ?? ""} ${error.message}`);
    return bericht;
  }

  const faellig = (data ?? []) as Array<{
    id: string;
    user_id: string;
    stripe_subscription_id: string | null;
    betrag_cents: number;
    paket: string | null;
    zahlung_url: string | null;
    aufschub_bis: string;
  }>;
  bericht.geprueft = faellig.length;

  for (const fall of faellig) {
    /*
      Erst schliessen, dann Rollen abgleichen. Andersherum sähe
      `laufenderAufschub` den Fall noch als laufend, und der Entzug bliebe
      wirkungslos.
    */
    const { data: geaendert, error: schliessFehler } = await supabase
      .from("zahlungsfall")
      .update({ status: "beendet", geschlossen_am: jetzt, geschlossen_grund: "Aufschub abgelaufen, nicht bezahlt" })
      .eq("id", fall.id)
      .eq("status", "aufschub")
      .select("id");

    if (schliessFehler) {
      bericht.fehler.push(`Fall ${fall.id}: ${schliessFehler.message}`);
      continue;
    }
    if ((geaendert ?? []).length === 0) continue;
    bericht.beendet++;

    let anderer: string | null;
    try {
      anderer = await hatAnderenZugang(supabase, fall.user_id, fall.stripe_subscription_id);
    } catch (err) {
      // Nicht prüfbar heisst nicht entziehen. Das ist der niedrigere Preis.
      bericht.fehler.push(`Fall ${fall.id}: ${(err as Error).message}`);
      continue;
    }
    if (anderer) {
      bericht.weiterZugang++;
      await schreibeVerlauf(supabase, {
        fallId: fall.id,
        vonAdmin: true,
        autorId: null,
        text: `Aufschub abgelaufen. Der Zugang bleibt trotzdem bestehen: ${anderer}`,
        kanal: "system",
      });
      continue;
    }

    const vorher = bericht.fehler.length;
    await entziehZugang(supabase, fall.user_id, jetzt, bericht);
    if (bericht.fehler.length === vorher) bericht.zugangEntzogen++;

    const daten = await ladeNachrichtDaten(supabase, {
      userId: fall.user_id,
      betragCents: fall.betrag_cents,
      paket: fall.paket,
      zahlungUrl: fall.zahlung_url,
      frist: jetzt,
    });
    await sendeFallNachricht(supabase, {
      fallId: fall.id,
      userId: fall.user_id,
      text: nachrichtGesperrt(daten),
      autorId: null,
      vonAdmin: true,
      mail: {
        betreff: "Dein Zugang ruht, bis die Rechnung beglichen ist",
        ueberschrift: `Hey ${daten.name}, dein Zugang ruht`,
        knopfText: "Rechnung bezahlen",
        knopfUrl: daten.url,
        absaetze: nachrichtGesperrt(daten, "mail").split("\n\n"),
        mitAbmeldung: Boolean(daten.lifetime),
      },
    });

    const { synchronisiereRollen } = await import("@/lib/discord/mitgliedschaft");
    await synchronisiereRollen(supabase, fall.user_id, false, "Aufschub abgelaufen");
    const { inDenWarteraum } = await import("@/lib/discord/warteraum");
    const imWarteraum = await inDenWarteraum(supabase, fall.user_id, "Aufschub abgelaufen");

    await schreibeVerlauf(supabase, {
      fallId: fall.id,
      vonAdmin: true,
      autorId: null,
      text:
        "Aufschub abgelaufen und nicht bezahlt. Zugang und Mitgliederrolle entzogen" +
        (imWarteraum ? ", Warteraum gesetzt." : "."),
      kanal: "system",
    });
  }

  return bericht;
}

/**
 * Hat diese Person neben dem Fall noch einen anderen Zugang?
 *
 * Gibt den Grund als Satz zurück (für den Verlauf) oder `null`. Gezählt wird:
 * Lifetime, 1:1-Mentoring, oder ein **anderes** laufendes Abo. Das Abo des
 * Falls selbst zählt nicht — steht es bei uns noch auf `active`, weil ein
 * Webhook hinterherhängt, schlösse der Lauf sonst jeden Fall am ersten Tag.
 *
 * ── Ein Abfragefehler darf hier nicht „kein Zugang" heissen ───────────────
 *
 * supabase-js wirft nicht, es gibt Fehler zurück. Ohne Auswertung lautete die
 * Antwort bei jedem Ausfall „kein anderer Zugang", und der Lauf sperrte in
 * dieser Nacht jeden Fälligen, auch die mit laufendem Abo. Deshalb wird
 * geworfen; der Aufrufer fängt es je Fall und lässt die Person in Ruhe.
 */
export async function hatAnderenZugang(
  supabase: SupabaseClient,
  userId: string,
  ausserAboId?: string | null,
): Promise<string | null> {
  const [profilRes, aboRes] = await Promise.all([
    supabase.from("profiles").select("membership_tier").eq("id", userId).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("stripe_subscription_id,status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"]),
  ]);

  if (profilRes.error) {
    throw new Error(`Zugang nicht prüfbar (profiles, user=${userId}): ${profilRes.error.message}`);
  }
  if (aboRes.error) {
    throw new Error(`Zugang nicht prüfbar (subscriptions, user=${userId}): ${aboRes.error.message}`);
  }

  const tier = (profilRes.data as { membership_tier: string | null } | null)?.membership_tier ?? null;
  if (tier === "lifetime") return "Lifetime-Zugang besteht.";
  if (tier === "ht_1on1") return "Zugang über das 1:1-Mentoring.";

  const andere = ((aboRes.data ?? []) as Array<{ stripe_subscription_id: string }>).filter(
    (a) => !ausserAboId || a.stripe_subscription_id !== ausserAboId,
  );
  if (andere.length > 0) return "Es läuft ein anderes Abo.";
  return null;
}

/**
 * Die Rechnung ist doch bezahlt worden. Aufgerufen aus `invoice.paid`.
 *
 * Auch ein bereits geschlossener Fall wird auf „bezahlt" gesetzt: Stripes
 * Wiederholungen laufen unter Umständen länger als unsere Frist, und wer am
 * zehnten Tag zahlt, soll nicht dauerhaft unter „Zugang ruht" stehen.
 * `geschlossen_am` bleibt dann der Zeitpunkt der Sperre, der Verlauf sagt beides.
 *
 * Den Zugang stellt der Webhook selbst her (`access_until` aus der neuen
 * Periode), die Rolle `synchronisiereNachProfil`. **Wirft nie.**
 */
export async function schliesseFallZuRechnung(supabase: SupabaseClient, stripeInvoiceId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("zahlungsfall")
      .select("id,status")
      .eq("stripe_invoice_id", stripeInvoiceId)
      .maybeSingle();

    if (error) {
      if (error.code !== "PGRST205" && error.code !== "42P01") {
        console.warn(`[zahlung] Fall nicht lesbar (${stripeInvoiceId}): ${error.code ?? ""} ${error.message}`);
      }
      return;
    }
    if (!data) return;

    const fall = data as { id: string; status: ZahlungsfallStatus };
    if (fall.status === "bezahlt") return;

    const { error: updateFehler } = await supabase
      .from("zahlungsfall")
      .update({ status: "bezahlt", geschlossen_am: new Date().toISOString(), geschlossen_grund: "Rechnung bezahlt" })
      .eq("id", fall.id);

    if (updateFehler) {
      console.warn(`[zahlung] Fall nicht schliessbar (${stripeInvoiceId}): ${updateFehler.message}`);
      return;
    }

    await schreibeVerlauf(supabase, {
      fallId: fall.id,
      vonAdmin: true,
      autorId: null,
      text: "Die Rechnung ist bezahlt worden. Der Fall wurde automatisch geschlossen.",
      kanal: "system",
    });
  } catch (err) {
    console.warn("[zahlung] Fall nicht schliessbar:", err);
  }
}

/**
 * Alle offenen Fälle einer Person schliessen, weil sie jetzt anderweitig
 * Zugang hat — aufgerufen nach einem Lifetime-Kauf. **Wirft nie.**
 */
export async function schliesseOffeneFaelle(supabase: SupabaseClient, userId: string, grund: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("zahlungsfall")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "offen")
      .is("geschlossen_am", null);
    if (error) {
      if (error.code !== "PGRST205" && error.code !== "42P01") {
        console.warn(`[zahlung] Offene Fälle nicht lesbar (user=${userId}): ${error.message}`);
      }
      return 0;
    }
    let geschlossen = 0;
    for (const f of (data ?? []) as Array<{ id: string }>) {
      try {
        await schliesseWegenAnderemZugang(supabase, f.id, grund);
        geschlossen++;
      } catch (err) {
        console.warn(`[zahlung] Fall ${f.id} nicht schliessbar:`, err);
      }
    }
    return geschlossen;
  } catch (err) {
    console.warn(`[zahlung] Offene Fälle nicht schliessbar (user=${userId}):`, err);
    return 0;
  }
}
