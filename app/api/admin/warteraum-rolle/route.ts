import { NextResponse } from "next/server";
import { KARENZ_TAGE, SCHUTZROLLEN } from "@/config/discord";
import { evaluateAccess, type AccessTier } from "@/lib/access-control/has-access";
import { cronBefugt } from "@/lib/cron/auth";
import { discordBotConfigured, listGuildMembers, listGuildRoles } from "@/lib/discord/api";
import { mitgliedsRolleId, warteraumRolleId } from "@/lib/discord/mitgliedschaft";
import { setzeWarteraumrolle } from "@/lib/discord/warteraum";
import { requireAdminRole } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { laufenderAufschub } from "@/lib/zahlung/aufschub";
import { hatAnderenZugang } from "@/lib/zahlung/fall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Den Warteraum für den Bestand nachziehen.
 *
 * Übernommen aus MoonTrading (`app/api/admin/pausenrolle`). Die Rolle „Zugang
 * pausiert" gibt es ab jetzt; wer seinen Zugang **vorher** verloren hat, hat sie
 * nicht und schaut auf einen Server, auf dem ihm niemand erklärt, warum die
 * Mitglieder-Kanäle weg sind. Neue Fälle holt das System von selbst, für die
 * alten muss jemand anstossen: `npm run discord:warteraum-rolle`.
 *
 * ── Der Probelauf ist die Vorgabe, nicht die Ausnahme ───────────────────────
 *
 * `GET` schreibt nichts und zeigt die Gruppen. `POST` schreibt, und nur mit
 * `anzahl` — der Zahl aus dem Probelauf. Weicht die berechnete Menge ab,
 * passiert nichts. Der Anfragekörper trägt **keine** Namensliste: Sonst wäre
 * die Vorsortierung eine Empfehlung, die man umgehen kann.
 *
 * ── Die Menge ───────────────────────────────────────────────────────────────
 *
 * Wer auf dem Server ist, ein verknüpftes Konto hat, heute keinen Zugang,
 * keine Mitgliederrolle, keine Schutzrolle, keinen Aufschub und keinen anderen
 * Vertrag. Wer kein Konto hat, bleibt draussen: Zu ihm gibt es weder eine
 * Zahlung noch eine Kündigung.
 *
 * ── Die dreissig Tage starten dabei nicht neu ──────────────────────────────
 *
 * Gemessen wird weiter ab `profiles.access_until`. Wer seit Wochen keinen
 * Zugang hat, wird mit der Warteraumrolle **sofort** zum Rauswurf fällig
 * (`sofortFaellig`). Sind das mehr als die Obergrenze je Nacht, hält der
 * Rauswurf-Lauf vollständig an; `/api/cron/taeglich?probe=1` sagt es vorher.
 *
 * Keine Direktnachricht: Eine Nachricht Wochen später, die dasselbe sagt wie
 * die Sperre, liest sich wie eine Mahnung für etwas, das längst passiert ist.
 */

const TAG_MS = 86_400_000;

interface Zeile {
  discordId: string;
  username: string;
  userId: string | null;
  /** Wann der Zugang endete, aus `profiles.access_until`. */
  gesperrtSeit: string | null;
  tage: number | null;
  /** Wäre mit der Rolle sofort zum Rauswurf fällig. */
  sofortFaellig: boolean;
}

interface Stand {
  bekommt: Zeile[];
  hatSchon: Zeile[];
  /** Kein Zugang, trägt aber noch die Mitgliederrolle: ein Fall für den Bestandsabgleich. */
  mitRolleOhneZugang: Zeile[];
  /** Auf dem Server, ohne Konto. Nur gezählt. */
  ohneKonto: number;
  hinweise: string[];
}

function tageSeit(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return Math.floor((Date.now() - ms) / TAG_MS);
}

async function befugt(request: Request): Promise<NextResponse | null> {
  if (cronBefugt(request)) return null;
  const { error } = await requireAdminRole("admin");
  return error;
}

/** Baut den Stand, ohne etwas zu ändern. Wirft bei Fehlern, die eine Aussage unmöglich machen. */
async function ladeStand(): Promise<Stand> {
  const rolle = warteraumRolleId();
  const mitglied = mitgliedsRolleId();
  if (!rolle) throw new Error("DISCORD_WAITING_ROOM_ROLE_ID ist nicht gesetzt.");
  if (!mitglied || !discordBotConfigured()) throw new Error("Discord-Bot oder DISCORD_ROLE_ID ist nicht eingerichtet.");

  const supabase = createServiceClient();
  const [mitglieder, rollen] = await Promise.all([listGuildMembers(), listGuildRoles()]);

  const schutzIds = new Set(
    rollen
      .filter((r) => (SCHUTZROLLEN as readonly string[]).some((s) => s.toLowerCase() === r.name.toLowerCase()))
      .map((r) => r.id),
  );

  const [profilRes, verbindungRes] = await Promise.all([
    supabase.from("profiles").select("id,discord_id,membership_tier,is_paid,access_until").not("discord_id", "is", null),
    supabase.from("discord_connections").select("user_id,discord_user_id"),
  ]);
  if (profilRes.error) throw new Error(`Profile nicht lesbar: ${profilRes.error.message}`);
  if (verbindungRes.error) throw new Error(`discord_connections nicht lesbar: ${verbindungRes.error.message}`);

  type P = { id: string; discord_id: string | null; membership_tier: string | null; is_paid: boolean | null; access_until: string | null };
  const profilJeId = new Map(((profilRes.data ?? []) as P[]).map((p) => [p.id, p]));
  const userJeDiscord = new Map<string, string>();
  for (const p of profilJeId.values()) if (p.discord_id) userJeDiscord.set(p.discord_id, p.id);
  for (const v of (verbindungRes.data ?? []) as Array<{ user_id: string; discord_user_id: string }>) {
    userJeDiscord.set(v.discord_user_id, v.user_id);
  }
  const fehlend = [...new Set(userJeDiscord.values())].filter((id) => !profilJeId.has(id));
  if (fehlend.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,discord_id,membership_tier,is_paid,access_until")
      .in("id", fehlend);
    if (error) throw new Error(`Profile nicht nachladbar: ${error.message}`);
    for (const p of (data ?? []) as P[]) profilJeId.set(p.id, p);
  }

  const stand: Stand = { bekommt: [], hatSchon: [], mitRolleOhneZugang: [], ohneKonto: 0, hinweise: [] };

  for (const m of mitglieder) {
    const userId = userJeDiscord.get(m.id) ?? null;
    const profil = userId ? profilJeId.get(userId) : undefined;
    const gesperrtSeit = profil?.access_until ?? null;
    const tage = tageSeit(gesperrtSeit);
    const zeile: Zeile = {
      discordId: m.id,
      username: m.username,
      userId,
      gesperrtSeit,
      tage,
      sofortFaellig: tage !== null && tage >= KARENZ_TAGE,
    };

    if (m.roles.includes(rolle)) {
      stand.hatSchon.push(zeile);
      continue;
    }
    if (m.roles.some((r) => schutzIds.has(r))) continue;
    if (!profil) {
      if (!m.roles.includes(mitglied)) stand.ohneKonto++;
      continue;
    }

    const zugang = evaluateAccess({
      membership_tier: (profil.membership_tier ?? "free") as AccessTier,
      is_paid: profil.is_paid,
      access_until: profil.access_until,
    }).hasAccess;
    if (zugang) continue;

    if (m.roles.includes(mitglied)) {
      stand.mitRolleOhneZugang.push(zeile);
      continue;
    }

    /*
      Die letzten Schranken, dieselben wie überall: ein anderer Vertrag
      (`hatAnderenZugang`, wirft bei Fehlern — dann bleibt die Person draussen)
      und ein laufender Aufschub.
    */
    try {
      if (await hatAnderenZugang(supabase, profil.id)) continue;
    } catch {
      continue;
    }
    if (await laufenderAufschub(supabase, profil.id)) continue;

    stand.bekommt.push(zeile);
  }

  const sofort = stand.bekommt.filter((z) => z.sofortFaellig).length;
  if (sofort > 0) {
    stand.hinweise.push(
      `${sofort} von ${stand.bekommt.length} haben seit mehr als ${KARENZ_TAGE} Tagen keinen Zugang und wären nach dem ` +
        "Nachziehen sofort zum Rauswurf fällig. Vorher /api/cron/taeglich?probe=1 ansehen.",
    );
  }
  if (stand.mitRolleOhneZugang.length > 0) {
    stand.hinweise.push(
      `${stand.mitRolleOhneZugang.length} tragen ohne Zugang noch die Mitgliederrolle. Das erledigt der Bestandsabgleich ` +
        "(npm run discord:sync -- --apply --warteraum) oder der Nachtlauf, nicht dieser Lauf.",
    );
  }

  return stand;
}

/** Der Probelauf. Ändert nichts. */
export async function GET(request: Request) {
  const nein = await befugt(request);
  if (nein) return nein;
  try {
    const stand = await ladeStand();
    return NextResponse.json({ ok: true, probe: true, karenzTage: KARENZ_TAGE, ...stand });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

/**
 * Scharf. Verlangt `anzahl`, oder `nur` für ein einzelnes Discord-Konto (der
 * Test am eigenen Konto; `entziehen: true` nimmt die Rolle wieder ab).
 */
export async function POST(request: Request) {
  const nein = await befugt(request);
  if (nein) return nein;

  const body = (await request.json().catch(() => ({}))) as { anzahl?: number; nur?: string; entziehen?: boolean };

  if (typeof body.nur === "string" && body.nur.trim()) {
    const an = body.entziehen !== true;
    const ok = await setzeWarteraumrolle(body.nur.trim(), an);
    return NextResponse.json({
      ok,
      einzeln: true,
      discordId: body.nur.trim(),
      gesetzt: an,
      hinweis: ok ? null : "Discord hat die Änderung nicht bestätigt, bitte auf dem Server nachsehen.",
    });
  }

  if (typeof body.anzahl !== "number" || !Number.isInteger(body.anzahl) || body.anzahl < 0) {
    return NextResponse.json(
      { ok: false, error: "anzahl fehlt. Erst den Probelauf aufrufen und die Zahl von dort übernehmen." },
      { status: 400 },
    );
  }

  let stand: Stand;
  try {
    stand = await ladeStand();
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }

  if (stand.bekommt.length !== body.anzahl) {
    return NextResponse.json({
      ok: false,
      error: `Die Menge hat sich geändert: ${stand.bekommt.length} statt ${body.anzahl}. Es wurde nichts geändert.`,
      berechnet: stand.bekommt.length,
      erwartet: body.anzahl,
    });
  }

  const ergebnisse: Array<{ username: string; discordId: string; gesetzt: boolean }> = [];
  for (const z of stand.bekommt) {
    const gesetzt = await setzeWarteraumrolle(z.discordId, true);
    ergebnisse.push({ username: z.username, discordId: z.discordId, gesetzt });
  }
  const misslungen = ergebnisse.filter((e) => !e.gesetzt);

  return NextResponse.json({
    ok: misslungen.length === 0,
    gesetzt: ergebnisse.length - misslungen.length,
    misslungen,
    hinweise: stand.hinweise,
  });
}
