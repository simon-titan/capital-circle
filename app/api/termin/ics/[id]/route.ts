import { createServiceClient } from "@/lib/supabase/service";
import type { TerminZeile } from "@/lib/mailsystem/termine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/termin/ics/<terminId>?t=<lead_token> — Kalendereintrag (.ics) für
 * ein gebuchtes Analysegespräch (Playbook: `calendar_event_url`), mit Zeit,
 * Ansprechpartner und Einwahllink der aktuellen Terminversion. Der Lead-Token
 * schützt die Adresse vor dem Durchprobieren.
 */
function ics(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const { data } = await createServiceClient().from("termine").select("*").eq("id", id).maybeSingle();
  let t = data as TerminZeile | null;
  if (!t || !token || t.lead_token !== token) return new Response("Nicht gefunden", { status: 404 });
  // Alter Link nach einer Umbuchung: immer die aktuelle Version des Vorgangs ausliefern.
  if (t.status === "umgebucht") {
    const { data: neu } = await createServiceClient()
      .from("termine")
      .select("*")
      .eq("vorgang", t.vorgang)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (neu) t = neu as TerminZeile;
  }

  const abgesagt = t.status === "abgesagt_kunde" || t.status === "abgesagt_team";
  // Eine UID je Gesprächsvorgang: Eine Umbuchung ersetzt den Eintrag im Kalender, statt einen zweiten anzulegen.
  const { count } = await createServiceClient().from("termine").select("id", { count: "exact", head: true }).eq("vorgang", t.vorgang);
  const sequenz = Math.max(0, (count ?? 1) - 1);
  const start = new Date(t.start_am);
  const ende = t.ende_am ? new Date(t.ende_am) : new Date(start.getTime() + 45 * 60_000);
  const beschreibung = [
    `Analysegespräch mit ${t.berater_name ?? "dem Capital-Circle-Team"}.`,
    t.join_url ? `Einwahl: ${t.join_url}` : null,
    t.umbuchen_url ? `Termin verwalten: ${t.umbuchen_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Capital Circle//Analysegespraech//DE",
    abgesagt ? "METHOD:CANCEL" : "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${t.vorgang.replace(/[^a-z0-9:-]/gi, "")}@capitalcircletrading.com`,
    `SEQUENCE:${sequenz}`,
    `STATUS:${abgesagt ? "CANCELLED" : "CONFIRMED"}`,
    `DTSTAMP:${ics(new Date())}`,
    `DTSTART:${ics(start)}`,
    `DTEND:${ics(ende)}`,
    `SUMMARY:${esc("Analysegespräch · Capital Circle")}`,
    `DESCRIPTION:${esc(beschreibung)}`,
    ...(t.join_url ? [`LOCATION:${esc(t.join_url)}`, `URL:${t.join_url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(text, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="analysegespraech.ics"',
      "cache-control": "no-store",
    },
  });
}
