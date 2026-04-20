import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";
import { updateLastLoginIfNeeded } from "@/lib/auth/middleware-last-login";

// Marketing-Pfade (öffentlich, kein Auth nötig). /free + /pricing + /apply
// werden in den Marketing-Paketen 3/4/7 aufgebaut.
const PUBLIC_PATHS = [
  "/einsteig",
  "/login",
  "/register",
  "/free",
  "/pricing",
  "/apply",
];

// `/survey/*` ist Token-authentifiziert (Cancellation-Survey aus Paket 6) und
// muss auch für nicht-eingeloggte User zugänglich sein.
const PUBLIC_PREFIXES = ["/datenschutz", "/impressum", "/survey"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { supabase, response } = createClient(request);

  // API-Routen: getUser() ist nötig damit @supabase/ssr expirierte Tokens refresht und
  // die frischen Cookies in den Response-Headers setzt. Ohne das werden RLS-Queries leer.
  if (pathname.startsWith("/api")) {
    await supabase.auth.getUser();
    return response;
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

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
      "codex_accepted,intro_video_watched,usage_agreement_accepted,is_admin,is_paid,application_status,membership_tier,access_until,last_login_at,churn_email_1_sent_at,churn_email_2_sent_at",
    )
    .eq("id", user.id)
    .single();
  const profile = rawProfile as {
    codex_accepted?: boolean;
    intro_video_watched?: boolean;
    usage_agreement_accepted?: boolean;
    is_admin?: boolean;
    is_paid?: boolean;
    application_status?: "pending" | "approved" | "rejected" | null;
    membership_tier?: "free" | "monthly" | "lifetime" | "ht_1on1";
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
  const appStatus = profile?.application_status ?? null;
  if (!profile?.is_admin) {
    if (
      (appStatus === "pending" || appStatus === "rejected") &&
      pathname !== "/pending-review"
    ) {
      return NextResponse.redirect(new URL("/pending-review", request.url));
    }
    if (appStatus !== "pending" && appStatus !== "rejected" && pathname === "/pending-review") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const onboardingDone = Boolean(
    profile?.codex_accepted && profile?.intro_video_watched && profile?.usage_agreement_accepted,
  );

  if (onboardingDone && pathname === "/einsteig") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!onboardingDone && !isPublicPath(pathname) && pathname !== "/pending-review") {
    return NextResponse.redirect(new URL("/einsteig", request.url));
  }

  return response;
}

export const config = {
  // Statische Icons: Safari/WebKit u. a. holen apple-touch-icon / favicon ohne HTML — nicht zur Login-HTML umleiten.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|logo/|bg/|svg/|apple-touch-icon|new-apple).*)"],
};
