import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { getPresignedGetUrl } from "@/lib/storage";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
  }

  const signed = await getPresignedGetUrl(key);
  return NextResponse.redirect(signed, { status: 307 });
}
