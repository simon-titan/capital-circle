import { NextResponse } from "next/server";
import {
  RUECKGEWINNUNG_KAMPAGNE,
  RUECKGEWINNUNG_STUFE,
  rueckgewinnungDirektnachricht,
} from "@/config/rueckgewinnung";
import { cronBefugt } from "@/lib/cron/auth";
import { sendeDirektnachricht } from "@/lib/discord/api";
import { abmeldeUrl } from "@/lib/email/abmeldung";
import { sendRueckgewinnungLifetime } from "@/lib/email/templates/rueckgewinnung-lifetime";
import { istRueckgewinnungMailAn, setzeRueckgewinnungMail } from "@/lib/rueckgewinnung/schalter";
import { getAppUrl } from "@/lib/site-url";
import { lifetimePriceId } from "@/lib/stripe/plan-map";
import { requireAdminRole } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Eine Seite Empfänger mit Pausen je Person. */
export const maxDuration = 300;

/**
 * Die vorbereitete Rückgewinnungs-Kampagne „Lifetime" — **nicht ausgelöst**.
 *
 * Nach dem Muster der NQ-Kampagne aus MoonTrading. Entscheidung Simon,
 * 19.09.2026: Ehemalige werden vorerst nicht beworben; diese Route steht
 * bereit, bis jemand sie bewusst aufruft.
 *
 *   GET   Trockenlauf: Empfängerkreis mit Zählung, nichts wird verschickt.
 *   POST  { nurAn: "<eigene Adresse>" }  → Einzeltest (umgeht Kreis und Merkliste)
 *   POST  { limit: 25 }                  → scharf, höchstens 100 je Aufruf
 *   PUT   { rueckgewinnungMail: true|false } → Schalter der automatischen
 *         14-Tage-Mail (`app/api/cron/reactivation-offers`)
 *
 * ── Wer beworben wird ───────────────────────────────────────────────────────
 *
 * Wer **je gezahlt hat** (ein Abo in `subscriptions` oder eine erfolgreiche
 * Zahlung), heute keinen Zugang hat (`is_paid` falsch, kein Admin, kein
 * Lifetime/1:1), Werbung nicht widersprochen hat (`unsubscribed_at` leer) und
 * diese Stufe noch nicht bekommen hat (`kampagne_versand`). Wer nie gezahlt
 * hat, bekommt nichts: Lifetime ist kein Einstiegsprodukt, und für ihn wäre
 * es kaltes Anschreiben.
 *
 * ── Drei Pflichtprüfungen vor jeder Nachricht ───────────────────────────────
 *
 * 1. `unsubscribed_at` (§ 7 Abs. 3 UWG) — Mail mit Abmeldelink und Hinweis.
 * 2. `discord_dm_widerspruch` zusätzlich für die Direktnachricht.
 * 3. `kampagne_versand` als Merkliste: Ein abgebrochener Lauf darf erneut
 *    gestartet werden, ohne jemandem zweimal zu schreiben.
 *
 * Zugang: Admin-Sitzung (Rolle „admin") oder `Authorization: Bearer $CRON_SECRET`
 * (fail-closed). **Kein Cron** — ein Datum im Code wäre eine Zusage.
 */

/** Resend-Ratelimit (2 Anfragen pro Sekunde im Standardtarif). */
const MAIL_PAUSE_MS = 600;
/** Pause zwischen zwei Direktnachrichten: Derselbe Bot trägt Mahnungen und Warteraum. */
const DM_PAUSE_MS = 1200;

const schlafen = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function befugt(request: Request): Promise<{ fehler: NextResponse | null; userId: string | null }> {
  if (cronBefugt(request)) return { fehler: null, userId: null };
  const { user, error } = await requireAdminRole("admin");
  return { fehler: error, userId: user?.id ?? null };
}

interface Empfaenger {
  userId: string;
  email: string;
  vorname: string | null;
  discordId: string | null;
  dmWiderspruch: boolean;
}

interface Kreis {
  offen: Empfaenger[];
  jeGezahlt: number;
  mitZugang: number;
  widerspruch: number;
  ohneAdresse: number;
  bereitsGesendet: number;
}

function vornameAus(name: string | null): string | null {
  const erstes = name?.trim().split(/\s+/)[0];
  return erstes ? erstes : null;
}

/**
 * Stellt den Empfängerkreis zusammen, ohne etwas zu ändern. Wirft bei
 * Fehlern: Eine Abfrage, die leer zurückkommt, sähe sonst aus wie „niemand
 * offen" — oder, schlimmer, eine leere Merkliste wie „noch niemand beschrieben".
 */
async function ladeKreis(): Promise<Kreis> {
  const supabase = createServiceClient();

  const [aboRes, zahlungRes, merkRes] = await Promise.all([
    supabase.from("subscriptions").select("user_id").limit(20000),
    supabase.from("payments").select("user_id").eq("status", "succeeded").not("user_id", "is", null).limit(20000),
    supabase
      .from("kampagne_versand")
      .select("email")
      .eq("kampagne", RUECKGEWINNUNG_KAMPAGNE)
      .eq("stufe", RUECKGEWINNUNG_STUFE)
      .limit(20000),
  ]);
  if (aboRes.error) throw new Error(`subscriptions nicht lesbar: ${aboRes.error.message}`);
  if (zahlungRes.error) throw new Error(`payments nicht lesbar: ${zahlungRes.error.message}`);
  if (merkRes.error) throw new Error(`kampagne_versand nicht lesbar (Migration 082?): ${merkRes.error.message}`);

  const jeGezahlt = new Set<string>();
  for (const z of [...(aboRes.data ?? []), ...(zahlungRes.data ?? [])] as Array<{ user_id: string | null }>) {
    if (z.user_id) jeGezahlt.add(z.user_id);
  }
  const kreis: Kreis = { offen: [], jeGezahlt: jeGezahlt.size, mitZugang: 0, widerspruch: 0, ohneAdresse: 0, bereitsGesendet: 0 };
  if (jeGezahlt.size === 0) return kreis;

  const ids = [...jeGezahlt];
  const profile: Array<{
    id: string;
    full_name: string | null;
    is_paid: boolean | null;
    is_admin: boolean | null;
    membership_tier: string | null;
    unsubscribed_at: string | null;
    discord_id: string | null;
    discord_dm_widerspruch: boolean | null;
  }> = [];
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,is_paid,is_admin,membership_tier,unsubscribed_at,discord_id,discord_dm_widerspruch")
      .in("id", ids.slice(i, i + 300));
    if (error) throw new Error(`profiles nicht lesbar (Migration 081?): ${error.message}`);
    profile.push(...((data ?? []) as typeof profile));
  }

  const { data: verbindungen, error: vFehler } = await supabase
    .from("discord_connections")
    .select("user_id,discord_user_id")
    .in("user_id", ids);
  if (vFehler) throw new Error(`discord_connections nicht lesbar: ${vFehler.message}`);
  const discordJeUser = new Map(((verbindungen ?? []) as Array<{ user_id: string; discord_user_id: string }>).map((v) => [v.user_id, v.discord_user_id]));

  // Adressen aus `auth.users`, seitenweise (`profiles` hat keine E-Mail-Spalte).
  const emailJeUser = new Map<string, string>();
  for (let seite = 1; seite <= 50; seite++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: seite, perPage: 1000 });
    if (error) throw new Error(`Konten nicht lesbar: ${error.message}`);
    for (const u of data.users) if (u.email) emailJeUser.set(u.id, u.email.trim().toLowerCase());
    if (data.users.length < 1000) break;
  }

  const schonGehabt = new Set(((merkRes.data ?? []) as Array<{ email: string }>).map((m) => m.email.trim().toLowerCase()));
  const gesehen = new Set<string>();

  for (const p of profile) {
    const dauer = p.membership_tier === "lifetime" || p.membership_tier === "ht_1on1";
    if (p.is_paid || p.is_admin || dauer) {
      kreis.mitZugang++;
      continue;
    }
    if (p.unsubscribed_at) {
      kreis.widerspruch++;
      continue;
    }
    const email = emailJeUser.get(p.id);
    if (!email) {
      kreis.ohneAdresse++;
      continue;
    }
    if (schonGehabt.has(email)) {
      kreis.bereitsGesendet++;
      continue;
    }
    if (gesehen.has(email)) continue;
    gesehen.add(email);
    kreis.offen.push({
      userId: p.id,
      email,
      vorname: vornameAus(p.full_name),
      discordId: discordJeUser.get(p.id) ?? p.discord_id ?? null,
      dmWiderspruch: Boolean(p.discord_dm_widerspruch),
    });
  }
  return kreis;
}

/** Was den Versand von vornherein verbietet. */
function hindernis(): string | null {
  try {
    abmeldeUrl({ userId: "00000000-0000-0000-0000-000000000000", email: "probe@example.com" });
  } catch {
    return "Der Abmeldeweg ist nicht verfügbar (UNSUBSCRIBE_TOKEN_SECRET/SUPABASE_SERVICE_ROLE_KEY fehlt). Ohne ihn wird nichts verschickt.";
  }
  if (!lifetimePriceId()) {
    return "STRIPE_PRICE_LIFETIME ist nicht gesetzt. Ohne Preis kann niemand Lifetime kaufen — die Kampagne liefe ins Leere.";
  }
  return null;
}

export async function GET(request: Request) {
  const { fehler } = await befugt(request);
  if (fehler) return fehler;
  try {
    const kreis = await ladeKreis();
    return NextResponse.json({
      ok: true,
      probe: true,
      kampagne: RUECKGEWINNUNG_KAMPAGNE,
      stufe: RUECKGEWINNUNG_STUFE,
      hindernis: hindernis(),
      rueckgewinnungMailAutomatisch: await istRueckgewinnungMailAn(createServiceClient()),
      jeGezahlt: kreis.jeGezahlt,
      mitZugang: kreis.mitZugang,
      widerspruch: kreis.widerspruch,
      ohneAdresse: kreis.ohneAdresse,
      bereitsGesendet: kreis.bereitsGesendet,
      offen: kreis.offen.length,
      mitDiscord: kreis.offen.filter((e) => e.discordId && !e.dmWiderspruch).length,
      vorschau: kreis.offen.slice(0, 10).map((e) => e.email),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

/** Der Schalter der automatischen Rückgewinnungs-Mail. */
export async function PUT(request: Request) {
  const { fehler, userId } = await befugt(request);
  if (fehler) return fehler;
  const body = (await request.json().catch(() => ({}))) as { rueckgewinnungMail?: unknown };
  if (typeof body.rueckgewinnungMail !== "boolean") {
    return NextResponse.json({ ok: false, error: "rueckgewinnungMail muss true oder false sein." }, { status: 400 });
  }
  const ergebnis = await setzeRueckgewinnungMail(createServiceClient(), body.rueckgewinnungMail, userId);
  return ergebnis.ok
    ? NextResponse.json({ ok: true, rueckgewinnungMail: body.rueckgewinnungMail })
    : NextResponse.json({ ok: false, error: ergebnis.fehler }, { status: 500 });
}

interface ZeileErgebnis {
  email: string;
  mail: "gesendet" | "fehler";
  dm: "gesendet" | "uebersprungen" | "fehler";
  detail?: string;
}

/** Scharf. Verschickt Mail und Direktnachricht. */
export async function POST(request: Request) {
  const { fehler } = await befugt(request);
  if (fehler) return fehler;

  const blocker = hindernis();
  if (blocker) return NextResponse.json({ ok: false, error: blocker }, { status: 409 });

  const body = ((await request.json().catch(() => ({}))) ?? {}) as { nurAn?: string; limit?: number; replyTo?: string };
  const appUrl = getAppUrl();
  const supabase = createServiceClient();

  /*
    ── Einzeltest an die eigene Adresse ─────────────────────────────────────

    Umgeht Kreis und Merkliste. Pflicht vor dem echten Versand: Was der Bot
    verschickt, kann still scheitern, ohne dass bei uns eine Fehlermeldung
    ankommt.
  */
  if (body.nurAn?.trim()) {
    const an = body.nurAn.trim().toLowerCase();
    const { findeUserIdZuEmail } = await import("@/lib/checkout/user-lookup");
    const userId = await findeUserIdZuEmail(supabase, an).catch(() => null);
    let vorname: string | null = null;
    let discordId: string | null = null;
    if (userId) {
      const { data } = await supabase.from("profiles").select("full_name,discord_id").eq("id", userId).maybeSingle();
      vorname = vornameAus((data as { full_name: string | null } | null)?.full_name ?? null);
      discordId = (data as { discord_id: string | null } | null)?.discord_id ?? null;
    }
    const link = abmeldeUrl({ userId, email: an });
    let mailOk = true;
    let detail: string | undefined;
    try {
      await sendRueckgewinnungLifetime({ an, vorname, abmeldeLink: link, replyTo: body.replyTo });
    } catch (err) {
      mailOk = false;
      detail = (err as Error).message;
    }
    const dm: ZeileErgebnis["dm"] = discordId
      ? (await sendeDirektnachricht(discordId, rueckgewinnungDirektnachricht({ vorname, appUrl, abmeldeLink: link })))
        ? "gesendet"
        : "fehler"
      : "uebersprungen";
    return NextResponse.json({ ok: mailOk, einzeln: true, email: an, mail: mailOk ? "gesendet" : "fehler", dm, detail });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 100);
  let kreis: Kreis;
  try {
    kreis = await ladeKreis();
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }

  const dran = kreis.offen.slice(0, limit);
  const ergebnisse: ZeileErgebnis[] = [];

  for (const [i, e] of dran.entries()) {
    const link = abmeldeUrl({ userId: e.userId, email: e.email });
    let mail: ZeileErgebnis["mail"] = "gesendet";
    let detail: string | undefined;
    let resendId: string | null = null;
    try {
      const res = await sendRueckgewinnungLifetime({ an: e.email, vorname: e.vorname, abmeldeLink: link, replyTo: body.replyTo });
      resendId = res.resendMessageId ?? null;
    } catch (err) {
      mail = "fehler";
      detail = (err as Error).message;
    }

    // Die Direktnachricht läuft auch, wenn die Mail scheiterte: zwei unabhängige Wege.
    let dm: ZeileErgebnis["dm"] = "uebersprungen";
    if (e.discordId && !e.dmWiderspruch) {
      dm = (await sendeDirektnachricht(e.discordId, rueckgewinnungDirektnachricht({ vorname: e.vorname, appUrl, abmeldeLink: link })))
        ? "gesendet"
        : "fehler";
      await schlafen(DM_PAUSE_MS);
    }

    /*
      Vermerken, sobald überhaupt etwas rausging. Scheitert der Eintrag,
      bekommt der Empfänger beim nächsten Lauf erneut Post — doppelt ist hier
      das kleinere Übel gegenüber einer still übersprungenen halben Liste.
    */
    if (mail === "gesendet" || dm === "gesendet") {
      const { error } = await supabase.from("kampagne_versand").insert({
        kampagne: RUECKGEWINNUNG_KAMPAGNE,
        stufe: RUECKGEWINNUNG_STUFE,
        email: e.email,
        user_id: e.userId,
        mail_gesendet: mail === "gesendet",
        dm_gesendet: dm === "gesendet",
        resend_message_id: resendId,
      });
      if (error) detail = `${detail ? `${detail}; ` : ""}versendet, aber nicht vermerkt: ${error.message}`;
    }

    ergebnisse.push({ email: e.email, mail, dm, detail });
    if (i < dran.length - 1) await schlafen(MAIL_PAUSE_MS);
  }

  return NextResponse.json({
    ok: true,
    kampagne: RUECKGEWINNUNG_KAMPAGNE,
    stufe: RUECKGEWINNUNG_STUFE,
    bearbeitet: ergebnisse.length,
    mails: ergebnisse.filter((r) => r.mail === "gesendet").length,
    direktnachrichten: ergebnisse.filter((r) => r.dm === "gesendet").length,
    fehler: ergebnisse.filter((r) => r.mail === "fehler" || r.dm === "fehler").length,
    verbleibend: Math.max(kreis.offen.length - ergebnisse.length, 0),
    zeilen: ergebnisse,
  });
}
