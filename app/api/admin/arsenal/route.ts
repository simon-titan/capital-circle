import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as {
    reorder?: boolean;
    category?: "tools" | "fremdkapital";
    orderedIds?: string[];
  };

  if (!body.reorder || !body.category || !Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  for (let i = 0; i < body.orderedIds.length; i += 1) {
    const id = body.orderedIds[i];
    const { error: upErr } = await supabase
      .from("arsenal_cards")
      .update({ sort_order: i, position: i })
      .eq("id", id)
      .eq("category", body.category);
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
