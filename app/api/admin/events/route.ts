import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { supabase, error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", authData.user.id).single();
  if (!profile?.is_admin) return { supabase, error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  return { supabase, error: null, userId: authData.user.id };
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data } = await supabase.from("events").select("*").order("start_time", { ascending: true });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error, userId } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;
    event_type?: string;
    color?: string;
    external_url?: string;
  };
  const { data, error: insertError } = await supabase
    .from("events")
    .insert({
      title: body.title,
      description: body.description ?? null,
      start_time: body.start_time,
      end_time: body.end_time ?? null,
      event_type: body.event_type ?? "webinar",
      color: body.color ?? "#D4AF37",
      external_url: body.external_url ?? null,
      created_by: userId,
    })
    .select("*")
    .single();
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}
