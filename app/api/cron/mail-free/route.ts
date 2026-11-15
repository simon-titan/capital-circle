import { NextResponse } from "next/server";
import { OPTIONALE_VIDEOS, TRAINING_MODUL_ID } from "@/config/training";
import { cronBefugt } from "@/lib/cron/auth";
import { abmeldeUrl } from "@/lib/email/abmeldung";
import { FehlendeDaten, freeMail, type FreeMailId } from "@/lib/email/templates/playbook/free-kurs";
import { entscheideFree, type FreeZustand } from "@/lib/mailsystem/free-entscheidung";
import { offenePausen } from "@/lib/mailsystem/pause";
import { letzteMarketingSendungen, normEmail, protokolliere, sendeVorlage } from "@/lib/mailsystem/versand";
import type { VorlageId } from "@/lib/mailsystem/vorlagen";
import { getModulePublishedPlaylist, isPlaylistVideoDone } from "@/lib/module-video";
import { parseVideoProgressByVideo } from "@/lib/server-data";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeAuthInfos } from "@/lib/training/board";
import { trainingLinks, vornameAus, type TrainingZugangZeile } from "@/lib/training/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron: die zeitgesteuerten Free-Kurs-Mails des E-Mail-Playbooks 1.0
 * (S01/S02, L01–L04, I01–I03, E01/E02/E04/E05). Ersetzt `training-sequence`.
 *
 * Je Einschreibung (`training_zugang`) wird der **aktuelle** Zustand frisch
 * geladen und `entscheideFree` gefragt (Playbook Kapitel 11, `before_send`):
 * höchstens eine Mail je Kontakt und Lauf; was überholt ist, landet mit Grund
 * im Protokoll statt nachgeholt zu werden.
 *
 * Takt: Die Regeln vertragen jeden Takt, je öfter desto pünktlicher (S01 „nach
 * 24 h" geht beim täglichen Lauf bis zu einen Tag später raus). Auf Vercel Pro
 * stündlich einplanen. `?probe=1` entscheidet nur und verschickt nichts.
 *
 * Auth: Bearer $CRON_SECRET (fail-closed).
 */
const MAX_JE_LAUF = 300;
const TAG_MS = 86_400_000;

type LeadInfo = { anfrage: boolean; termin: boolean };

export async function GET(request: Request) {
  if (!cronBefugt(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const probe = new URL(request.url).searchParams.get("probe") === "1";
  const jetzt = new Date();
  const service = createServiceClient();

  const grenze = new Date(jetzt.getTime() - 3 * TAG_MS).toISOString();
  // Anfragen/Buchungen der letzten 60 Tage sind für laufende Einschreibungen (max. 37 Tage) relevant.
  const grenzeLeads = new Date(jetzt.getTime() - 60 * TAG_MS).toISOString();
  const { data: zRoh, error } = await service
    .from("training_zugang")
    .select("*")
    .or(`original_ende_am.gt.${grenze},verlaengerung_ende_am.gt.${grenze}`)
    .limit(5000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const alle = (zRoh ?? []) as TrainingZugangZeile[];
  if (!alle.length) return NextResponse.json({ ok: true, gesendet: 0, kontakte: 0 });

  const playlist = await getModulePublishedPlaylist(service, TRAINING_MODUL_ID).catch(() => []);
  const auth = await ladeAuthInfos(service, new Set(alle.map((z) => z.user_id)));
  const links = trainingLinks();
  const statistik = { kontakte: alle.length, gesendet: 0, protokolliert: 0, fehler: 0, blockiert: 0, entscheidungen: [] as string[] };

  // In Paketen, damit die `in (…)`-Listen der Abfragen kurz bleiben.
  for (let start = 0; start < alle.length && statistik.gesendet < MAX_JE_LAUF; start += 150) {
  const zugaenge = alle.slice(start, start + 150);
  const ids = zugaenge.map((z) => z.user_id);
  const [{ data: profile }, { data: fortschritt }, { data: tLeads }, { data: protokoll }] = await Promise.all([
    service.from("profiles").select("id, full_name, is_paid, membership_tier, unsubscribed_at").in("id", ids),
    service.from("user_progress").select("user_id, video_progress_by_video").eq("module_id", TRAINING_MODUL_ID).in("user_id", ids),
    service.from("training_leads").select("user_id, email, fragen_am, answers, termin_am").in("user_id", ids),
    service.from("mail_versand").select("bezug, vorlage, status, gesendet_am").in("bezug", ids.map((id) => `free:${id}`)),
  ]);

  const emails = [...new Set(ids.map((id) => auth.get(id)?.email).filter((e): e is string => Boolean(e)).map(normEmail))];
  const [pausen, letzte, { data: sperren }, { data: dLeads }, { data: termineRoh }] = await Promise.all([
    offenePausen(service, emails),
    letzteMarketingSendungen(service, emails),
    service.from("mail_sperre").select("email").in("email", emails),
    // E-Mails stehen dort nicht zwingend klein — nach Zeitraum laden und unten klein vergleichen.
    service
      .from("discord_leads")
      .select("email, questions_completed_at, calendly_booked_at")
      .or(`questions_completed_at.gte.${grenzeLeads},calendly_booked_at.gte.${grenzeLeads}`)
      .limit(5000),
    // Termine aus Calendly (Migration 111): gebucht, geführt oder No-Show = Termin-Hold.
    service.from("termine").select("email").in("email", emails).in("status", ["gebucht", "umgebucht", "gefuehrt", "no_show"]),
  ]);
  const gesperrt = new Set(((sperren ?? []) as { email: string }[]).map((s) => s.email));

  const profilJe = new Map(((profile ?? []) as { id: string }[]).map((p) => [p.id, p as Record<string, unknown>]));
  const mapJe = new Map(
    ((fortschritt ?? []) as { user_id: string; video_progress_by_video: unknown }[]).map((f) => [
      f.user_id,
      parseVideoProgressByVideo(f.video_progress_by_video),
    ]),
  );
  const leadJe = new Map<string, LeadInfo>();
  const merke = (key: string, l: LeadInfo) => {
    const alt = leadJe.get(key) ?? { anfrage: false, termin: false };
    leadJe.set(key, { anfrage: alt.anfrage || l.anfrage, termin: alt.termin || l.termin });
  };
  for (const l of (tLeads ?? []) as { user_id: string | null; email: string; fragen_am: string | null; answers: unknown; termin_am: string | null }[]) {
    const anfrage = Boolean(l.fragen_am) || Boolean(l.answers && Object.keys(l.answers as object).length);
    const info = { anfrage, termin: Boolean(l.termin_am) };
    if (l.user_id) merke(l.user_id, info);
    merke(normEmail(l.email), info);
  }
  for (const t of (termineRoh ?? []) as { email: string }[]) merke(normEmail(t.email), { anfrage: true, termin: true });
  for (const l of (dLeads ?? []) as { email: string; questions_completed_at: string | null; calendly_booked_at: string | null }[]) {
    merke(normEmail(l.email), { anfrage: Boolean(l.questions_completed_at), termin: Boolean(l.calendly_booked_at) });
  }
  const protokollJe = new Map<string, FreeZustand["protokoll"]>();
  for (const p of (protokoll ?? []) as { bezug: string; vorlage: VorlageId; status: string; gesendet_am: string | null }[]) {
    const id = p.bezug.slice("free:".length);
    const m = protokollJe.get(id) ?? {};
    m[p.vorlage] = { status: p.status, gesendetAm: p.gesendet_am ? new Date(p.gesendet_am) : null };
    protokollJe.set(id, m);
  }

  for (const z of zugaenge) {
    if (statistik.gesendet >= MAX_JE_LAUF) break;
    const info = auth.get(z.user_id);
    if (!info?.email || !info.bestaetigt) continue;
    const email = normEmail(info.email);
    const p = profilJe.get(z.user_id) ?? {};
    const tier = String(p.membership_tier ?? "free");

    const map = mapJe.get(z.user_id) ?? {};
    const fertig: Record<number, boolean> = {};
    playlist.forEach((v, i) => (fertig[i + 1] = isPlaylistVideoDone(v, map)));
    const pflicht = playlist.map((_, i) => i + 1).filter((n) => !OPTIONALE_VIDEOS.includes(n));
    const abgeschlossen = playlist.length >= 5 && pflicht.every((n) => fertig[n]);
    const lead = { anfrage: false, termin: false, ...(leadJe.get(z.user_id) ?? {}) };
    const leadMail = leadJe.get(email);
    if (leadMail) {
      lead.anfrage ||= leadMail.anfrage;
      lead.termin ||= leadMail.termin;
    }

    const zustand: FreeZustand = {
      jetzt,
      gesperrt: gesperrt.has(email),
      abgemeldet: Boolean(p.unsubscribed_at),
      pause: pausen.has(email),
      gekauft: Boolean(p.is_paid) || ["mentoring", "lifetime", "ht_1on1"].includes(tier),
      anfrage: lead.anfrage,
      termin: lead.termin,
      zugang: {
        freigeschaltetAm: new Date(z.freigeschaltet_am),
        originalEndeAm: new Date(z.original_ende_am),
        verlaengerungStatus: z.verlaengerung_status,
        verlaengertAm: z.verlaengert_am ? new Date(z.verlaengert_am) : null,
        verlaengerungEndeAm: z.verlaengerung_ende_am ? new Date(z.verlaengerung_ende_am) : null,
        gestartetAm: z.gestartet_am ? new Date(z.gestartet_am) : null,
        ausBestand: z.aus_bestand,
      },
      kurs: { videosDa: playlist.length, fertig, abgeschlossen },
      protokoll: protokollJe.get(z.user_id) ?? {},
      letzteMarketingAm: letzte.get(email) ?? null,
    };

    const r = entscheideFree(zustand);
    const bezug = `free:${z.user_id}`;
    if (probe) {
      if (r.senden || r.protokoll.length)
        statistik.entscheidungen.push(
          `${email}: ${r.senden ? `senden ${r.senden.vorlage}` : "—"}${r.protokoll.length ? ` · ${r.protokoll.map((x) => `${x.vorlage}=${x.grund}`).join(", ")}` : ""}`,
        );
      continue;
    }

    if (r.protokoll.length) {
      await protokolliere(
        service,
        r.protokoll.map((x) => ({ ...x, bezug, email, userId: z.user_id })),
      );
      statistik.protokolliert += r.protokoll.length;
    }
    if (!r.senden) continue;

    const id = r.senden.vorlage as FreeMailId;
    const endeAm = id === "E04" || id === "E05" ? zustand.zugang.verlaengerungEndeAm : zustand.zugang.originalEndeAm;
    try {
      const mail = freeMail(id, {
        vorname: vornameAus(p.full_name as string | null),
        endeAm,
        ...links,
        unsubscribeUrl: abmeldeUrl({ userId: z.user_id, email }),
      });
      const status = await sendeVorlage(service, {
        vorlage: id,
        bezug,
        email,
        userId: z.user_id,
        betreff: mail.betreff,
        jsx: mail.jsx,
        faelligAm: r.senden.faelligAm,
      });
      if (status === "gesendet") statistik.gesendet++;
    } catch (err) {
      if (err instanceof FehlendeDaten) {
        // Kein Versand mit Lücken (Playbook Kapitel 10) — intern melden, nicht raten.
        statistik.blockiert++;
        console.error(`[cron/mail-free] ${id} an ${email} blockiert: ${err.message}`);
      } else {
        statistik.fehler++;
        console.error(`[cron/mail-free] ${id} an ${email} fehlgeschlagen:`, err);
      }
    }
  }
  }

  return NextResponse.json({ ok: true, probe, ...statistik });
}
