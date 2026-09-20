import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";
import { updateLastLoginIfNeeded } from "@/lib/auth/middleware-last-login";
import { isFreeMember } from "@/lib/membership";
import { createServiceClient } from "@/lib/supabase/service";

// Marketing-Pfade (öffentlich, kein Auth nötig).
//
// `/pricing` ist entfallen: Die Laufzeiten stehen jetzt im Abschnitt „Angebot"
// der Startseite, eingeloggte Nutzer wählen sie in `/billing`. Die alte Adresse
// leitet weiter (siehe `proxy()`), damit Links aus alten Mails nicht ins Leere
// laufen.
//
// Die Checkout-Pfade müssen öffentlich sein, weil der Gast-Checkout genau das
// ist: Wer über `/go/<plan>` kauft, hat beim Rücksprung noch kein Konto, und
// ausgewiesen wird er über die Stripe-Session, nicht über einen Login.
const PUBLIC_PATHS = [
  "/einsteig",
  "/login",
  "/register",
  "/free",
  "/apply",
  "/erfolge",
  // Belegte Auszahlungen als eigene Seite (`app/ergebnisse/page.tsx`). Sie
  // haengt am Fusslink der Ergebnis-Section der Verkaufsseite und muss
  // deshalb ohne Anmeldung erreichbar sein.
  "/ergebnisse",
  "/wartung",
  "/checkout/success",
  "/checkout/zurueck",
  "/set-password",
  // „Passwort vergessen" — wer hier landet, kann sich per Definition nicht anmelden.
  "/passwort-vergessen",
  // Offene Vorschau der Verkaufsseite (`app/vorschau/page.tsx`) — derselbe
  // Inhalt wie `/`, aber ohne Anmeldepflicht, ohne Dashboard-Weiche und
  // ohne Wartungs-Gate (siehe `maintenanceExempt` weiter unten).
  "/vorschau",
  // `app/robots.ts` erzeugt diese Adresse. Sie steht im Matcher unten nicht
  // unter den Ausnahmen, also käme sie ohne diesen Eintrag als Login-HTML
  // beim Crawler an — und `/go/` wäre nicht gesperrt.
  "/robots.txt",
];

// `/survey/*` ist Token-authentifiziert (Cancellation-Survey aus Paket 6) und
// muss auch für nicht-eingeloggte User zugänglich sein.
// `/discord/*` ist der öffentliche Discord-Funnel (Landing + /discord/termin) —
// standalone Leads ohne Auth, daher der gesamte Prefix öffentlich.
// `/termin/*` ist der öffentliche Direkt-Termin-Funnel (Cold Traffic / Ads) —
// Landing + /termin/danke, ebenfalls ohne Auth zugänglich.
// `/go/*` startet die Stripe-Kasse — auch für eingeloggte Nutzer, die noch
// mitten im Onboarding stecken; ohne den Eintrag schöbe die Onboarding-Weiche
// unten sie beim Klick auf „Community beitreten" nach `/einsteig`.
// `/auth/*` löst Einmal-Token aus unseren E-Mails ein, ebenfalls ohne Sitzung.
const PUBLIC_PREFIXES = [
  // Rechtstexte und Kündigungsbutton (§ 312k BGB): ohne Anmeldung und — siehe
  // `RECHTS_PFADE` unten — auch im Wartungsmodus erreichbar.
  "/datenschutz",
  "/impressum",
  "/agb",
  "/widerruf",
  "/kuendigen",
  // Widerrufsfunktion (§ 356a BGB). Eigener Eintrag: `/widerruf` deckt
  // `/widerrufen` nicht ab (Präfix gilt nur mit Schrägstrich).
  "/widerrufen",
  "/survey",
  "/discord",
  "/termin",
  "/go",
  "/auth",
];

// Rechtstexte und Kündigungsbutton sind vom Wartungs-Gate ausgenommen:
// `/vorschau` zeigt die Verkaufsseite auch bei geschlossener Plattform, und
// deren Fußzeile verlinkt genau diese Seiten. Impressum, Datenschutz,
// Widerrufsbelehrung, „Verträge hier kündigen" und „Vertrag widerrufen"
// müssen ständig erreichbar sein — eine Wartungsseite an ihrer Stelle wäre ein
// Rechtsverstoß. Dieselben Pfade stehen in `config/legal.ts` (`rechtsPfade`).
const RECHTS_PFADE = ["/impressum", "/datenschutz", "/agb", "/widerruf", "/kuendigen", "/widerrufen"];

function isRechtsPfad(pathname: string): boolean {
  return RECHTS_PFADE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Wartungsmodus: Flag liegt in `app_settings` (key="maintenance_mode"), oeffentlich lesbar.
// Kurzes In-Memory-Caching (Modul-Scope) haelt den DB-Read pro Request unnoetig,
// solange der Prozess laeuft — bewusst simpel gehalten, kein Über-Engineering.
type MaintenanceState = { enabled: boolean };
let maintenanceCache: { state: MaintenanceState; fetchedAt: number } | null = null;
const MAINTENANCE_CACHE_TTL_MS = 15_000;

async function getMaintenanceState(): Promise<MaintenanceState> {
  // Lokaler Ausschalter fuer die Entwicklung. Das Flag liegt in der geteilten
  // Produktionsdatenbank — wer dort ausschaltet, oeffnet die Plattform fuer
  // alle. Zum Entwickeln braucht man aber nur die eigene Maschine offen.
  // Der Schalter greift ausschliesslich ausserhalb von `production`: Selbst
  // wenn die Variable versehentlich in die Deployment-Umgebung geraet, bleibt
  // die Wartung dort an.
  if (process.env.NODE_ENV !== "production" && process.env.WARTUNG_LOKAL_AUS === "1") {
    return { enabled: false };
  }

  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.fetchedAt < MAINTENANCE_CACHE_TTL_MS) {
    return maintenanceCache.state;
  }
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("app_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .maybeSingle();
    const value = (data?.value ?? {}) as { enabled?: unknown };
    const state: MaintenanceState = { enabled: Boolean(value.enabled) };
    maintenanceCache = { state, fetchedAt: now };
    return state;
  } catch {
    // Bei Fehler (z. B. DB kurzzeitig nicht erreichbar) die Plattform NICHT aussperren.
    return { enabled: false };
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // `/pricing` ist ersatzlos entfallen (Entscheidung 2026-09-16). Dauerhafte
  // Weiterleitung statt 404: Die Adresse steht in verschickten Mails und in
  // Suchmaschinen-Indizes. 308 statt 307, damit Suchmaschinen den Umzug auch
  // übernehmen. Steht ganz oben, weil sie für eingeloggte wie nicht
  // eingeloggte Besucher gleichermaßen gilt.
  if (pathname === "/pricing") {
    return NextResponse.redirect(new URL("/#angebot", request.url), 308);
  }

  /*
   * Kurzlink auf den Telegram-Kanal (Wunsch Simon, 20.09.2026). Er steht hier
   * oben und nicht in `next.config.ts`, weil diese Funktion vor den
   * Konfigurations-Weiterleitungen läuft — sonst schöbe das Auth-Gate den
   * Besucher vorher auf die Anmeldung, und im Wartungsmodus auf `/wartung`.
   *
   * 307 statt 308: Der Kanal kann umziehen, und eine dauerhafte Weiterleitung
   * bleibt in Browsern und Suchmaschinen hängen.
   */
  if (pathname === "/tg" || pathname === "/tg/") {
    return NextResponse.redirect("https://t.me/capitalcircletrading", 307);
  }

  // Statische Assets aus `public/tg-slides/`, `public/founder/`, `public/cases/`, … —
  // nicht durch Auth-/Pending-/Onboarding-Gates schicken, sonst liefert der Browser
  // für <img src="/…"> eine Redirect-HTML (Login-Seite) statt des Bildes.
  if (
    pathname.startsWith("/tg-slides/") ||
    pathname.startsWith("/founder/") ||
    pathname.startsWith("/cases/")
  ) {
    return NextResponse.next();
  }

  const { supabase, response } = createClient(request);

  // API-Routen: getUser() ist nötig damit @supabase/ssr expirierte Tokens refresht und
  // die frischen Cookies in den Response-Headers setzt. Ohne das werden RLS-Queries leer.
  if (pathname.startsWith("/api")) {
    await supabase.auth.getUser();
    return response;
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // Wartungsmodus-Gate: additiv, betrifft weder /api (oben bereits returned) noch /wartung,
  // /admin* oder /login. Nicht-Admins (inkl. nicht eingeloggter Besucher) werden umgeleitet.
  // `/vorschau` ist bewusst dabei: Die Adresse existiert genau dafür, die
  // Verkaufsseite auch dann herzeigen zu koennen, wenn die Plattform zu ist.
  // Die Passwort-Kette (`/passwort-vergessen` → Mail → `/auth/confirm` →
  // `/set-password`) ebenfalls: `/login` ist ausgenommen und verlinkt auf
  // „Passwort vergessen" — ohne die Ausnahme endete der Link fuer einen Admin,
  // der im Wartungsmodus sein Passwort vergessen hat, auf `/wartung`. Hinter
  // der Kette liegt `/dashboard`, und das bleibt fuer Nicht-Admins zu.
  const maintenanceExempt =
    pathname === "/wartung" ||
    pathname === "/vorschau" ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/passwort-vergessen" ||
    pathname === "/auth/confirm" ||
    pathname === "/set-password" ||
    isRechtsPfad(pathname);
  if (!maintenanceExempt) {
    const maintenance = await getMaintenanceState();
    if (maintenance.enabled) {
      let isMaintenanceAdmin = false;
      if (user) {
        const { data: maintenanceProfile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();
        isMaintenanceAdmin = Boolean(maintenanceProfile?.is_admin);
      }
      if (!isMaintenanceAdmin) {
        return NextResponse.redirect(new URL("/wartung", request.url));
      }
    }
  }

  if (!user) {
    // "/" zeigt die Landing Page — kein Login-Redirect für nicht-eingeloggte User
    if (pathname === "/") {
      return response;
    }
    if (!isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Eingeloggte User landen direkt im Dashboard (/ ist die Verkaufsseite)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Profil nur wenn Admin-/Onboarding-Logik wirklich nötig (nicht auf /login oder /register eingeloggt)
  const needsProfile =
    pathname.startsWith("/admin") ||
    pathname === "/einsteig" ||
    pathname === "/pending-review" ||
    (!isPublicPath(pathname) && pathname !== "/");

  if (!needsProfile) {
    return response;
  }

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select(
      "usage_agreement_accepted,is_admin,is_paid,application_status,membership_tier,step2_application_status,access_until,last_login_at,churn_email_1_sent_at,churn_email_2_sent_at",
    )
    .eq("id", user.id)
    .single();
  const profile = rawProfile as {
    usage_agreement_accepted?: boolean;
    is_admin?: boolean;
    is_paid?: boolean;
    application_status?: "pending" | "approved" | "rejected" | null;
    membership_tier?: "free" | "monthly" | "quarterly" | "yearly" | "lifetime" | "ht_1on1";
    step2_application_status?: "pending" | "approved" | "rejected" | null;
    access_until?: string | null;
    last_login_at?: string | null;
    churn_email_1_sent_at?: string | null;
    churn_email_2_sent_at?: string | null;
  } | null;

  // Fire-and-forget: Last-Login-Stempel + Churn-Reset. Wir blocken die
  // Response NICHT auf den DB-Write — der Helper schluckt Fehler intern.
  if (profile) {
    void updateLastLoginIfNeeded(supabase, user.id, {
      lastLoginAt: profile.last_login_at ?? null,
      churnEmail1SentAt: profile.churn_email_1_sent_at ?? null,
      churnEmail2SentAt: profile.churn_email_2_sent_at ?? null,
    });
  }

  if (pathname.startsWith("/admin") && !profile?.is_admin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Bewerbungs-Gating (Paket 3): pending/rejected User landen auf /pending-review.
  // Admins werden hiervon ausgenommen, damit Admin-Konten ohne Application
  // nicht versehentlich umgeleitet werden.
  // Zahlende ebenfalls: Die Bewerbung ist das Tor zum kostenlosen Programm.
  // Kaufte ein Free-Konto mit offener oder abgelehnter Bewerbung über `/go/`,
  // hing es bis 19.09.2026 trotz Zahlung auf /pending-review fest.
  const appStatus = isFreeMember(profile) ? (profile?.application_status ?? null) : null;
  if (!profile?.is_admin) {
    if (
      (appStatus === "pending" || appStatus === "rejected") &&
      pathname !== "/pending-review"
    ) {
      return NextResponse.redirect(new URL("/pending-review", request.url));
    }
    if (appStatus !== "pending" && appStatus !== "rejected" && pathname === "/pending-review") {
      // Wenn die Bewerbung bereits approved ist, weiter zum Einsteig-Onboarding
      return NextResponse.redirect(new URL("/einsteig", request.url));
    }
  }

  /*
   * Seit 20.09.2026 ohne Codex-Schritt (Entscheidung Simon): Das Onboarding
   * besteht nur noch aus der Nutzungsvereinbarung. `codex_accepted` bleibt in
   * der Datenbank stehen — bestehende Zustimmungen sind ein Nachweis und
   * werden nicht geloescht —, ist aber keine Bedingung mehr fuer den Zugang.
   */
  const onboardingDone = isFreeMember(profile) || Boolean(profile?.usage_agreement_accepted);

  if (onboardingDone && pathname === "/einsteig") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!onboardingDone && !isPublicPath(pathname) && pathname !== "/pending-review") {
    return NextResponse.redirect(new URL("/einsteig", request.url));
  }

  // /bewerbung/* (Step 2): nur für approved Free-Nutzer.
  // /bewerbung selbst: nur wenn Step 2 noch NICHT abgeschlossen.
  // /bewerbung/danke: auch erreichbar wenn Step 2 already submitted (pending/approved/rejected).
  if ((pathname === "/bewerbung" || pathname.startsWith("/bewerbung/")) && !profile?.is_admin) {
    const isFree = profile?.membership_tier === "free" || !profile?.is_paid;
    const isApproved = profile?.application_status === "approved";

    if (!isApproved || !isFree) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (pathname === "/bewerbung") {
      const step2Done = profile?.step2_application_status != null;
      if (step2Done) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    if (pathname === "/bewerbung/danke") {
      const step2Started = profile?.step2_application_status != null;
      if (!step2Started) {
        return NextResponse.redirect(new URL("/bewerbung", request.url));
      }
    }
  }

  return response;
}

export const config = {
  // Statische Icons: Safari/WebKit u. a. holen apple-touch-icon / favicon ohne HTML — nicht zur Login-HTML umleiten.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|logo/|bg/|svg/|tg-slides/|founder/|cases/|apex/|prozess/|nachweise/|apple-touch-icon|new-apple).*)",
  ],
};
