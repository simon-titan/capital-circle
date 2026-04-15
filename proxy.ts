import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/einsteig", "/login", "/register"];

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
    if (!PUBLIC_PATHS.includes(pathname)) {
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
    (!PUBLIC_PATHS.includes(pathname) && pathname !== "/");

  if (!needsProfile) {
    return response;
  }

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("codex_accepted,intro_video_watched,usage_agreement_accepted,is_admin")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as {
    codex_accepted?: boolean;
    intro_video_watched?: boolean;
    usage_agreement_accepted?: boolean;
    is_admin?: boolean;
  } | null;

  if (pathname.startsWith("/admin") && !profile?.is_admin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const onboardingDone = Boolean(
    profile?.codex_accepted && profile?.intro_video_watched && profile?.usage_agreement_accepted,
  );

  if (onboardingDone && pathname === "/einsteig") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!onboardingDone && !PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/einsteig", request.url));
  }

  return response;
}

export const config = {
  // Statische Icons: Safari/WebKit u. a. holen apple-touch-icon / favicon ohne HTML — nicht zur Login-HTML umleiten.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|logo/|bg/|svg/|apple-touch-icon|new-apple).*)"],
};
