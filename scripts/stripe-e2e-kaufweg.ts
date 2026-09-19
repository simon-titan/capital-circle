/**
 * Ende-zu-Ende-Test des Kaufwegs im Stripe-**Testmodus** — ohne Dev-Server.
 *
 *   npm run stripe:e2e                 alle Szenarien, danach Aufräumen
 *   npm run stripe:e2e -- a d          nur ausgewählte Szenarien (a–h)
 *   npm run stripe:e2e -- --aufraeumen nur Reste früherer Läufe entfernen
 *
 * ── Was hier echt ist ──────────────────────────────────────────────────────
 * Stripe-Objekte (Customer, Abo, Rechnungen, Test Clocks) entstehen wirklich
 * im Testmodus. Die daraus entstehenden **echten Events** holt das Skript per
 * `stripe.events.list`, signiert sie mit `STRIPE_WEBHOOK_SECRET` und übergibt
 * sie der echten Route `POST /api/stripe/webhook` — Signaturprüfung,
 * Idempotenz-Log `stripe_webhook_events` und Handler laufen also genau so wie
 * bei einer Zustellung durch Stripe. Die Zugangsprüfung ruft die echte
 * `proxy()`-Funktion mit echten Sitzungs-Cookies auf.
 *
 * Nicht erzeugbar ist `checkout.session.completed`: Eine Kasse lässt sich ohne
 * Browser nicht bezahlen. Das Event schreibt nur den Trichter fort; ein per API
 * angelegtes Abo erzeugt dieselben Subscription- und Invoice-Events wie die
 * Kasse. Die Variante mit `payment_behavior: "default_incomplete"` bildet die
 * Reihenfolge der Kasse nach: Abo entsteht `incomplete`, wird nach der Zahlung
 * per `customer.subscription.updated` aktiv.
 *
 * ── Warum Next-Interna hier kein Problem sind ──────────────────────────────
 * Route und Proxy importieren nur `next/server` (NextRequest/NextResponse) —
 * das läuft in reinem Node. `@/lib/supabase/server` zieht `next/headers`, ruft
 * `cookies()` im Webhook-Pfad aber nie auf. `server-only` kommt in der Kette
 * nicht vor. Gestartet wird mit `tsx`, das die `@/`-Pfade aus `tsconfig.json`
 * auflöst und die `.tsx`-Mailvorlagen übersetzt.
 *
 * ── Datenbank = Produktion ─────────────────────────────────────────────────
 * Es gibt keine Staging-Datenbank. Das Skript legt deshalb ausschließlich
 * Konten mit Resend-Testadressen `delivered+cc-e2e-<n>@resend.dev` an (Resend
 * stellt dorthin nicht zu) und räumt im `finally` alles wieder ab: Konten,
 * Profile, Abo-/Zahlungs-/Mail-/Kündigungszeilen, Webhook-Log, Stripe-Kunden
 * und Test Clocks. Am Ende steht eine Restabfrage, die leer sein muss.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Die Umgebung MUSS vor den Projektmodulen geladen sein; die werden deshalb
// unten dynamisch importiert und nicht oben statisch.
for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (existsSync(p)) dotenv.config({ path: p, override: false, quiet: true } as dotenv.DotenvConfigOptions);
}

// ── Harte Sperre ────────────────────────────────────────────────────────────
// Ein Live-Schlüssel hier hieße: echte Kunden, echte Abbuchungen. Kein Flag,
// keine Ausnahme — das Skript startet schlicht nicht.
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
if (!STRIPE_KEY.startsWith("sk_test_")) {
  console.error("ABBRUCH: STRIPE_SECRET_KEY ist kein Testschlüssel (sk_test_…). Dieses Skript läuft nur im Testmodus.");
  process.exit(2);
}
if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
  console.error("ABBRUCH: STRIPE_WEBHOOK_SECRET fehlt — ohne das lassen sich die Events nicht signiert zustellen.");
  process.exit(2);
}

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Kennzeichnung der Testdaten ─────────────────────────────────────────────
const MAIL_MUSTER = /^delivered\+cc-e2e-\d+@resend\.dev$/;
const mail = (n: number) => `delivered+cc-e2e-${n}@resend.dev`;
const CLOCK_PREFIX = "cc-e2e-";
const MAX_NUMMER = 30;
const APP_URL = "http://localhost:3000";

// ── Ergebnis-Protokoll ──────────────────────────────────────────────────────
interface Pruefung {
  szenario: string;
  text: string;
  ok: boolean;
  detail?: string;
}
const pruefungen: Pruefung[] = [];
let aktuellesSzenario = "";

function pruefe(ok: boolean, text: string, detail?: string) {
  pruefungen.push({ szenario: aktuellesSzenario, text, ok, detail });
  console.log(`   ${ok ? "OK  " : "FEHL"} ${text}${detail ? `  (${detail})` : ""}`);
}

function info(text: string) {
  console.log(`   ·   ${text}`);
}

// ── Laufzeit-Kontext ────────────────────────────────────────────────────────
interface Ctx {
  stripe: Stripe;
  sb: SupabaseClient;
  POST: typeof import("@/app/api/stripe/webhook/route")["POST"];
  handleStripeEvent: typeof import("@/lib/stripe/webhooks/handler")["handleStripeEvent"];
  proxy: typeof import("@/proxy")["proxy"];
  evaluateAccess: typeof import("@/lib/access-control/has-access")["evaluateAccess"];
  NextRequest: typeof import("next/server")["NextRequest"];
  createServerClient: typeof import("@supabase/ssr")["createServerClient"];
  createAnonClient: () => SupabaseClient;
  resendGet: (id: string) => Promise<{ html: string | null; to: string[]; last_event: string } | null>;
  /** Unix-Sekunden, ab denen Events als „aus diesem Lauf" gelten. */
  t0: number;
  /** Alle Event-IDs, die in diesem Lauf zugestellt wurden — fürs Aufräumen. */
  zugestellt: Set<string>;
  /** Pro Customer: schon zugestellte Events, damit jeder Schritt nur Neues liefert. */
  gesehen: Map<string, Set<string>>;
}

async function ladeKontext(): Promise<Ctx> {
  const { default: StripeKlasse } = await import("stripe");
  const { createClient } = await import("@supabase/supabase-js");
  const { createServerClient } = await import("@supabase/ssr");
  const { NextRequest } = await import("next/server");
  const { POST } = await import("@/app/api/stripe/webhook/route");
  const { handleStripeEvent } = await import("@/lib/stripe/webhooks/handler");
  const { proxy } = await import("@/proxy");
  const { evaluateAccess } = await import("@/lib/access-control/has-access");
  const { STRIPE_API_VERSION } = await import("@/lib/stripe/server");
  const { Resend } = await import("resend");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resend = new Resend(process.env.RESEND_API_KEY!.trim());

  /*
    Absenderdomain prüfen. Ist sie im Resend-Konto nicht verifiziert, scheitert
    JEDE Mail — die Willkommensmail wird dann still verschluckt (so gewollt,
    siehe `sendeWillkommensmail`), und der Test könnte nicht mehr prüfen, ob sie
    einen Passwort-Link trägt. Für den Testlauf weicht das Skript deshalb auf
    Resends geteilten Testabsender aus; der Befund selbst wird laut gemeldet,
    denn in der Produktion gäbe es dieselbe Stille.
  */
  const absenderDomain = process.env.RESEND_FROM_EMAIL?.trim().split("@")[1] ?? "";
  const { data: domains } = await resend.domains.list();
  const domain = domains?.data?.find((d) => d.name === absenderDomain);
  if (domain?.status !== "verified") {
    console.warn(
      `WARNUNG: Absenderdomain "${absenderDomain}" ist im Resend-Konto nicht verifiziert (Status: ${domain?.status ?? "fehlt"}). ` +
        "Mit diesem Schlüssel geht KEINE Mail raus. Testlauf nutzt ersatzweise onboarding@resend.dev.",
    );
    process.env.RESEND_FROM_EMAIL = "onboarding@resend.dev";
  }

  return {
    stripe: new StripeKlasse(STRIPE_KEY, { apiVersion: STRIPE_API_VERSION }),
    sb,
    POST,
    handleStripeEvent,
    proxy,
    evaluateAccess,
    NextRequest,
    createServerClient,
    createAnonClient: () =>
      createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    resendGet: async (id) => {
      const { data } = await resend.emails.get(id);
      return data ? { html: data.html, to: data.to, last_event: data.last_event } : null;
    },
    t0: Math.floor(Date.now() / 1000) - 5,
    zugestellt: new Set(),
    gesehen: new Map(),
  };
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Stripe-Hilfen ───────────────────────────────────────────────────────────

function kundeVon(ev: Stripe.Event): string | null {
  const o = ev.data.object as { object?: string; id?: string; customer?: string | { id: string } | null };
  if (o.object === "customer") return o.id ?? null;
  if (typeof o.customer === "string") return o.customer;
  return o.customer?.id ?? null;
}

/**
 * Neue Events eines Kunden abholen — in Erzeugungsreihenfolge.
 *
 * `events.list` liefert neueste zuerst; umgedreht ist das die beste
 * Annäherung an die Reihenfolge, in der Stripe sie erzeugt hat. Gewartet wird,
 * bis `fertig` zufrieden ist: Events erscheinen mit ein paar Sekunden Verzug.
 */
async function holeEvents(
  ctx: Ctx,
  kundeId: string,
  fertig: (evs: Stripe.Event[]) => boolean,
  timeoutMs = 90_000,
): Promise<Stripe.Event[]> {
  const gesehen = ctx.gesehen.get(kundeId) ?? new Set<string>();
  ctx.gesehen.set(kundeId, gesehen);
  const start = Date.now();
  let neu: Stripe.Event[] = [];
  for (;;) {
    const alle: Stripe.Event[] = [];
    for await (const ev of ctx.stripe.events.list({ created: { gte: ctx.t0 }, limit: 100 })) {
      if (kundeVon(ev) === kundeId && !gesehen.has(ev.id)) alle.push(ev);
    }
    neu = alle.reverse();
    if (fertig(neu)) break;
    if (Date.now() - start > timeoutMs) {
      info(`Zeitlimit beim Warten auf Events (${neu.map((e) => e.type).join(", ") || "keine"})`);
      break;
    }
    await pause(3000);
  }
  for (const ev of neu) gesehen.add(ev.id);
  return neu;
}

const hat = (...typen: string[]) => (evs: Stripe.Event[]) => typen.every((t) => evs.some((e) => e.type === t));

interface Zustellung {
  ev: Stripe.Event;
  status: number;
  body: Record<string, unknown>;
}

/** Ein Event signiert an die echte Route geben — exakt wie Stripe es tut. */
async function zustellen(ctx: Ctx, ev: Stripe.Event): Promise<Zustellung> {
  const payload = JSON.stringify(ev);
  const header = ctx.stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!.trim(),
  });
  const req = new ctx.NextRequest(`${APP_URL}/api/stripe/webhook`, {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": header, "content-type": "application/json" },
  });
  ctx.zugestellt.add(ev.id);
  const res = await ctx.POST(req);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ev, status: res.status, body };
}

/**
 * Events der Reihe nach zustellen und — wie Stripe — fehlgeschlagene
 * (Status ≠ 2xx) danach erneut schicken, höchstens dreimal.
 */
async function zustellenMitWiederholung(ctx: Ctx, evs: Stripe.Event[], etikett = ""): Promise<Zustellung[]> {
  const ergebnisse: Zustellung[] = [];
  let offen = evs;
  for (let runde = 0; runde < 4 && offen.length; runde++) {
    const fehlgeschlagen: Stripe.Event[] = [];
    for (const ev of offen) {
      const z = await zustellen(ctx, ev);
      ergebnisse.push(z);
      if (z.status >= 300) fehlgeschlagen.push(ev);
    }
    if (fehlgeschlagen.length) {
      info(
        `${etikett}Runde ${runde + 1}: ${fehlgeschlagen.length} Event(s) mit Fehler → Stripe würde wiederholen: ` +
          fehlgeschlagen
            .map((e) => `${e.type} [${String(ergebnisse.find((x) => x.ev.id === e.id && x.status >= 300)?.body.detail ?? "").slice(0, 120)}]`)
            .join("; "),
      );
      await pause(1500);
    }
    offen = fehlgeschlagen;
  }
  if (offen.length) pruefe(false, `${etikett}alle Events nach Wiederholung verarbeitet`, `${offen.length} bleiben mit Fehler`);
  return ergebnisse;
}

interface Kauf {
  kunde: Stripe.Customer;
  abo: Stripe.Subscription;
  pmId: string;
}

/**
 * Abo so anlegen, wie es die Kasse aus `/go/<plan>` täte.
 *
 * `checkoutArtig`: Abo entsteht `incomplete` und wird erst durch die Zahlung
 * aktiv — die Reihenfolge der gehosteten Kasse. Sonst synchron bezahlt, dann
 * kommt schon `customer.subscription.created` als `active`.
 */
async function kaufen(
  ctx: Ctx,
  opts: {
    email: string;
    plan: "monthly" | "quarterly" | "yearly";
    checkoutArtig: boolean;
    kundeId?: string;
    testClock?: string;
    metadata?: Record<string, string>;
    name?: string;
  },
): Promise<Kauf> {
  const { priceIdForPlan } = await import("@/lib/stripe/plan-map");
  const kunde = opts.kundeId
    ? ((await ctx.stripe.customers.retrieve(opts.kundeId)) as Stripe.Customer)
    : await ctx.stripe.customers.create({
        email: opts.email,
        name: opts.name ?? "Erika Testkauf",
        ...(opts.testClock ? { test_clock: opts.testClock } : {}),
      });
  const pm = await ctx.stripe.paymentMethods.attach("pm_card_visa", { customer: kunde.id });
  await ctx.stripe.customers.update(kunde.id, { invoice_settings: { default_payment_method: pm.id } });

  // Dieselben Metadaten, die `/go/<plan>` in `subscription_data.metadata` setzt.
  const metadata = { plan: opts.plan, src: "cc-e2e", ...(opts.metadata ?? {}) };
  let abo = await ctx.stripe.subscriptions.create({
    customer: kunde.id,
    items: [{ price: priceIdForPlan(opts.plan) }],
    default_payment_method: pm.id,
    payment_behavior: opts.checkoutArtig ? "default_incomplete" : "allow_incomplete",
    metadata,
  });
  if (opts.checkoutArtig) {
    const rechnungId = typeof abo.latest_invoice === "string" ? abo.latest_invoice : abo.latest_invoice?.id;
    if (!rechnungId) throw new Error(`Abo ${abo.id} ohne erste Rechnung`);
    await ctx.stripe.invoices.pay(rechnungId, { payment_method: pm.id });
    abo = await ctx.stripe.subscriptions.retrieve(abo.id);
  }
  return { kunde, abo, pmId: pm.id };
}

async function vorspulen(ctx: Ctx, clockId: string, bisUnix: number) {
  await ctx.stripe.testHelpers.testClocks.advance(clockId, { frozen_time: bisUnix });
  const start = Date.now();
  for (;;) {
    const c = await ctx.stripe.testHelpers.testClocks.retrieve(clockId);
    if (c.status === "ready") return;
    if (c.status === "internal_failure") throw new Error(`Test Clock ${clockId}: internal_failure`);
    if (Date.now() - start > 180_000) throw new Error(`Test Clock ${clockId} nach 3 min nicht bereit`);
    await pause(2500);
  }
}

function periodenEnde(abo: Stripe.Subscription): number {
  const item = abo.items.data[0] as Stripe.SubscriptionItem & { current_period_end?: number };
  if (typeof item.current_period_end !== "number") throw new Error(`Abo ${abo.id} ohne current_period_end`);
  return item.current_period_end;
}

// ── Datenbank-Hilfen ────────────────────────────────────────────────────────

async function alleTestNutzer(sb: SupabaseClient): Promise<Array<{ id: string; email: string; last_sign_in_at: string | null }>> {
  const treffer: Array<{ id: string; email: string; last_sign_in_at: string | null }> = [];
  for (let seite = 1; seite <= 50; seite++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: seite, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) {
      if (u.email && MAIL_MUSTER.test(u.email)) {
        treffer.push({ id: u.id, email: u.email, last_sign_in_at: u.last_sign_in_at ?? null });
      }
    }
    if (data.users.length < 200) break;
  }
  return treffer;
}

async function nutzerZuMail(sb: SupabaseClient, email: string) {
  return (await alleTestNutzer(sb)).filter((u) => u.email === email);
}

interface Zustand {
  userIds: string[];
  userId: string | null;
  lastSignIn: string | null;
  profil: Record<string, unknown> | null;
  abos: Array<Record<string, unknown>>;
  zahlungen: Array<Record<string, unknown>>;
  mails: Array<Record<string, unknown>>;
  kuendigungen: number;
}

async function zustand(sb: SupabaseClient, email: string): Promise<Zustand> {
  const nutzer = await nutzerZuMail(sb, email);
  const userId = nutzer[0]?.id ?? null;
  const leer = { data: [] as Array<Record<string, unknown>> };
  const [profil, abos, zahlungen, mails, kuend] = await Promise.all([
    userId
      ? sb
          .from("profiles")
          .select(
            "membership_tier,is_paid,access_until,stripe_customer_id,application_status,codex_accepted,usage_agreement_accepted,payment_failed_email_1_sent_at,payment_failed_email_2_sent_at,full_name,username",
          )
          .eq("id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    userId ? sb.from("subscriptions").select("stripe_subscription_id,status,current_period_end,cancel_at_period_end").eq("user_id", userId) : Promise.resolve(leer),
    userId ? sb.from("payments").select("stripe_invoice_id,status,amount_cents,paid_at").eq("user_id", userId) : Promise.resolve(leer),
    sb.from("email_sequence_log").select("sequence,step,resend_message_id").eq("recipient_email", email),
    userId ? sb.from("cancellations").select("id").eq("user_id", userId) : Promise.resolve(leer),
  ]);
  return {
    userIds: nutzer.map((n) => n.id),
    userId,
    lastSignIn: nutzer[0]?.last_sign_in_at ?? null,
    profil: (profil.data as Record<string, unknown> | null) ?? null,
    abos: (abos.data as Array<Record<string, unknown>>) ?? [],
    zahlungen: (zahlungen.data as Array<Record<string, unknown>>) ?? [],
    mails: (mails.data as Array<Record<string, unknown>>) ?? [],
    kuendigungen: (kuend.data as unknown[] | null)?.length ?? 0,
  };
}

const iso = (unix: number) => new Date(unix * 1000).toISOString();
const gleicheZeit = (a: unknown, bUnix: number, toleranzS = 5) =>
  typeof a === "string" && Math.abs(new Date(a).getTime() / 1000 - bUnix) <= toleranzS;

/** Willkommensmail aus Resend holen: gibt es sie, und trägt sie einen Passwort-Link? */
async function willkommensmail(ctx: Ctx, z: Zustand): Promise<{ anzahl: number; link: string | null; dashboardKnopf: boolean }> {
  const eintraege = z.mails.filter((m) => m.sequence === "paid_welcome");
  const id = eintraege[0]?.resend_message_id as string | undefined;
  if (!id) return { anzahl: eintraege.length, link: null, dashboardKnopf: false };
  let html: string | null = null;
  for (let i = 0; i < 5 && !html; i++) {
    html = (await ctx.resendGet(id))?.html ?? null;
    if (!html) await pause(1500);
  }
  const treffer = html?.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/);
  const link = treffer ? treffer[1].replace(/&amp;/g, "&") : null;
  return { anzahl: eintraege.length, link, dashboardKnopf: Boolean(html?.includes("/dashboard")) };
}

/** Den Passwort-Link so einlösen, wie es `/auth/confirm` tut (verifyOtp mit token_hash). */
async function linkGueltig(ctx: Ctx, link: string): Promise<{ ok: boolean; fehler?: string; ziel?: string }> {
  const u = new URL(link);
  const tokenHash = u.searchParams.get("token_hash");
  if (!tokenHash) return { ok: false, fehler: "kein token_hash" };
  const { error } = await ctx.createAnonClient().auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  return error ? { ok: false, fehler: error.message } : { ok: true, ziel: u.searchParams.get("next") ?? undefined };
}

// ── Zugang: echte proxy()-Entscheidung mit echter Sitzung ───────────────────

async function sitzungsCookies(ctx: Ctx, email: string, passwort: string): Promise<string> {
  const jar = new Map<string, string>();
  const client = ctx.createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (liste) => liste.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
      },
    },
  );
  const { error } = await client.auth.signInWithPassword({ email, password: passwort });
  if (error) throw new Error(`Anmeldung ${email}: ${error.message}`);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

/** Wohin schickt `proxy()` diese Sitzung für `pfad`? `null` = durchgelassen. */
async function proxyZiel(ctx: Ctx, cookies: string, pfad: string): Promise<string | null> {
  const res = await ctx.proxy(new ctx.NextRequest(`${APP_URL}${pfad}`, { headers: { cookie: cookies } }));
  const ort = res.headers.get("location");
  return ort ? new URL(ort).pathname : null;
}

/**
 * Den kompletten Weg nach dem Kauf nachgehen: Passwort setzen (wie
 * `/api/checkout/zugang`), anmelden, Proxy fragen, Onboarding durchlaufen
 * (Codex + Nutzungsvereinbarung mit der Sitzung des Nutzers, wie die
 * Onboarding-Schritte es tun), Proxy erneut fragen.
 */
async function zugangNachKauf(ctx: Ctx, email: string, opts: { passwortSetzen: boolean; passwort: string }) {
  const z = await zustand(ctx.sb, email);
  if (!z.userId) {
    pruefe(false, "Konto für Zugangsprüfung vorhanden");
    return;
  }
  if (opts.passwortSetzen) {
    const { error } = await ctx.sb.auth.admin.updateUserById(z.userId, { password: opts.passwort });
    if (error) throw new Error(`Passwort setzen: ${error.message}`);
  }
  const cookies = await sitzungsCookies(ctx, email, opts.passwort);

  const vorher: Record<string, string | null> = {};
  for (const pfad of ["/dashboard", "/ausbildung", "/trading-journal", "/einsteig"]) {
    vorher[pfad] = await proxyZiel(ctx, cookies, pfad);
  }
  info(`Proxy direkt nach Login: ${Object.entries(vorher).map(([p, z]) => `${p}→${z ?? "durch"}`).join(", ")}`);

  const zugang = ctx.evaluateAccess(z.profil as never);
  info(`evaluateAccess (Journal): ${zugang.hasAccess ? "Zugang" : "kein Zugang"} (${zugang.reason}); is_paid (Institut) = ${z.profil?.is_paid}`);

  // Onboarding so abschließen, wie es CodexStep/UsageAgreementStep mit der
  // Sitzung des Nutzers tun — damit ist auch die RLS-Policy mitgeprüft.
  const nutzerClient = ctx.createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll: () => cookies.split("; ").map((c) => ({ name: c.slice(0, c.indexOf("=")), value: c.slice(c.indexOf("=") + 1) })),
        setAll: () => {},
      },
    },
  );
  const jetzt = new Date().toISOString();
  const { error: codexFehler } = await nutzerClient
    .from("profiles")
    .update({ codex_accepted: true, codex_accepted_at: jetzt, usage_agreement_accepted: true, usage_agreement_accepted_at: jetzt })
    .eq("id", z.userId);
  pruefe(!codexFehler, "Onboarding (Codex + Vereinbarung) mit eigener Sitzung speicherbar", codexFehler?.message);

  const nachher: Record<string, string | null> = {};
  for (const pfad of ["/dashboard", "/ausbildung", "/trading-journal"]) {
    nachher[pfad] = await proxyZiel(ctx, cookies, pfad);
  }
  info(`Proxy nach Onboarding: ${Object.entries(nachher).map(([p, z]) => `${p}→${z ?? "durch"}`).join(", ")}`);
  return { vorher, nachher, zugang, profil: z.profil };
}

// ── Szenarien ───────────────────────────────────────────────────────────────

function pruefeBezahlt(z: Zustand, plan: string, abo: Stripe.Subscription, etikett = "") {
  pruefe(z.userIds.length === 1, `${etikett}genau ein Konto`, `${z.userIds.length}`);
  pruefe(z.profil?.membership_tier === plan, `${etikett}membership_tier = ${plan}`, String(z.profil?.membership_tier));
  pruefe(z.profil?.is_paid === true, `${etikett}is_paid = true`, String(z.profil?.is_paid));
  pruefe(gleicheZeit(z.profil?.access_until, periodenEnde(abo)), `${etikett}access_until = Periodenende`, `${z.profil?.access_until} vs ${iso(periodenEnde(abo))}`);
  pruefe(z.profil?.stripe_customer_id === abo.customer, `${etikett}stripe_customer_id verknüpft`);
  const zeile = z.abos.find((a) => a.stripe_subscription_id === abo.id);
  pruefe(zeile?.status === "active", `${etikett}subscriptions-Zeile active`, String(zeile?.status));
  pruefe(z.zahlungen.filter((p) => p.status === "succeeded").length >= 1, `${etikett}payments-Zeile (succeeded)`, `${z.zahlungen.length} Zeile(n)`);
}

async function szenarioA(ctx: Ctx) {
  const faelle = [
    { n: 1, plan: "monthly" as const, checkoutArtig: true },
    { n: 2, plan: "quarterly" as const, checkoutArtig: false },
    { n: 3, plan: "yearly" as const, checkoutArtig: false },
  ];
  for (const f of faelle) {
    aktuellesSzenario = `a-${f.plan}`;
    console.log(`\n── a) Gast kauft ${f.plan} (${f.checkoutArtig ? "Kassen-Reihenfolge: incomplete → active" : "synchron bezahlt"}) — ${mail(f.n)}`);
    const kauf = await kaufen(ctx, { email: mail(f.n), plan: f.plan, checkoutArtig: f.checkoutArtig });
    const evs = await holeEvents(ctx, kauf.kunde.id, hat("customer.subscription.created", "invoice.paid", ...(f.checkoutArtig ? ["customer.subscription.updated"] : [])));
    info(`Events (API-Version ${evs[0]?.api_version}): ${evs.map((e) => e.type).join(", ")}`);
    const erg = await zustellenMitWiederholung(ctx, evs);
    // Maßgeblich ist der letzte Versuch je Event — ein 500 mit anschließendem
    // 200 ist genau die Wiederholung, die Stripe auch fährt.
    const letzter = new Map(erg.map((e) => [e.ev.id, e.status]));
    const wiederholt = erg.length - letzter.size;
    pruefe([...letzter.values()].every((s) => s === 200), "alle Events am Ende mit 200 verarbeitet", wiederholt ? `${wiederholt} Wiederholung(en)` : undefined);
    const z = await zustand(ctx.sb, mail(f.n));
    pruefeBezahlt(z, f.plan, kauf.abo);
    const wm = await willkommensmail(ctx, z);
    pruefe(wm.anzahl === 1, "genau eine Willkommensmail", `${wm.anzahl}`);
    pruefe(Boolean(wm.link), "Willkommensmail enthält Passwort-Link (neues Konto ohne Passwort)", wm.link ? "ja" : wm.dashboardKnopf ? "nur Dashboard-Knopf" : "kein Knopf gefunden");
    pruefe(z.profil?.full_name === "Erika Testkauf", "Name des Karteninhabers im Profil (Anrede der Mail)", `full_name="${z.profil?.full_name}", username="${z.profil?.username}"`);
    if (wm.link && f.n === 1) {
      const g = await linkGueltig(ctx, wm.link);
      pruefe(g.ok, "Passwort-Link einlösbar (verifyOtp)", g.fehler ?? `weiter nach ${g.ziel}`);
    }
  }
}

async function szenarioB(ctx: Ctx) {
  const faelle = [
    { n: 4, status: "approved" as const },
    { n: 5, status: "pending" as const },
    { n: 11, status: "rejected" as const },
  ];
  for (const f of faelle) {
    aktuellesSzenario = `b-free-${f.status}`;
    console.log(`\n── b) Bestehendes Free-Konto (Bewerbung ${f.status}) kauft als Gast mit derselben E-Mail — ${mail(f.n)}`);
    const passwort = `Cc-e2e-${Math.random().toString(36).slice(2)}!`;
    const { data: erstellt, error } = await ctx.sb.auth.admin.createUser({ email: mail(f.n), password: passwort, email_confirm: true });
    if (error || !erstellt.user) throw new Error(`Free-Konto anlegen: ${error?.message}`);
    const freeId = erstellt.user.id;
    await ctx.sb.from("profiles").update({ application_status: f.status, full_name: "Frieda Free" }).eq("id", freeId);
    // Einmal angemeldet, wie ein echtes Free-Mitglied — `last_sign_in_at` steht damit.
    await sitzungsCookies(ctx, mail(f.n), passwort);

    const kauf = await kaufen(ctx, { email: mail(f.n), plan: "monthly", checkoutArtig: true });
    const evs = await holeEvents(ctx, kauf.kunde.id, hat("customer.subscription.created", "customer.subscription.updated", "invoice.paid"));
    await zustellenMitWiederholung(ctx, evs);
    const z = await zustand(ctx.sb, mail(f.n));
    pruefe(z.userId === freeId, "Kauf mit bestehendem Konto verknüpft (kein Duplikat)", z.userId === freeId ? "gleiche user_id" : `${z.userIds.join(",")}`);
    pruefeBezahlt(z, "monthly", kauf.abo);
    const wm = await willkommensmail(ctx, z);
    pruefe(wm.anzahl === 1, "genau eine Willkommensmail", `${wm.anzahl}`);
    pruefe(!wm.link && wm.dashboardKnopf, "Mail ohne Passwort-Link, mit Dashboard-Knopf (Passwort existiert)", wm.link ? "Passwort-Link enthalten" : "");

    aktuellesSzenario = `h-free-${f.status}`;
    const zu = await zugangNachKauf(ctx, mail(f.n), { passwortSetzen: false, passwort });
    if (zu) {
      pruefe(
        zu.vorher["/dashboard"] === null || zu.vorher["/dashboard"] === "/einsteig",
        "zahlender Käufer landet nicht in Bewerbungs-/Pending-Schleife",
        `/dashboard→${zu.vorher["/dashboard"] ?? "durch"}`,
      );
      pruefe(
        zu.nachher["/dashboard"] === null && zu.nachher["/ausbildung"] === null && zu.nachher["/trading-journal"] === null,
        "nach Onboarding: Dashboard, Institut, Journal erreichbar",
        Object.entries(zu.nachher).map(([p, x]) => `${p}→${x ?? "durch"}`).join(", "),
      );
    }
  }
}

async function szenarioC(ctx: Ctx) {
  aktuellesSzenario = "c-eingeloggt";
  const n = 6;
  console.log(`\n── c) Eingeloggter Käufer (vorhandener Customer, metadata.user_id) — ${mail(n)}`);
  const passwort = `Cc-e2e-${Math.random().toString(36).slice(2)}!`;
  const { data: erstellt, error } = await ctx.sb.auth.admin.createUser({ email: mail(n), password: passwort, email_confirm: true });
  if (error || !erstellt.user) throw new Error(`Konto anlegen: ${error?.message}`);
  const userId = erstellt.user.id;
  await ctx.sb.from("profiles").update({ application_status: "approved" }).eq("id", userId);
  // Eingeloggt heißt: Es gab eine Anmeldung.
  await sitzungsCookies(ctx, mail(n), passwort);
  // Wie `create-checkout-session`: Customer vorab anlegen und am Profil speichern.
  const kunde = await ctx.stripe.customers.create({ email: mail(n), metadata: { user_id: userId } });
  await ctx.sb.from("profiles").update({ stripe_customer_id: kunde.id }).eq("id", userId);

  const kauf = await kaufen(ctx, { email: mail(n), plan: "yearly", checkoutArtig: true, kundeId: kunde.id, metadata: { user_id: userId } });
  const evs = await holeEvents(ctx, kunde.id, hat("customer.subscription.created", "customer.subscription.updated", "invoice.paid"));
  await zustellenMitWiederholung(ctx, evs);
  const z = await zustand(ctx.sb, mail(n));
  pruefe(z.userId === userId, "über stripe_customer_id dem eingeloggten Konto zugeordnet");
  pruefeBezahlt(z, "yearly", kauf.abo);
  const wm = await willkommensmail(ctx, z);
  pruefe(wm.anzahl === 1 && !wm.link, "eine Willkommensmail ohne Passwort-Link", `${wm.anzahl}, link=${Boolean(wm.link)}`);
}

async function szenarioD(ctx: Ctx) {
  // d1: Doppelzustellung derselben Events (Route) und doppelte Verarbeitung
  // am Idempotenz-Log vorbei (wie zwei parallel laufende Zustellungen).
  aktuellesSzenario = "d-doppelt";
  const n = 1;
  console.log(`\n── d1) Doppelt zugestellte Events für ${mail(n)} (aus Szenario a)`);
  const vorher = await zustand(ctx.sb, mail(n));
  if (!vorher.profil?.stripe_customer_id) {
    info("Szenario a-monthly fehlt — d1 übersprungen");
  } else {
    const kundeId = vorher.profil.stripe_customer_id as string;
    const evs: Stripe.Event[] = [];
    for await (const ev of ctx.stripe.events.list({ created: { gte: ctx.t0 }, limit: 100 })) {
      if (kundeVon(ev) === kundeId) evs.push(ev);
    }
    evs.reverse();
    const erneut = await Promise.all(evs.map((ev) => zustellen(ctx, ev)));
    pruefe(erneut.every((e) => e.body.status === "already_processed"), "Route erkennt Doppelzustellung (already_processed)", erneut.map((e) => e.body.status ?? e.status).join(","));
    // Am Log vorbei: Handler direkt, zweimal parallel.
    const fehler: string[] = [];
    await Promise.all(
      [...evs, ...evs].map((ev) => ctx.handleStripeEvent(ev, ctx.sb).catch((e: Error) => fehler.push(`${ev.type}: ${e.message}`))),
    );
    pruefe(fehler.length === 0, "Handler übersteht parallele Doppelverarbeitung ohne Fehler", fehler.join(" | ").slice(0, 200));
    const nachher = await zustand(ctx.sb, mail(n));
    pruefe(nachher.userIds.length === 1, "kein zweites Konto");
    pruefe(nachher.mails.filter((m) => m.sequence === "paid_welcome").length === 1, "keine zweite Willkommensmail");
    pruefe(nachher.zahlungen.length === vorher.zahlungen.length, "keine zusätzliche payments-Zeile", `${vorher.zahlungen.length}→${nachher.zahlungen.length}`);
    pruefe(nachher.profil?.membership_tier === "monthly" && nachher.profil?.is_paid === true, "Profil unverändert bezahlt");
  }

  // d2: Ungünstige Reihenfolge — Rechnung zuerst, `created` (incomplete) zuletzt.
  aktuellesSzenario = "d-reihenfolge";
  const n2 = 7;
  console.log(`\n── d2) Events in ungünstiger Reihenfolge (invoice.* zuerst, subscription.created zuletzt) — ${mail(n2)}`);
  const kauf2 = await kaufen(ctx, { email: mail(n2), plan: "monthly", checkoutArtig: true });
  const evs2 = await holeEvents(ctx, kauf2.kunde.id, hat("customer.subscription.created", "customer.subscription.updated", "invoice.paid"));
  const rang = (t: string) => (t.startsWith("invoice.") ? 0 : t === "customer.subscription.updated" ? 1 : t === "customer.subscription.created" ? 3 : 2);
  const verdreht = [...evs2].sort((a, b) => rang(a.type) - rang(b.type));
  info(`Zustellreihenfolge: ${verdreht.map((e) => e.type).join(", ")}`);
  await zustellenMitWiederholung(ctx, verdreht, "d2 ");
  const z2 = await zustand(ctx.sb, mail(n2));
  pruefeBezahlt(z2, "monthly", kauf2.abo);
  const wm2 = await willkommensmail(ctx, z2);
  pruefe(wm2.anzahl === 1 && Boolean(wm2.link), "eine Willkommensmail mit Passwort-Link", `${wm2.anzahl}, link=${Boolean(wm2.link)}`);

  // d3: `created` und `updated` treffen gleichzeitig ein (Stripe wartet nicht).
  aktuellesSzenario = "d-parallel";
  const n3 = 8;
  console.log(`\n── d3) subscription.created und .updated parallel zugestellt — ${mail(n3)}`);
  const kauf3 = await kaufen(ctx, { email: mail(n3), plan: "monthly", checkoutArtig: true });
  const evs3 = await holeEvents(ctx, kauf3.kunde.id, hat("customer.subscription.created", "customer.subscription.updated", "invoice.paid"));
  const parallel: Stripe.Event[] = evs3.filter((e) => e.type === "customer.subscription.created" || e.type === "customer.subscription.updated");
  const rest = evs3.filter((e) => !parallel.includes(e));
  const gleichzeitig = await Promise.all(parallel.map((ev) => zustellen(ctx, ev)));
  info(`parallel: ${gleichzeitig.map((g) => `${g.ev.type}→${g.status}`).join(", ")}`);
  const nochmal = gleichzeitig.filter((g) => g.status >= 300).map((g) => g.ev);
  await zustellenMitWiederholung(ctx, [...nochmal, ...rest], "d3 ");
  const z3 = await zustand(ctx.sb, mail(n3));
  pruefeBezahlt(z3, "monthly", kauf3.abo);
  const wm3 = await willkommensmail(ctx, z3);
  pruefe(wm3.anzahl === 1 && Boolean(wm3.link), "eine Willkommensmail mit Passwort-Link", `${wm3.anzahl}, link=${Boolean(wm3.link)}`);
}

async function szenarioEG(ctx: Ctx) {
  const n = 9;
  aktuellesSzenario = "e-verlaengerung";
  console.log(`\n── e) Verlängerung per Test Clock — ${mail(n)}`);
  const clock = await ctx.stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `${CLOCK_PREFIX}${n}` });
  const kauf = await kaufen(ctx, { email: mail(n), plan: "monthly", checkoutArtig: true, testClock: clock.id });
  await zustellenMitWiederholung(ctx, await holeEvents(ctx, kauf.kunde.id, hat("customer.subscription.created", "customer.subscription.updated", "invoice.paid")));
  const ende1 = periodenEnde(kauf.abo);
  pruefeBezahlt(await zustand(ctx.sb, mail(n)), "monthly", kauf.abo, "Kauf: ");

  await vorspulen(ctx, clock.id, ende1 + 2 * 3600);
  const evsV = await holeEvents(ctx, kauf.kunde.id, (evs) => evs.some((e) => e.type === "invoice.paid"));
  info(`Events Verlängerung: ${evsV.map((e) => e.type).join(", ")}`);
  await zustellenMitWiederholung(ctx, evsV);
  const abo2 = await ctx.stripe.subscriptions.retrieve(kauf.abo.id);
  const ende2 = periodenEnde(abo2);
  const zV = await zustand(ctx.sb, mail(n));
  pruefe(ende2 > ende1, "Stripe-Periode ist vorgerückt", `${iso(ende1)} → ${iso(ende2)}`);
  pruefe(gleicheZeit(zV.profil?.access_until, ende2), "access_until wandert mit", `${zV.profil?.access_until}`);
  pruefe(zV.zahlungen.filter((p) => p.status === "succeeded").length === 2, "zwei payments-Zeilen (Kauf + Verlängerung)", `${zV.zahlungen.length}`);
  pruefe(zV.profil?.is_paid === true && zV.profil?.membership_tier === "monthly", "weiter bezahlt");

  aktuellesSzenario = "g-kuendigung";
  console.log(`\n── g) Kündigung zum Periodenende — ${mail(n)}`);
  // Wie `POST /api/stripe/subscription/cancel`.
  await ctx.stripe.subscriptions.update(kauf.abo.id, { cancel_at_period_end: true, cancellation_details: { feedback: "other" } });
  await zustellenMitWiederholung(ctx, await holeEvents(ctx, kauf.kunde.id, hat("customer.subscription.updated")));
  const zK = await zustand(ctx.sb, mail(n));
  pruefe(zK.profil?.membership_tier === "monthly" && zK.profil?.is_paid === true, "bis Periodenende weiter bezahlt");
  pruefe(gleicheZeit(zK.profil?.access_until, ende2), "access_until = Periodenende", `${zK.profil?.access_until}`);
  pruefe(zK.abos.some((a) => a.cancel_at_period_end === true), "subscriptions.cancel_at_period_end = true");
  pruefe(ctx.evaluateAccess(zK.profil as never).hasAccess, "evaluateAccess: Zugang bis Periodenende");

  await vorspulen(ctx, clock.id, ende2 + 2 * 3600);
  const evsE = await holeEvents(ctx, kauf.kunde.id, hat("customer.subscription.deleted"));
  info(`Events Periodenende: ${evsE.map((e) => e.type).join(", ")}`);
  await zustellenMitWiederholung(ctx, evsE);
  const zE = await zustand(ctx.sb, mail(n));
  pruefe(zE.profil?.membership_tier === "free" && zE.profil?.is_paid === false, "nach Periodenende zurück auf free", `${zE.profil?.membership_tier}/${zE.profil?.is_paid}`);
  pruefe(!ctx.evaluateAccess(zE.profil as never).hasAccess, "evaluateAccess: kein Zugang mehr");
  pruefe(zE.abos.every((a) => a.status === "canceled"), "subscriptions-Zeile canceled", zE.abos.map((a) => a.status).join(","));
  pruefe(zE.kuendigungen >= 1, "cancellations-Zeile angelegt", `${zE.kuendigungen}`);
  pruefe(zE.mails.some((m) => m.sequence === "cancellation"), "Abschiedsumfrage ausgelöst");
}

async function szenarioF(ctx: Ctx) {
  const n = 10;
  aktuellesSzenario = "f-zahlungsausfall";
  console.log(`\n── f) Zahlungsausfall bei Verlängerung (quarterly, Test Clock) — ${mail(n)}`);
  const clock = await ctx.stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `${CLOCK_PREFIX}${n}` });
  const kauf = await kaufen(ctx, { email: mail(n), plan: "quarterly", checkoutArtig: false, testClock: clock.id });
  await zustellenMitWiederholung(ctx, await holeEvents(ctx, kauf.kunde.id, hat("customer.subscription.created", "invoice.paid")));
  pruefeBezahlt(await zustand(ctx.sb, mail(n)), "quarterly", kauf.abo, "Kauf: ");

  // Karte, die sich hinterlegen lässt, aber bei der Abbuchung scheitert.
  const kaputt = await ctx.stripe.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: kauf.kunde.id });
  await ctx.stripe.customers.update(kauf.kunde.id, { invoice_settings: { default_payment_method: kaputt.id } });
  await ctx.stripe.subscriptions.update(kauf.abo.id, { default_payment_method: kaputt.id });
  await holeEvents(ctx, kauf.kunde.id, () => true, 5_000).then((evs) => zustellenMitWiederholung(ctx, evs));

  const ende1 = periodenEnde(kauf.abo);
  await vorspulen(ctx, clock.id, ende1 + 2 * 3600);
  const evsF = await holeEvents(ctx, kauf.kunde.id, hat("invoice.payment_failed"));
  info(`Events Ausfall: ${evsF.map((e) => e.type).join(", ")}`);
  const vorAusfall = Date.now();
  await zustellenMitWiederholung(ctx, evsF);
  const zF = await zustand(ctx.sb, mail(n));
  const abo2 = await ctx.stripe.subscriptions.retrieve(kauf.abo.id);
  info(`Stripe-Status nach Ausfall: ${abo2.status}`);
  const grace = zF.profil?.access_until ? new Date(zF.profil.access_until as string).getTime() : 0;
  pruefe(Math.abs(grace - (vorAusfall + 48 * 3600 * 1000)) < 5 * 60 * 1000, "48h-Grace: access_until ≈ jetzt + 48h", `${zF.profil?.access_until}`);
  pruefe(zF.profil?.membership_tier === "quarterly", "Stufe bleibt stehen (Dunning, kein Rauswurf)", String(zF.profil?.membership_tier));
  pruefe(zF.zahlungen.some((p) => p.status === "failed"), "payments-Zeile failed");
  pruefe(Boolean(zF.profil?.payment_failed_email_1_sent_at), "Dunning-Mail 1 verschickt (payment_failed_email_1_sent_at)");
  pruefe(zF.abos.some((a) => a.status === "past_due"), "subscriptions-Zeile past_due", zF.abos.map((a) => a.status).join(","));

  // Zahlung nachholen: neue Karte, offene Rechnung bezahlen.
  const gut = await ctx.stripe.paymentMethods.attach("pm_card_visa", { customer: kauf.kunde.id });
  await ctx.stripe.customers.update(kauf.kunde.id, { invoice_settings: { default_payment_method: gut.id } });
  await ctx.stripe.subscriptions.update(kauf.abo.id, { default_payment_method: gut.id });
  const offen = await ctx.stripe.invoices.list({ customer: kauf.kunde.id, status: "open", limit: 5 });
  for (const r of offen.data) await ctx.stripe.invoices.pay(r.id!, { payment_method: gut.id });
  // Warten, bis auch der Statuswechsel past_due → active als Event vorliegt.
  const evsP = await holeEvents(ctx, kauf.kunde.id, (evs) =>
    evs.some((e) => e.type === "invoice.paid") &&
    evs.some((e) => e.type === "customer.subscription.updated" && (e.data.object as Stripe.Subscription).status === "active"),
  );
  info(`Events Nachzahlung: ${evsP.map((e) => e.type).join(", ")}`);
  const abo3 = await ctx.stripe.subscriptions.retrieve(kauf.abo.id);
  pruefe(abo3.status === "active", "Stripe-Abo wieder active", abo3.status);

  // Erst nur die Rechnung: `invoice.paid` muss den Zugang allein zurückholen
  // können — Stripe garantiert nicht, dass `subscription.updated` vorher kommt.
  await zustellenMitWiederholung(ctx, evsP.filter((e) => e.type.startsWith("invoice.")));
  const zR = await zustand(ctx.sb, mail(n));
  pruefe(gleicheZeit(zR.profil?.access_until, periodenEnde(abo3)), "invoice.paid allein: access_until wieder = Periodenende", `${zR.profil?.access_until} vs ${iso(periodenEnde(abo3))}`);
  pruefe(!zR.profil?.payment_failed_email_1_sent_at, "Dunning-Zähler zurückgesetzt (nächster Ausfall startet wieder mit Mail 1)", String(zR.profil?.payment_failed_email_1_sent_at));

  await zustellenMitWiederholung(ctx, evsP.filter((e) => !e.type.startsWith("invoice.")));
  const zP = await zustand(ctx.sb, mail(n));
  pruefe(gleicheZeit(zP.profil?.access_until, periodenEnde(abo3)), "access_until = Periodenende", `${zP.profil?.access_until}`);
  pruefe(zP.abos.some((a) => a.status === "active"), "subscriptions-Zeile wieder active", zP.abos.map((a) => a.status).join(","));
  pruefe(ctx.evaluateAccess(zP.profil as never).hasAccess && zP.profil?.is_paid === true, "voller Zugang wiederhergestellt");
}

async function szenarioH(ctx: Ctx) {
  // Frischer Gastkäufer aus Szenario a: Passwort wie auf /checkout/success
  // setzen, anmelden, Proxy fragen.
  for (const n of [2, 3]) {
    aktuellesSzenario = `h-gast-${n}`;
    console.log(`\n── h) Zugang nach dem Kauf für frischen Gastkäufer ${mail(n)}`);
    const zu = await zugangNachKauf(ctx, mail(n), { passwortSetzen: true, passwort: `Cc-e2e-${Math.random().toString(36).slice(2)}!` });
    if (!zu) continue;
    pruefe(zu.vorher["/dashboard"] === "/einsteig", "erster Aufruf führt ins Onboarding (Codex + Vereinbarung)", `/dashboard→${zu.vorher["/dashboard"] ?? "durch"}`);
    pruefe(zu.vorher["/einsteig"] === null, "/einsteig selbst erreichbar");
    pruefe(zu.zugang.hasAccess, "evaluateAccess: bezahlter Zugang", zu.zugang.reason);
    pruefe(
      zu.nachher["/dashboard"] === null && zu.nachher["/ausbildung"] === null && zu.nachher["/trading-journal"] === null,
      "nach Onboarding: Dashboard, Institut, Journal erreichbar",
      Object.entries(zu.nachher).map(([p, x]) => `${p}→${x ?? "durch"}`).join(", "),
    );
  }
}

// ── Aufräumen ───────────────────────────────────────────────────────────────

async function aufraeumen(ctx: Ctx): Promise<boolean> {
  console.log("\n── Aufräumen");
  const { stripe, sb } = ctx;
  const mails = Array.from({ length: MAX_NUMMER }, (_, i) => mail(i + 1));

  // Stripe: alle Kunden mit Testadressen (exakter E-Mail-Filter, nicht die
  // träge Suche), dazu ihre Rechnungen und Events fürs DB-Aufräumen.
  const kundenIds = new Set<string>();
  const rechnungsIds = new Set<string>();
  const aboIds = new Set<string>();
  for (const m of mails) {
    for await (const k of stripe.customers.list({ email: m, limit: 100 })) kundenIds.add(k.id);
  }
  for (const k of kundenIds) {
    for await (const r of stripe.invoices.list({ customer: k, limit: 100 })) if (r.id) rechnungsIds.add(r.id);
    for await (const s of stripe.subscriptions.list({ customer: k, status: "all", limit: 100 })) aboIds.add(s.id);
  }
  const eventIds = new Set(ctx.zugestellt);
  for await (const ev of stripe.events.list({ created: { gte: Math.floor(Date.now() / 1000) - 3 * 24 * 3600 }, limit: 100 })) {
    const k = kundeVon(ev);
    if (k && kundenIds.has(k)) eventIds.add(ev.id);
  }

  const nutzer = await alleTestNutzer(sb);
  const userIds = nutzer.map((n) => n.id);
  const inListe = <T,>(xs: Iterable<T>) => [...xs];

  const schritte: Array<[string, () => PromiseLike<{ error: { message: string } | null }>]> = [];
  if (rechnungsIds.size) schritte.push(["payments (Rechnungen)", () => sb.from("payments").delete().in("stripe_invoice_id", inListe(rechnungsIds))]);
  if (userIds.length) {
    schritte.push(["payments (Nutzer)", () => sb.from("payments").delete().in("user_id", userIds)]);
    schritte.push(["checkout_sessions", () => sb.from("checkout_sessions").delete().in("user_id", userIds)]);
    schritte.push(["cancellations", () => sb.from("cancellations").delete().in("user_id", userIds)]);
    schritte.push(["subscriptions (Nutzer)", () => sb.from("subscriptions").delete().in("user_id", userIds)]);
  }
  if (aboIds.size) schritte.push(["subscriptions (Abos)", () => sb.from("subscriptions").delete().in("stripe_subscription_id", inListe(aboIds))]);
  schritte.push(["email_sequence_log", () => sb.from("email_sequence_log").delete().in("recipient_email", mails)]);
  const evListe = inListe(eventIds);
  for (let i = 0; i < evListe.length; i += 100) {
    const teil = evListe.slice(i, i + 100);
    schritte.push([`stripe_webhook_events (${i}…)`, () => sb.from("stripe_webhook_events").delete().in("id", teil)]);
  }
  if (userIds.length) schritte.push(["profiles", () => sb.from("profiles").delete().in("id", userIds)]);

  for (const [name, fn] of schritte) {
    const { error } = await fn();
    if (error) console.log(`   FEHL ${name}: ${error.message}`);
  }
  for (const u of nutzer) {
    const { error } = await sb.auth.admin.deleteUser(u.id);
    if (error) console.log(`   FEHL auth-User ${u.id}: ${error.message}`);
  }

  // Test Clocks löschen auch ihre Kunden und Abos.
  for await (const c of stripe.testHelpers.testClocks.list({ limit: 100 })) {
    if (c.name?.startsWith(CLOCK_PREFIX)) await stripe.testHelpers.testClocks.del(c.id);
  }
  for (const k of kundenIds) {
    try {
      const kunde = await stripe.customers.retrieve(k);
      if (!kunde.deleted) await stripe.customers.del(k);
    } catch {
      // mit der Test Clock bereits gelöscht
    }
  }
  info(`entfernt: ${nutzer.length} Konten, ${kundenIds.size} Stripe-Kunden, ${rechnungsIds.size} Rechnungen, ${aboIds.size} Abos, ${eventIds.size} Events`);

  // ── Restabfrage: alles muss leer sein ────────────────────────────────────
  const rest: Record<string, number> = {};
  rest["auth.users (Testadressen)"] = (await alleTestNutzer(sb)).length;
  const zaehle = async (name: string, q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count, error } = await q;
    rest[name] = error ? -1 : (count ?? 0);
  };
  await zaehle("profiles", sb.from("profiles").select("id", { count: "exact", head: true }).in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]));
  await zaehle("email_sequence_log", sb.from("email_sequence_log").select("id", { count: "exact", head: true }).in("recipient_email", mails));
  await zaehle("payments", sb.from("payments").select("id", { count: "exact", head: true }).in("stripe_invoice_id", rechnungsIds.size ? inListe(rechnungsIds) : ["-"]));
  await zaehle("subscriptions", sb.from("subscriptions").select("id", { count: "exact", head: true }).in("stripe_customer_id", kundenIds.size ? inListe(kundenIds) : ["-"]));
  await zaehle("stripe_webhook_events", sb.from("stripe_webhook_events").select("id", { count: "exact", head: true }).in("id", evListe.length ? evListe.slice(0, 300) : ["-"]));
  let kundenRest = 0;
  for (const m of mails) kundenRest += (await stripe.customers.list({ email: m, limit: 100 })).data.length;
  rest["Stripe-Kunden (Testadressen)"] = kundenRest;
  let clocksRest = 0;
  for await (const c of stripe.testHelpers.testClocks.list({ limit: 100 })) if (c.name?.startsWith(CLOCK_PREFIX)) clocksRest++;
  rest["Stripe Test Clocks"] = clocksRest;

  const sauber = Object.values(rest).every((v) => v === 0);
  console.log(`   Restabfrage: ${Object.entries(rest).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`   ${sauber ? "OK   nichts übrig" : "FEHL es ist etwas übrig geblieben"}`);
  return sauber;
}

// ── Ablauf ──────────────────────────────────────────────────────────────────

/**
 * Handler-Protokoll lesbar halten: „ignoriere event.type=…" kommt pro Lauf
 * dutzendfach, und bei Fehlern reicht die erste Zeile statt des Stacks.
 */
function protokollStraffen() {
  const info = console.info.bind(console);
  console.info = (...a: unknown[]) => {
    if (typeof a[0] === "string" && a[0].startsWith("[stripe-webhook] ignoriere")) return;
    info(...a);
  };
  for (const stufe of ["warn", "error"] as const) {
    const orig = console[stufe].bind(console);
    console[stufe] = (...a: unknown[]) =>
      orig(...a.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : x)));
  }
}

async function main() {
  const args = process.argv.slice(2);
  protokollStraffen();
  const ctx = await ladeKontext();

  if (args.includes("--aufraeumen")) {
    process.exit((await aufraeumen(ctx)) ? 0 : 1);
  }

  // Reste eines abgebrochenen Laufs verfälschen jede Prüfung (Mail-Log ist
  // pro Adresse eindeutig, Konten existierten schon) — erst wegräumen.
  if ((await alleTestNutzer(ctx.sb)).length) {
    info("Reste eines früheren Laufs gefunden — räume zuerst auf.");
    await aufraeumen(ctx);
  }

  const auswahl = new Set(args.filter((a) => /^[a-h]$/.test(a)));
  const will = (s: string) => auswahl.size === 0 || auswahl.has(s);

  console.log(`Stripe-Testmodus, App-URL ${APP_URL}, Start ${new Date().toISOString()}`);
  let sauber = false;
  try {
    if (will("a") || will("d") || will("h")) await szenarioA(ctx);
    if (will("b") || will("h")) await szenarioB(ctx);
    if (will("c")) await szenarioC(ctx);
    if (will("d")) await szenarioD(ctx);
    if (will("e") || will("g")) await szenarioEG(ctx);
    if (will("f")) await szenarioF(ctx);
    if (will("h")) await szenarioH(ctx);
  } catch (err) {
    pruefungen.push({ szenario: aktuellesSzenario, text: "Szenario abgebrochen", ok: false, detail: (err as Error).stack });
    console.error(err);
  } finally {
    sauber = await aufraeumen(ctx);
  }

  const fehler = pruefungen.filter((p) => !p.ok);
  console.log(`\n══ Ergebnis: ${pruefungen.length - fehler.length}/${pruefungen.length} Prüfungen ok`);
  for (const f of fehler) console.log(`   FEHL [${f.szenario}] ${f.text}${f.detail ? ` — ${f.detail}` : ""}`);
  process.exit(fehler.length === 0 && sauber ? 0 : 1);
}

void main();
