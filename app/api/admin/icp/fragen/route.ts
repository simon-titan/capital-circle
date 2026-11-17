import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FRAGEN,
  FREE_FELDER,
  KAEUFER_FELDER,
  MEHRFACH_TRENNER,
  antwortText,
  antwortWerte,
  type FrageFeld,
} from "@/config/onboarding";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeAuthInfos } from "@/lib/training/board";
import { aktuellesEnde, type TrainingZugangZeile } from "@/lib/training/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Die ICP-Fragen nach Emre (Migration 113) für `/admin/icp/fragen`.
 *
 *   GET ?segment=free|kaeufer&tage=0|7|30|90            Auswertung + Antworten je Person
 *   GET …&format=csv                                     dieselben Personen als CSV
 *
 * **free**    = Free-Mitglieder mit angenommener Bewerbung, Fragen 1–7 (`profiles.icp_free_am`)
 * **kaeufer** = Stufe `mentoring`, Fragen 1–10 (`profiles.icp_kaeufer_am`)
 *
 * Ein Käufer, der vorher als Free-Mitglied geantwortet hat, steht in beiden
 * Segmenten — die Fragen 1–7 hat er dann nur einmal beantwortet.
 * „Ausstehend" zählt, wer die Fragen sehen müsste, sie aber noch nicht beendet hat.
 */

type Segment = "free" | "kaeufer";

type ZugangKurz = Pick<TrainingZugangZeile, "user_id" | "original_ende_am" | "verlaengerung_ende_am" | "verlaengerung_status">;

type Profil = {
  id: string;
  full_name: string | null;
  is_paid: boolean | null;
  is_admin: boolean | null;
  membership_tier: string | null;
  icp_free_am: string | null;
  icp_kaeufer_am: string | null;
};

type Antwort = Record<string, unknown> & { user_id: string; discovery_source_other?: string | null };

const STEMPEL: Record<Segment, "icp_free_am" | "icp_kaeufer_am"> = { free: "icp_free_am", kaeufer: "icp_kaeufer_am" };

/** PostgREST liefert höchstens 1000 Zeilen je Anfrage. */
async function alle<T>(
  holen: (von: number, bis: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await holen(von, von + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

async function inStuecken<T>(ids: string[], holen: (teil: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await holen(ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
  }
  return out;
}

function csvZelle(wert: unknown): string {
  const t = wert == null ? "" : String(wert);
  return /[",;\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function textMitSonstiges(feld: FrageFeld, a: Antwort | undefined): string {
  if (!a) return "—";
  if (feld === "discovery_source" && a.discovery_source === "sonstiges" && a.discovery_source_other) {
    return `Sonstiges: ${a.discovery_source_other}`;
  }
  return antwortText(feld, a);
}

/** Wer die Fragen sehen müsste, sie aber noch nicht beendet hat. */
async function ausstehend(service: SupabaseClient, segment: Segment): Promise<number> {
  if (segment === "kaeufer") {
    const { count } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("membership_tier", "mentoring")
      .eq("is_paid", true)
      .eq("is_admin", false)
      .is("icp_kaeufer_am", null);
    return count ?? 0;
  }
  // Free: laufender Trainingszugang, nicht zahlend, keine Antworten.
  const zugaenge = await alle<ZugangKurz>(
    (von, bis) =>
      service
        .from("training_zugang")
        .select("user_id, original_ende_am, verlaengerung_ende_am, verlaengerung_status")
        .range(von, bis) as unknown as PromiseLike<{
        data: ZugangKurz[] | null;
        error: { message: string } | null;
      }>,
  );
  const jetzt = Date.now();
  const offen = zugaenge.filter((z) => aktuellesEnde(z).getTime() > jetzt).map((z) => z.user_id);
  if (offen.length === 0) return 0;
  const profile = await inStuecken<{ id: string; is_paid: boolean | null; is_admin: boolean | null; icp_free_am: string | null }>(offen, (teil) =>
    service.from("profiles").select("id, is_paid, is_admin, icp_free_am").in("id", teil),
  );
  return profile.filter((p) => !p.is_paid && !p.is_admin && !p.icp_free_am).length;
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const segment: Segment = url.searchParams.get("segment") === "kaeufer" ? "kaeufer" : "free";
  const tage = Number(url.searchParams.get("tage") ?? "0");
  const seit = tage > 0 ? new Date(Date.now() - tage * 86_400_000).toISOString() : null;
  const stempel = STEMPEL[segment];
  const felder: FrageFeld[] = segment === "free" ? FREE_FELDER : KAEUFER_FELDER;
  const service = createServiceClient();

  try {
    const profile = (
      await alle<Profil>((von, bis) => {
        let q = service
          .from("profiles")
          .select("id, full_name, is_paid, is_admin, membership_tier, icp_free_am, icp_kaeufer_am")
          .not(stempel, "is", null);
        if (seit) q = q.gte(stempel, seit);
        return q.order(stempel, { ascending: false }).range(von, bis) as unknown as PromiseLike<{
          data: Profil[] | null;
          error: { message: string } | null;
        }>;
      })
    ).filter((p) => !p.is_admin);

    const ids = profile.map((p) => p.id);
    const [antworten, auth, offen] = await Promise.all([
      inStuecken<Antwort>(ids, (teil) => service.from("onboarding_antworten").select("*").in("user_id", teil)),
      ladeAuthInfos(service, new Set(ids)),
      ausstehend(service, segment),
    ]);
    const antwortMap = new Map(antworten.map((a) => [a.user_id, a]));

    const emails = [...new Set([...auth.values()].map((a) => a.email?.toLowerCase()).filter((e): e is string => Boolean(e)))];
    const kontakte = await inStuecken<{ id: string; email: string }>(emails, (teil) =>
      service.from("crm_kontakte").select("id, email").in("email", teil),
    ).catch(() => [] as { id: string; email: string }[]); // ohne Migration 112 eben ohne CRM-Link
    const kontaktMap = new Map(kontakte.map((k) => [k.email.toLowerCase(), k.id]));

    const personen = profile.map((p) => {
      const a = antwortMap.get(p.id);
      const email = auth.get(p.id)?.email ?? null;
      return {
        id: p.id,
        name: p.full_name,
        email,
        am: p[stempel],
        crmId: email ? (kontaktMap.get(email.toLowerCase()) ?? null) : null,
        stufe: p.is_paid ? (p.membership_tier ?? "bezahlt") : "free",
        antworten: felder.map((feld) => ({ feld, text: textMitSonstiges(feld, a) })),
      };
    });

    if (url.searchParams.get("format") === "csv") {
      const kopf = ["name", "email", "beantwortet_am", "stufe", ...felder, "discovery_source_other"];
      const zeilen = personen.map((p) => {
        const a = antwortMap.get(p.id);
        return [p.name, p.email, p.am, p.stufe, ...felder.map((f) => antwortWerte(f, a).join(MEHRFACH_TRENNER)), a?.discovery_source_other ?? ""]
          .map(csvZelle)
          .join(";");
      });
      return new NextResponse(`﻿${[kopf.join(";"), ...zeilen].join("\r\n")}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="icp-${segment}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const verteilungen = FRAGEN.filter((f) => felder.includes(f.feld)).map((f) => {
      const zaehler = new Map<string, number>();
      for (const p of profile) {
        for (const w of antwortWerte(f.feld, antwortMap.get(p.id))) zaehler.set(w, (zaehler.get(w) ?? 0) + 1);
      }
      return {
        feld: f.feld,
        frage: f.frage,
        mehrfach: Boolean(f.mehrfach),
        werte: f.antworten.map((x) => ({ wert: x.wert, label: x.label, anzahl: zaehler.get(x.wert) ?? 0 })),
      };
    });

    const sonstiges = profile
      .map((p) => antwortMap.get(p.id))
      .filter((a): a is Antwort => Boolean(a?.discovery_source === "sonstiges" && a.discovery_source_other))
      .map((a) => String(a.discovery_source_other));

    return NextResponse.json({
      ok: true,
      segment,
      fragen: FRAGEN.filter((f) => felder.includes(f.feld)).map((f) => ({ feld: f.feld, frage: f.frage })),
      beantwortet: personen.length,
      ausstehend: offen,
      verteilungen,
      sonstiges,
      personen,
    });
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    const fehlt = /icp_(free|kaeufer)_am|does not exist|schema cache/i.test(text);
    return NextResponse.json(
      { ok: false, error: fehlt ? "Migration 113 (ICP-Fragen) ist noch nicht eingespielt." : text },
      { status: fehlt ? 503 : 500 },
    );
  }
}
