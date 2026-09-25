import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FRAGEN, FRAGEN_FELDER, ONBOARDING_START, antwortLabel, type FrageFeld } from "@/config/onboarding";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ICP-Auswertung für `/admin/icp` (Plan: docs/plaene/onboarding-kunde.md, Abschnitt 4).
 *
 *   GET ?tage=30|90|0&gruppe=alle|neu|bestand   Auswertung als JSON
 *   GET …&format=csv                              Rohdaten als CSV
 *   GET ?user=<id>                                Antworten eines Mitglieds (Mitglieder-Drawer)
 *
 * Grundlage sind die Konten mit beantworteten Fragen (`profiles.onboarding_fragen_am`),
 * verbunden mit Plan, Zahlstatus, Lernzeit und den Messpunkten aus
 * `onboarding_ereignisse`. Die Rohdaten gehen als CSV raus, damit sich später
 * Umsatz, Churn und Nutzung außerhalb dazu rechnen lassen.
 */

type AntwortZeile = Record<FrageFeld, string | null> & {
  user_id: string;
  discovery_source_other: string | null;
  attribution: Record<string, unknown> | null;
  bestand: boolean;
  discord_verbunden_am: string | null;
  community_vorgestellt_am: string | null;
  kurs_gestartet_am: string | null;
};

type ProfilZeile = {
  id: string;
  created_at: string | null;
  is_paid: boolean | null;
  is_admin: boolean | null;
  membership_tier: string | null;
  access_until: string | null;
  lifetime_purchased_at: string | null;
  total_learning_seconds: number | null;
  onboarding_fragen_am: string | null;
  onboarding_abgeschlossen_am: string | null;
};

const PROFIL_SPALTEN =
  "id,created_at,is_paid,is_admin,membership_tier,access_until,lifetime_purchased_at,total_learning_seconds,onboarding_fragen_am,onboarding_abgeschlossen_am";

/** PostgREST liefert höchstens 1000 Zeilen je Anfrage — in Seiten holen. */
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

async function ladeAntworten(service: SupabaseClient, ids?: string[]): Promise<AntwortZeile[]> {
  const spalten = `user_id,${FRAGEN_FELDER.join(",")},discovery_source_other,attribution,bestand,discord_verbunden_am,community_vorgestellt_am,kurs_gestartet_am`;
  if (ids) {
    const { data, error } = await service.from("onboarding_antworten").select(spalten).in("user_id", ids);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AntwortZeile[];
  }
  return alle<AntwortZeile>((von, bis) =>
    service
      .from("onboarding_antworten")
      .select(spalten)
      .not("trading_experience", "is", null)
      .range(von, bis) as unknown as PromiseLike<{ data: AntwortZeile[] | null; error: { message: string } | null }>,
  );
}

function planLabel(p: ProfilZeile): string {
  if (!p.is_paid) return "inaktiv";
  return p.membership_tier === "free" ? "whop" : (p.membership_tier ?? "unbekannt");
}

function median(werte: number[]): number | null {
  if (werte.length === 0) return null;
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function csvZelle(wert: unknown): string {
  const t = wert == null ? "" : typeof wert === "object" ? JSON.stringify(wert) : String(wert);
  return /[",;\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const service = createServiceClient();

  try {
    // ── Einzelnes Mitglied ────────────────────────────────────────────────
    const userId = url.searchParams.get("user");
    if (userId) {
      const [antworten, { data: profil }, { data: ereignisse }] = await Promise.all([
        ladeAntworten(service, [userId]),
        service
          .from("profiles")
          .select("onboarding_gestartet_am,onboarding_fragen_am,onboarding_abgeschlossen_am,passwort_gesetzt_am")
          .eq("id", userId)
          .maybeSingle(),
        service.from("onboarding_ereignisse").select("art,created_at").eq("user_id", userId).order("created_at"),
      ]);
      const a = antworten[0] ?? null;
      return NextResponse.json({
        ok: true,
        antworten: a
          ? FRAGEN.map((f) => ({
              frage: f.frage,
              antwort:
                f.feld === "discovery_source" && a.discovery_source === "sonstiges" && a.discovery_source_other
                  ? `Sonstiges: ${a.discovery_source_other}`
                  : antwortLabel(f.feld, a[f.feld]),
            }))
          : [],
        attribution: a?.attribution ?? null,
        bestand: a?.bestand ?? null,
        schritte: a
          ? {
              discord: a.discord_verbunden_am,
              vorstellung: a.community_vorgestellt_am,
              kurs: a.kurs_gestartet_am,
            }
          : null,
        profil: profil ?? null,
        ereignisse: ereignisse ?? [],
      });
    }

    // ── Auswertung ────────────────────────────────────────────────────────
    const tage = Number(url.searchParams.get("tage") ?? "0");
    const gruppe = url.searchParams.get("gruppe") ?? "alle";
    const seit = tage > 0 ? new Date(Date.now() - tage * 86_400_000) : null;

    const antworten = await ladeAntworten(service);
    const ids = antworten.map((a) => a.user_id);
    const profile: ProfilZeile[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error: pErr } = await service
        .from("profiles")
        .select(PROFIL_SPALTEN)
        .in("id", ids.slice(i, i + 200));
      if (pErr) throw new Error(pErr.message);
      profile.push(...((data ?? []) as unknown as ProfilZeile[]));
    }
    const profilMap = new Map(profile.map((p) => [p.id, p]));

    const zeilen = antworten
      .map((a) => ({ a, p: profilMap.get(a.user_id) }))
      .filter((z): z is { a: AntwortZeile; p: ProfilZeile } => Boolean(z.p?.onboarding_fragen_am))
      .filter(({ p }) => !p.is_admin)
      .filter(({ p }) => !seit || new Date(p.onboarding_fragen_am!) >= seit)
      .filter(({ a }) => (gruppe === "neu" ? !a.bestand : gruppe === "bestand" ? a.bestand : true));

    if (url.searchParams.get("format") === "csv") {
      const kopf = [
        "user_id",
        "gruppe",
        "fragen_am",
        ...FRAGEN_FELDER,
        "discovery_source_other",
        "plan",
        "is_paid",
        "access_until",
        "lifetime_purchased_at",
        "lernzeit_stunden",
        "konto_seit",
        "discord_verbunden_am",
        "vorgestellt_am",
        "kurs_gestartet_am",
        "onboarding_abgeschlossen_am",
        "attribution",
      ];
      const zeilenCsv = zeilen.map(({ a, p }) =>
        [
          a.user_id,
          a.bestand ? "bestand" : "neu",
          p.onboarding_fragen_am,
          ...FRAGEN_FELDER.map((f) => a[f]),
          a.discovery_source_other,
          p.membership_tier,
          p.is_paid,
          p.access_until,
          p.lifetime_purchased_at,
          Math.round(((p.total_learning_seconds ?? 0) / 3600) * 10) / 10,
          p.created_at,
          a.discord_verbunden_am,
          a.community_vorgestellt_am,
          a.kurs_gestartet_am,
          p.onboarding_abgeschlossen_am,
          a.attribution,
        ]
          .map(csvZelle)
          .join(";"),
      );
      const csv = `﻿${[kopf.join(";"), ...zeilenCsv].join("\r\n")}`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="icp-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Verteilungen je Frage.
    const verteilungen = FRAGEN.map((f) => {
      const zaehler = new Map<string, number>();
      for (const { a } of zeilen) {
        const w = a[f.feld];
        if (w) zaehler.set(w, (zaehler.get(w) ?? 0) + 1);
      }
      return {
        feld: f.feld,
        frage: f.frage,
        werte: f.antworten.map((x) => ({ wert: x.wert, label: x.label, anzahl: zaehler.get(x.wert) ?? 0 })),
      };
    });

    // Kreuztabellen.
    const kreuz = (zeile: (z: { a: AntwortZeile; p: ProfilZeile }) => string, spalte: (z: { a: AntwortZeile; p: ProfilZeile }) => string) => {
      const m = new Map<string, Map<string, number>>();
      for (const z of zeilen) {
        const r = zeile(z);
        const s = spalte(z);
        if (!m.has(r)) m.set(r, new Map());
        m.get(r)!.set(s, (m.get(r)!.get(s) ?? 0) + 1);
      }
      return Object.fromEntries([...m].map(([r, sm]) => [r, Object.fromEntries(sm)]));
    };

    const kreuztabellen = {
      stage_plan: kreuz(({ a }) => a.trading_stage ?? "—", ({ p }) => planLabel(p)),
      problem_ziel: kreuz(({ a }) => a.main_problem ?? "—", ({ a }) => a.trading_goal ?? "—"),
      discovery_plan: kreuz(({ a }) => a.discovery_source ?? "—", ({ p }) => planLabel(p)),
    };

    // Bindung je Stand: noch zahlend, Lernzeit.
    const bindung = FRAGEN[1]!.antworten.map((x) => {
      const gruppeZeilen = zeilen.filter(({ a }) => a.trading_stage === x.wert);
      const aktiv = gruppeZeilen.filter(({ p }) => p.is_paid).length;
      const lernzeit = gruppeZeilen.map(({ p }) => (p.total_learning_seconds ?? 0) / 3600);
      return {
        wert: x.wert,
        label: x.label,
        anzahl: gruppeZeilen.length,
        aktiv,
        lernzeitMedianStunden: median(lernzeit),
      };
    });

    // Aktivierungs-Trichter für Neukäufer (Konto ab Onboarding-Start).
    const startIso = new Date(ONBOARDING_START).toISOString();
    const { count: kaeufer } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_paid", true)
      .eq("is_admin", false)
      .gte("created_at", seit && seit.toISOString() > startIso ? seit.toISOString() : startIso);
    const ereignisse = await alle<{ user_id: string; art: string; created_at: string }>((von, bis) =>
      service
        .from("onboarding_ereignisse")
        .select("user_id,art,created_at")
        .range(von, bis) as unknown as PromiseLike<{
        data: { user_id: string; art: string; created_at: string }[] | null;
        error: { message: string } | null;
      }>,
    );
    const neuIds = new Set(
      antworten.filter((a) => !a.bestand).map((a) => a.user_id),
    );
    const stufen = [
      { art: "onboarding_questions_completed", label: "Fragen beantwortet" },
      { art: "onboarding_discord_connected", label: "Discord verbunden" },
      { art: "onboarding_community_intro_completed", label: "Vorgestellt" },
      { art: "onboarding_course_started", label: "Kurs gestartet" },
      { art: "onboarding_completed", label: "Vollständig aktiviert" },
    ];
    const trichter = [
      { art: "kaeufer", label: "Käufer", anzahl: kaeufer ?? 0, medianStunden: null as number | null },
      ...stufen.map((s) => {
        const treffer = ereignisse.filter(
          (e) => e.art === s.art && neuIds.has(e.user_id) && (!seit || new Date(e.created_at) >= seit),
        );
        const dauern = treffer
          .map((e) => {
            const p = profilMap.get(e.user_id);
            return p?.created_at ? (new Date(e.created_at).getTime() - new Date(p.created_at).getTime()) / 3_600_000 : null;
          })
          .filter((d): d is number => d !== null && d >= 0);
        return { art: s.art, label: s.label, anzahl: treffer.length, medianStunden: median(dauern) };
      }),
    ];

    return NextResponse.json({
      ok: true,
      gesamt: zeilen.length,
      neu: zeilen.filter(({ a }) => !a.bestand).length,
      bestand: zeilen.filter(({ a }) => a.bestand).length,
      verteilungen,
      kreuztabellen,
      bindung,
      trichter,
    });
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    // Migration 107 fehlt → verständlicher Hinweis statt 500-Rätsel.
    const fehlt = /onboarding_|does not exist|could not find/i.test(text);
    return NextResponse.json(
      { ok: false, error: fehlt ? "Migration 107 (Onboarding) ist noch nicht eingespielt." : text },
      { status: fehlt ? 503 : 500 },
    );
  }
}
