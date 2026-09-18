import { NextResponse, type NextRequest } from "next/server";
import { LIFETIME_SETTINGS_KEY } from "@/lib/access-control/lifetime-offer";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Steuerung des Lifetime-Angebots.
 *
 * Zwei Ebenen in einer Route, weil sie dieselbe Frage beantworten — „wer darf
 * Lifetime kaufen":
 *
 *   PUT  → der **globale Schalter**. An bedeutet: jedes zahlende Mitglied
 *          sieht das Angebot. Das ist der Normalfall.
 *   POST → die **Freischalt-Gruppe** einzelner Nutzer. Sie greift nur, wenn
 *          der globale Schalter aus ist, und erlaubt es, ein bestimmtes
 *          Segment (etwa importierte Bestandsmitglieder) gezielt anzusprechen.
 *
 * Die Reihenfolge der Auswertung steht in `lib/access-control/lifetime-offer.ts`
 * und gilt serverseitig auch für die Kasse — ein ausgeblendetes Angebot allein
 * wäre kein Riegel.
 */

/** GET — Zustand des globalen Schalters und die vergebenen Gruppen. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();

  const [schalterErgebnis, gruppenErgebnis] = await Promise.all([
    service.from("app_settings").select("value,updated_at").eq("key", LIFETIME_SETTINGS_KEY).maybeSingle(),
    service.from("profiles").select("lifetime_offer_group").not("lifetime_offer_group", "is", null),
  ]);

  // Fehlt die Zeile (Migration 071 noch nicht eingespielt), gilt „an" — so
  // liefert die Migration aus, und so verhält sich auch die Leseseite.
  const wert = (schalterErgebnis.data as { value?: { enabled?: unknown } } | null)?.value;
  const enabled = wert && typeof wert === "object" && "enabled" in wert ? Boolean(wert.enabled) : true;

  const gruppen = new Map<string, number>();
  for (const zeile of (gruppenErgebnis.data as { lifetime_offer_group: string | null }[] | null) ?? []) {
    const g = zeile.lifetime_offer_group?.trim();
    if (g) gruppen.set(g, (gruppen.get(g) ?? 0) + 1);
  }

  return NextResponse.json({
    ok: true,
    enabled,
    updatedAt: (schalterErgebnis.data as { updated_at?: string } | null)?.updated_at ?? null,
    groups: [...gruppen.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
  });
}

/** PUT — globalen Schalter setzen. */
export async function PUT(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body: { enabled?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "enabled_must_be_boolean" }, { status: 400 });
  }

  const service = createServiceClient();

  // `upsert` statt `update`: Wer 071 eingespielt hat, hat die Zeile — wer den
  // Schalter aber vor der Migration umlegt, bekäme sonst ein stilles
  // „0 Zeilen geändert" und einen Schalter, der zurückspringt.
  const { error: dbFehler } = await service
    .from("app_settings")
    .upsert(
      { key: LIFETIME_SETTINGS_KEY, value: { enabled: body.enabled }, updated_by: user?.id ?? null },
      { onConflict: "key" },
    );

  if (dbFehler) {
    return NextResponse.json({ ok: false, error: dbFehler.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enabled: body.enabled });
}

/** POST — Freischalt-Gruppe für einen oder mehrere Nutzer setzen bzw. entfernen. */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: { userIds?: unknown; group?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const userIds = Array.isArray(body.userIds) ? body.userIds.filter((v): v is string => typeof v === "string") : [];
  if (userIds.length === 0) {
    return NextResponse.json({ ok: false, error: "keine_nutzer" }, { status: 400 });
  }

  // `null` entfernt die Gruppe. Ein leerer String täte dasselbe, wäre in der
  // Spalte aber nicht von „keine Gruppe" zu unterscheiden — deshalb normieren.
  const gruppe =
    typeof body.group === "string" && body.group.trim() ? body.group.trim().slice(0, 64) : null;

  const service = createServiceClient();
  const { error: dbFehler } = await service
    .from("profiles")
    .update({ lifetime_offer_group: gruppe })
    .in("id", userIds);

  if (dbFehler) {
    return NextResponse.json({ ok: false, error: dbFehler.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: userIds.length, group: gruppe });
}
