import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { runModuleScanForCourse } from "@/lib/scan-modules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as { courseId?: string; prefix?: string };
  const courseId = body.courseId?.trim();
  if (!courseId || !UUID_RE.test(courseId)) {
    return NextResponse.json({ ok: false, error: "invalid_or_missing_course_id" }, { status: 400 });
  }

  const prefix = (body.prefix?.trim() || "modules").replace(/^\/+/, "");

  try {
    const result = await runModuleScanForCourse(supabase, courseId, prefix);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
