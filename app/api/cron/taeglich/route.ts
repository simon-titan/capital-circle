import { NextResponse } from "next/server";
import { ERINNERUNG_TAGE } from "@/config/zahlung";
import { cronBefugt } from "@/lib/cron/auth";
import { requireAdminRole } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { beendeAbgelaufeneAufschuebe, fuehreFristAus } from "@/lib/zahlung/fall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Der tägliche Lauf: was von selbst fällig wird.
 *
 * Übernommen aus MoonTrading (`app/api/admin/taeglich`). Ersetzt
 * `app/api/cron/process-dunning` (Mails nach 24/48 Stunden, Slack-Alarm nach
 * sieben Tagen) vollständig — die beiden laufen **nicht** parallel.
 *
 * ── Was hier läuft ──────────────────────────────────────────────────────────
 *
 * 1. **Abgelaufene Aufschübe beenden.** Zugang und Rolle weg, Warteraum,
 *    Nachricht, Verlauf.
 * 2. **Der Sieben-Tage-Ablauf.** An Tag 3 und Tag 5 eine Erinnerung, an Tag 7
 *    ruht der Zugang. Zahlen und Wortlaut stehen in `config/zahlung.ts`.
 *
 * Die Reihenfolge ist Absicht: Ein Fall, dessen Aufschub gerade abgelaufen
 * ist, steht danach auf `beendet` und wird von der Frist nicht noch einmal
 * angefasst. Andersherum bekäme dieselbe Person zwei Nachrichten.
 *
 * ── Drei Zugänge ────────────────────────────────────────────────────────────
 *
 * Vercel-Cron per GET mit `Authorization: Bearer $CRON_SECRET` — **fail-closed**:
 * Fehlt `CRON_SECRET`, ist der Weg zu. Ein Mensch per POST über die
 * angemeldete Sitzung (Admin). `?probe=1` sagt, was passieren würde, und tut
 * nichts.
 *
 * ── Wann er läuft ───────────────────────────────────────────────────────────
 *
 * `0 2 * * *` (UTC) in `vercel.json`, also nachts. Ein Cron, der in ein
 * Deployment fällt, fällt still aus; weil jede Erinnerung über einen Zähler
 * läuft und jede Sperre über die Frist, holt der nächste Lauf alles nach.
 */

export async function GET(request: Request) {
  if (!cronBefugt(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (new URL(request.url).searchParams.get("probe") === "1") return probe();
  return lauf();
}

export async function POST(request: Request) {
  if (!cronBefugt(request)) {
    const { error } = await requireAdminRole("admin");
    if (error) return error;
  }
  if (new URL(request.url).searchParams.get("probe") === "1") return probe();
  return lauf();
}

async function lauf() {
  const supabase = createServiceClient();
  const start = Date.now();

  const aufschuebe = await beendeAbgelaufeneAufschuebe(supabase);
  const frist = await fuehreFristAus(supabase);

  /*
    Der Lauf gilt nur als sauber, wenn keine Zeile Ärger gemacht hat. Ein
    `ok: true` neben einer Fehlerliste ist genau der stille Nuller, den man
    wochenlang übersieht.
  */
  return NextResponse.json({
    ok: aufschuebe.fehler.length === 0 && frist.fehler.length === 0,
    dauer_ms: Date.now() - start,
    aufschuebe,
    frist,
  });
}

/**
 * Was der Lauf heute täte, ohne es zu tun: welche Fälle eine Erinnerung
 * bekämen, welche gesperrt würden, welche Aufschübe abliefen.
 *
 * Grob gerechnet: Ob die Person inzwischen einen anderen Zugang hat (dann
 * passiert gar nichts), prüft erst der echte Lauf.
 */
async function probe() {
  const supabase = createServiceClient();
  const jetzt = Date.now();

  const [offenRes, aufschubRes] = await Promise.all([
    supabase
      .from("zahlungsfall")
      .select("id,user_id,frist,erinnerungen,eroeffnet_am,betrag_cents")
      .is("geschlossen_am", null)
      .eq("status", "offen")
      .not("frist", "is", null),
    supabase
      .from("zahlungsfall")
      .select("id,user_id,aufschub_bis")
      .eq("status", "aufschub")
      .lt("aufschub_bis", new Date(jetzt).toISOString()),
  ]);

  if (offenRes.error || aufschubRes.error) {
    return NextResponse.json(
      { ok: false, error: offenRes.error?.message ?? aufschubRes.error?.message },
      { status: 502 },
    );
  }

  const faelle = (offenRes.data ?? []) as Array<{
    id: string;
    user_id: string;
    frist: string;
    erinnerungen: number;
    eroeffnet_am: string;
    betrag_cents: number;
  }>;

  const plan = faelle.map((f) => {
    const vergangen = Math.floor((jetzt - new Date(f.eroeffnet_am).getTime()) / 86_400_000);
    const faelligerTag = ERINNERUNG_TAGE[f.erinnerungen];
    const aktion =
      new Date(f.frist).getTime() <= jetzt
        ? "sperre"
        : faelligerTag !== undefined && vergangen >= faelligerTag
          ? `erinnerung ${f.erinnerungen + 1}`
          : "nichts";
    return { fallId: f.id, userId: f.user_id, tag: vergangen, frist: f.frist, aktion };
  });

  return NextResponse.json({
    ok: true,
    probe: true,
    offeneFaelleMitFrist: faelle.length,
    heute: plan.filter((p) => p.aktion !== "nichts"),
    aufschuebeAbgelaufen: (aufschubRes.data ?? []).length,
    hinweis:
      "Grob gerechnet. Hat eine Person inzwischen einen anderen Zugang (neues Abo, Lifetime), " +
      "schliesst der echte Lauf den Fall statt zu erinnern oder zu sperren. Hat sie keinen Zugang mehr, " +
      "wird sofort gesperrt.",
  });
}
