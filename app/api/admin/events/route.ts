import { randomUUID } from "node:crypto";
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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EXTRA_WEEKS = 8;

function endOfUtcDayFromDateString(ymd: string): number {
  return new Date(`${ymd}T23:59:59.999Z`).getTime();
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
    is_recurring?: boolean;
    recurrence_end_date?: string | null;
  };

  const base = {
    title: body.title,
    description: body.description ?? null,
    event_type: body.event_type ?? "webinar",
    color: body.color ?? "#D4AF37",
    external_url: body.external_url ?? null,
    created_by: userId,
  };

  const start = new Date(body.start_time);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ ok: false, error: "invalid_start_time" }, { status: 400 });
  }
  const end = body.end_time ? new Date(body.end_time) : null;
  const durationMs = end && !Number.isNaN(end.getTime()) ? end.getTime() - start.getTime() : 0;

  const isRecurring = Boolean(body.is_recurring);
  const recurrenceEndMs = body.recurrence_end_date?.trim()
    ? endOfUtcDayFromDateString(body.recurrence_end_date.trim())
    : null;

  if (isRecurring && recurrenceEndMs !== null && start.getTime() > recurrenceEndMs) {
    return NextResponse.json({ ok: false, error: "recurrence_end_before_start" }, { status: 400 });
  }

  if (!isRecurring) {
    const { data, error: insertError } = await supabase
      .from("events")
      .insert({
        ...base,
        start_time: body.start_time,
        end_time: body.end_time ?? null,
        is_recurring: false,
        recurrence_end_date: null,
        recurrence_group_id: null,
      })
      .select("*")
      .single();
    if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
    return NextResponse.json({ ok: true, item: data, items: [data] });
  }

  const recurrenceGroupId = randomUUID();
  const recurrenceEndDate = body.recurrence_end_date?.trim() || null;

  const rows: Array<Record<string, unknown>> = [];
  for (let n = 0; n <= MAX_EXTRA_WEEKS; n += 1) {
    const occStart = new Date(start.getTime() + n * WEEK_MS);
    if (n > 0 && recurrenceEndMs !== null && occStart.getTime() > recurrenceEndMs) {
      break;
    }
    const occEnd =
      end && durationMs > 0 ? new Date(occStart.getTime() + durationMs).toISOString() : body.end_time ?? null;
    rows.push({
      ...base,
      start_time: occStart.toISOString(),
      end_time: occEnd,
      is_recurring: true,
      recurrence_end_date: recurrenceEndDate,
      recurrence_group_id: recurrenceGroupId,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "no_occurrences_in_range" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase.from("events").insert(rows).select("*");
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  const items = data ?? [];
  return NextResponse.json({ ok: true, item: items[0], items });
}

export async function DELETE(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const deleteMode = searchParams.get("deleteMode") ?? "single";
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing event id" }, { status: 400 });
  }

  if (deleteMode === "future") {
    const { data: ev, error: fetchErr } = await supabase
      .from("events")
      .select("id, start_time, recurrence_group_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 400 });
    if (!ev) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (!ev.recurrence_group_id) {
      const { error: deleteError } = await supabase.from("events").delete().eq("id", id);
      if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("recurrence_group_id", ev.recurrence_group_id)
      .gte("start_time", ev.start_time as string);
    if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { error: deleteError } = await supabase.from("events").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
