import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

export const runtime = "nodejs";

type CertificateRow = {
  id: string;
  storage_key: string;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  is_public: boolean;
  submitted_at: string;
  reviewed_at: string | null;
};

async function toItem(row: CertificateRow) {
  return {
    id: row.id,
    caption: row.caption,
    status: row.status,
    isPublic: row.is_public,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    imageUrl: await getPresignedGetUrl(row.storage_key),
  };
}

/** GET /api/certificates — eigene eingereichte Nachweise (neueste zuerst). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("certificates")
    .select("id, storage_key, caption, status, is_public, submitted_at, reviewed_at")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as CertificateRow[];
  const items = await Promise.all(rows.map(toItem));
  return NextResponse.json({ ok: true, items });
}

/** POST /api/certificates { storageKey, caption? } — neuen Nachweis einreichen (status=pending). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { storageKey?: unknown; caption?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const storageKey = typeof body.storageKey === "string" ? body.storageKey.trim() : "";
  const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 500) : "";

  if (!storageKey) {
    return NextResponse.json({ ok: false, error: "missing_storage_key" }, { status: 400 });
  }
  // Nur eigene Presign-Keys akzeptieren (siehe /api/certificates/presign-upload).
  if (!storageKey.startsWith(`certificates/${user.id}/`)) {
    return NextResponse.json({ ok: false, error: "invalid_storage_key" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("certificates")
    .insert({ user_id: user.id, storage_key: storageKey, caption: caption || null })
    .select("id, storage_key, caption, status, is_public, submitted_at, reviewed_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const item = await toItem(data as CertificateRow);
  return NextResponse.json({ ok: true, item });
}
