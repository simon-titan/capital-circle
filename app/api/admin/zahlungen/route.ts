import { NextResponse } from "next/server";
import { antworteKunde, gewaehreAufschub, schliesseFall } from "@/lib/admin/zahlungsfaelle";
import { requireAdminRole } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zahlungsfälle: antworten, stunden, schliessen (Fallakte unter
 * `/admin/zahlungsstoerungen/[id]`).
 *
 * ── Rechte ──────────────────────────────────────────────────────────────────
 *
 * Antworten und Schliessen darf ab der Rolle „support" jeder im Team. Der
 * **Aufschub** hält einen Zugang aufrecht, für den kein Geld geflossen ist —
 * das ist eine Entscheidung über Geld und verlangt die Rolle „admin".
 *
 * ── Die `adminId` kommt aus der Sitzung, nie aus dem Körper ─────────────────
 *
 * Wer sie mitschicken dürfte, könnte im Namen eines anderen stunden, und
 * `aufschub_von` wäre wertlos. Der Aufschub landet zusätzlich in
 * `user_audit_log`, neben den anderen Entscheidungen über Zugänge.
 */
export async function POST(request: Request) {
  let koerper: {
    aktion?: unknown;
    fallId?: unknown;
    text?: unknown;
    alsNotiz?: unknown;
    perMail?: unknown;
    bis?: unknown;
    grund?: unknown;
    benachrichtigen?: unknown;
  };
  try {
    koerper = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Kein gültiger Anfragekörper." }, { status: 400 });
  }

  const fallId = typeof koerper.fallId === "string" ? koerper.fallId : "";
  if (!/^[0-9a-f-]{36}$/i.test(fallId)) {
    return NextResponse.json({ ok: false, error: "Kein Fall angegeben." }, { status: 400 });
  }

  if (koerper.aktion === "antworten") {
    const { user, error } = await requireAdminRole("support");
    if (error) return error;
    const ergebnis = await antworteKunde({
      fallId,
      adminId: user!.id,
      text: typeof koerper.text === "string" ? koerper.text : "",
      alsNotiz: koerper.alsNotiz === true,
      perMail: koerper.perMail !== false,
    });
    return ergebnis.ok
      ? NextResponse.json({ ok: true, hinweise: ergebnis.hinweise })
      : NextResponse.json({ ok: false, error: ergebnis.fehler }, { status: 400 });
  }

  if (koerper.aktion === "aufschub") {
    const { user, error } = await requireAdminRole("admin");
    if (error) return error;
    const bis = typeof koerper.bis === "string" ? koerper.bis : "";
    const ergebnis = await gewaehreAufschub({
      fallId,
      adminId: user!.id,
      bis,
      grund: typeof koerper.grund === "string" ? koerper.grund : null,
      benachrichtigen: koerper.benachrichtigen !== false,
    });
    if (!ergebnis.ok) return NextResponse.json({ ok: false, error: ergebnis.fehler }, { status: 400 });

    // Protokoll: Wer hat wem wie lange Zugang ohne Zahlung gegeben. Der Grund
    // steht im Verlauf des Falls, nicht hier.
    const service = createServiceClient();
    const { data: fall } = await service.from("zahlungsfall").select("user_id").eq("id", fallId).maybeSingle();
    const { error: logFehler } = await service.from("user_audit_log").insert({
      target_user_id: (fall as { user_id: string } | null)?.user_id ?? null,
      admin_user_id: user!.id,
      action: "zahlungsaufschub",
      field: "zahlungsfall.aufschub_bis",
      new_value: bis,
      metadata: { fallId },
    });
    if (logFehler) console.warn("[admin/zahlungen] Aufschub nicht protokolliert:", logFehler.message);

    return NextResponse.json({ ok: true, hinweise: ergebnis.hinweise });
  }

  if (koerper.aktion === "schliessen") {
    const { user, error } = await requireAdminRole("support");
    if (error) return error;
    const ergebnis = await schliesseFall({
      fallId,
      adminId: user!.id,
      grund: typeof koerper.grund === "string" ? koerper.grund : "",
    });
    return ergebnis.ok
      ? NextResponse.json({ ok: true, hinweise: ergebnis.hinweise })
      : NextResponse.json({ ok: false, error: ergebnis.fehler }, { status: 400 });
  }

  return NextResponse.json({ ok: false, error: "Unbekannte Aktion." }, { status: 400 });
}
