import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/einsteig", "/login", "/register"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { supabase, response } = createClient(request);

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

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("codex_accepted,intro_video_watched,is_admin")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as { codex_accepted?: boolean; intro_video_watched?: boolean; is_admin?: boolean } | null;

  if (pathname.startsWith("/admin") && !profile?.is_admin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const onboardingDone = Boolean(profile?.codex_accepted && profile?.intro_video_watched);

  if (onboardingDone && pathname === "/einsteig") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!onboardingDone && !PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/einsteig", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo/|bg/|svg/).*)"],
};
