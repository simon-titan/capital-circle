import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

type OrderedItem = { type: "video" | "subcategory"; id: string };

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as {
    moduleId?: string;
    orderedItems?: OrderedItem[];
  };

  const { moduleId, orderedItems } = body;
  if (!moduleId?.trim() || !Array.isArray(orderedItems)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  for (let i = 0; i < orderedItems.length; i++) {
    const item = orderedItems[i];
    if (!item || (item.type !== "video" && item.type !== "subcategory") || !item.id?.trim()) {
      return NextResponse.json({ ok: false, error: "invalid_ordered_item" }, { status: 400 });
    }

    if (item.type === "video") {
      const { error: uErr } = await supabase
        .from("videos")
        .update({ position: i })
        .eq("id", item.id)
        .eq("module_id", moduleId)
        .is("subcategory_id", null);
      if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 400 });
    } else {
      const { error: uErr } = await supabase
        .from("subcategories")
        .update({ position: i })
        .eq("id", item.id)
        .eq("module_id", moduleId);
      if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
