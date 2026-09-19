import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;

function fehler(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Echtes Kalenderdatum? (`2026-02-31` fällt durch, auch wenn das Muster passt.) */
function istKalenderdatum(value: string): boolean {
  if (!DATUM_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data } = await supabase.from("homework").select("*").order("due_date", { ascending: true });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

/**
 * Hausaufgabe anlegen. Das Fälligkeitsdatum ist optional: ohne Datum bleibt die
 * Aufgabe für Mitglieder aktuell, bis sie archiviert oder gelöscht wird (Regel
 * in `lib/hausaufgaben.ts`). Die Spalte `due_date` war immer nullable — gescheitert
 * ist die fristlose Aufgabe nicht hier, sondern an der Mitgliederansicht.
 */
export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    due_date?: unknown;
    week_number?: unknown;
  } | null;
  if (!body) return fehler("Ungültige Anfrage.");

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return fehler("Bitte einen Titel angeben.");
  if (title.length > 300) return fehler("Der Titel ist zu lang (höchstens 300 Zeichen).");

  const description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;

  // Leer, null oder fehlend = ohne Frist.
  const dueRaw = typeof body.due_date === "string" ? body.due_date.trim() : "";
  if (dueRaw && !istKalenderdatum(dueRaw)) return fehler("Das Fälligkeitsdatum ist ungültig.");
  const due_date = dueRaw || null;

  let week_number: number | null = null;
  if (body.week_number != null && body.week_number !== "") {
    const n = Number(body.week_number);
    if (!Number.isInteger(n) || n < 1 || n > 520) return fehler("Die Woche muss eine ganze Zahl ab 1 sein.");
    week_number = n;
  }

  const { data, error: insertError } = await supabase
    .from("homework")
    .insert({ title, description, due_date, week_number, is_active: true })
    .select("*")
    .single();
  if (insertError) return fehler(insertError.message);
  return NextResponse.json({ ok: true, item: data });
}

/**
 * Archivieren / reaktivieren (`is_active`). Archiviert heißt: für Mitglieder
 * unter „Vergangene Aufgaben“, die Erledigt-Häkchen bleiben erhalten. Das ist
 * der Weg, eine fristlose Aufgabe zu beenden, ohne ihre Geschichte zu löschen.
 */
export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as { id?: unknown; is_active?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!UUID_RE.test(id)) return fehler("Ungültige Hausaufgabe.");
  if (typeof body?.is_active !== "boolean") return fehler("Ungültiger Status.");

  const { data, error: updateError } = await supabase
    .from("homework")
    .update({ is_active: body.is_active })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (updateError) return fehler(updateError.message);
  if (!data) return fehler("Hausaufgabe nicht gefunden.", 404);
  return NextResponse.json({ ok: true, item: data });
}

/**
 * Hausaufgabe löschen — jede, auch abgelaufene. Vorher gab es dafür weder
 * Route noch Knopf.
 *
 * Abhängige Daten regelt die Datenbank über die Fremdschlüssel aus Migration
 * 014 (in 078 noch einmal festgezogen):
 * - `homework_user_official_done` → `on delete cascade`: die Erledigt-Häkchen
 *   der Mitglieder zu dieser Aufgabe verschwinden mit.
 * - `homework_user_custom_tasks` → `on delete set null`: eigene Aufgaben der
 *   Mitglieder bleiben in ihrer Checkliste stehen.
 * Bewusst kein Vorab-Löschen hier in der Route: Mit der Admin-Session griffe
 * RLS (`homework_user_*` erlaubt nur eigene Zeilen), das Löschen liefe still
 * ins Leere. Fremdschlüssel-Aktionen laufen an RLS vorbei.
 */
export async function DELETE(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!UUID_RE.test(id)) return fehler("Ungültige Hausaufgabe.");

  // `.select` macht sichtbar, ob wirklich eine Zeile weg ist — ein von RLS
  // verschlucktes Löschen käme sonst als Erfolg zurück.
  const { data, error: deleteError } = await supabase.from("homework").delete().eq("id", id).select("id");
  if (deleteError) return fehler(deleteError.message);
  if (!data || data.length === 0) return fehler("Hausaufgabe nicht gefunden oder keine Berechtigung.", 404);
  return NextResponse.json({ ok: true });
}
