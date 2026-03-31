import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { supabase, user: null, error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", authData.user.id).single();
  if (!profile?.is_admin) {
    return { supabase, user: authData.user, error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }
  return { supabase, user: authData.user, error: null };
}
