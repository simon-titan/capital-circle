import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", siteUrl()));
  }

  const { error: delErr } = await supabase.from("discord_connections").delete().eq("user_id", user.id);
  if (delErr) {
    return NextResponse.redirect(new URL(`/dashboard?discord=error&reason=${encodeURIComponent(delErr.message)}`, siteUrl()));
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      discord_id: null,
      discord_username: null,
      discord_access_token: null,
      discord_refresh_token: null,
    })
    .eq("id", user.id);

  if (profileErr) {
    return NextResponse.redirect(new URL(`/dashboard?discord=error&reason=${encodeURIComponent(profileErr.message)}`, siteUrl()));
  }

  const next = new URL(request.url).searchParams.get("next");
  const target = next?.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(new URL(`${target}?discord=disconnected`, siteUrl()));
}
