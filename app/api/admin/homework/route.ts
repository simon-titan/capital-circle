import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { supabase, error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", authData.user.id).single();
  if (!profile?.is_admin) return { supabase, error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  return { supabase, error: null };
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data } = await supabase.from("homework").select("*").order("due_date", { ascending: true });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    title: string;
    description?: string;
    due_date?: string;
    week_number?: number;
  };
  const { data, error: insertError } = await supabase
    .from("homework")
    .insert({
      title: body.title,
      description: body.description ?? null,
      due_date: body.due_date ?? null,
      week_number: body.week_number ?? null,
      is_active: true,
    })
    .select("*")
    .single();
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}
