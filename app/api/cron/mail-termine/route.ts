import { NextResponse } from "next/server";
import { TRAINING_MODUL_ID } from "@/config/training";
import { cronBefugt } from "@/lib/cron/auth";
import { abgemeldeteAdressen, offenePausen } from "@/lib/mailsystem/pause";
import { entscheideAnfrage, entscheideTermin, type Ergebnis } from "@/lib/mailsystem/termin-entscheidung";
import { sendeZuTermin, terminBezug, terminMailsAktiv, terminLinks, type LeadArt, type TerminZeile } from "@/lib/mailsystem/termine";
import { letzteMarketingSendungen, normEmail, protokolliere, sendeVorlage } from "@/lib/mailsystem/versand";
import type { VorlageId } from "@/lib/mailsystem/vorlagen";
import { abmeldeUrl } from "@/lib/email/abmeldung";
import { FehlendeDaten } from "@/lib/email/templates/playbook/free-kurs";
import { terminMail, type TerminMailId } from "@/lib/email/templates/playbook/termin";
import { getModulePublishedPlaylist } from "@/lib/module-video";
import { createServiceClient } from "@/lib/supabase/service";
import { vornameAus } from "@/lib/training/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron (alle 5 Minuten): die zeitgesteuerten Gesprächsmails des E-Mail-Playbooks.
 *
 *   B01–B03  Fragebogen fertig, Kalender offen, kein Termin (training_leads, discord_leads)
 *   T02–T04  vor einem gebuchten Termin (termine)
 *   N01/N02  nach einem vom Team bestätigten No-Show (termine)
 *
 * Entschieden wird über `entscheideAnfrage` / `entscheideTermin` mit frischen
 * Daten; was überholt ist, landet mit Grund in `mail_versand`. Ohne
 * `PLAYBOOK_TERMINMAILS=1` verschickt der Lauf nichts (Calendly-Mails noch an).
 * `?probe=1` entscheidet nur. Auth: Bearer $CRON_SECRET (fail-closed).
 */
const TAG_MS = 86_400_000;

type Anfrage = { art: LeadArt; id: string; token: string | null; name: string | null; email: string; userId: string | null; ab: Date; abgeschlossen: boolean };

export async function GET(request: Request) {
  if (!cronBefugt(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const probe = new URL(request.url).searchParams.get("probe") === "1";
  if (!terminMailsAktiv() && !probe) return NextResponse.json({ ok: true, aus: "PLAYBOOK_TERMINMAILS ist nicht gesetzt." });

  const jetzt = new Date();
  const service = createServiceClient();
  const seit = new Date(jetzt.getTime() - 5 * TAG_MS).toISOString();

  const [{ data: tRoh, error: tFehler }, { data: tLeads }, { data: dLeads }, playlist] = await Promise.all([
    // Termine von gestern bis in die Zukunft (T) und No-Shows der letzten Tage (N).
    service.from("termine").select("*").gte("start_am", seit).in("status", ["gebucht", "no_show"]).limit(2000),
    service
      .from("training_leads")
      .select("id, token, name, email, user_id, fragen_am, status, calendly_invitee_uri, termin_am")
      .gte("fragen_am", seit)
      .limit(2000),
    service
      .from("discord_leads")
      .select("id, token, name, email, questions_completed_at, closed, calendly_booked_at")
      .gte("questions_completed_at", seit)
      .limit(2000),
    getModulePublishedPlaylist(service, TRAINING_MODUL_ID).catch(() => []),
  ]);
  if (tFehler) return NextResponse.json({ ok: false, error: tFehler.message }, { status: 500 });
  const termine = (tRoh ?? []) as TerminZeile[];
  const video5Da = playlist.length >= 5;

  const anfragen: Anfrage[] = [
    ...((tLeads ?? []) as { id: string; token: string; name: string; email: string; user_id: string | null; fragen_am: string; status: string }[]).map(
      (l) => ({
        art: "training" as const,
        id: l.id,
        token: l.token,
        name: l.name,
        email: normEmail(l.email),
        userId: l.user_id,
        ab: new Date(l.fragen_am),
        abgeschlossen: l.status === "gewonnen" || l.status === "verloren",
      }),
    ),
    ...((dLeads ?? []) as { id: string; token: string | null; name: string | null; email: string | null; questions_completed_at: string; closed: string | null }[])
      .filter((l) => l.email)
      .map((l) => ({
        art: "discord" as const,
        id: l.id,
        token: l.token,
        name: l.name,
        email: normEmail(l.email!),
        userId: null,
        ab: new Date(l.questions_completed_at),
        abgeschlossen: l.closed === "closed_won" || l.closed === "closed_lost",
      })),
  ];

  const emails = [...new Set([...termine.map((t) => normEmail(t.email)), ...anfragen.map((a) => a.email)])];
  const vorgaenge = [...new Set(termine.map((t) => t.vorgang))];
  const [pausen, letzte, { data: sperren }, { data: abmeldungen }, { data: kaeufe }, { data: alleImVorgang }, { data: vorgangTermine }, { data: protokoll }] =
    await Promise.all([
      offenePausen(service, emails),
      letzteMarketingSendungen(service, emails),
      emails.length ? service.from("mail_sperre").select("email").in("email", emails) : Promise.resolve({ data: [] }),
      // Abmeldung hängt am Konto; für Leads ohne Konto zählt die Kontakt-Abmeldung (Resend) — hier: Konten.
      service.from("profiles").select("id, unsubscribed_at, is_paid, membership_tier").not("unsubscribed_at", "is", null).limit(5000),
      service.from("mentoring_kauf").select("email, user_id").in("status", ["aktiv", "vollstaendig"]).limit(5000),
      vorgaenge.length ? service.from("termine").select("id, vorgang, status, created_at, no_show_am").in("vorgang", vorgaenge) : Promise.resolve({ data: [] }),
      // Buchung zur Adresse — auch unter einem anderen Lead-Datensatz (Handy + Rechner, /call + Training).
      emails.length ? service.from("termine").select("vorgang, email").in("email", emails) : Promise.resolve({ data: [], error: null }),
      emails.length
        ? service.from("mail_versand").select("email, vorlage, bezug, status").in("email", emails).gte("created_at", new Date(jetzt.getTime() - 30 * TAG_MS).toISOString())
        : Promise.resolve({ data: [] }),
    ]);

  const gesperrt = new Set(((sperren ?? []) as { email: string }[]).map((s) => s.email));
  const abgemeldeteAdr = await abgemeldeteAdressen(service, emails);
  // CRM (Migration 112): „Verloren", „Später" oder „Gewonnen" schließt den Verkaufsweg —
  // dann keine B-, N- oder T02-Mails mehr (Playbook Regel 11). Fehlt die Tabelle, gilt nichts.
  const { data: crm } = emails.length
    ? await service.from("crm_kontakte").select("email, phase").in("email", emails)
    : { data: [] };
  const crmZu = new Set(
    ((crm ?? []) as { email: string; phase: string }[]).filter((k) => ["verloren", "spaeter", "gewonnen"].includes(k.phase)).map((k) => k.email),
  );
  // Buchungen aus der Zeit vor `termine` (oder ohne Lead-Zuordnung) stehen nur an den Leads.
  const gebuchtLeadMail = new Set<string>();
  for (const l of (tLeads ?? []) as { email: string; calendly_invitee_uri?: string | null; termin_am?: string | null }[])
    if (l.calendly_invitee_uri || l.termin_am) gebuchtLeadMail.add(normEmail(l.email));
  for (const l of (dLeads ?? []) as { email: string | null; calendly_booked_at?: string | null }[])
    if (l.email && l.calendly_booked_at) gebuchtLeadMail.add(normEmail(l.email));
  const abgemeldeteKonten = new Set(((abmeldungen ?? []) as { id: string }[]).map((p) => p.id));
  const gekauftMail = new Set(((kaeufe ?? []) as { email: string | null }[]).map((k) => (k.email ? normEmail(k.email) : "")).filter(Boolean));
  const gekauftUser = new Set(((kaeufe ?? []) as { user_id: string | null }[]).map((k) => k.user_id).filter(Boolean) as string[]);
  const mitTerminMail = new Set(((vorgangTermine ?? []) as { email: string }[]).map((t) => normEmail(t.email)));
  const protokollJe = new Map<string, Partial<Record<VorlageId, { status: string }>>>();
  for (const z of (protokoll ?? []) as { email: string; vorlage: VorlageId; bezug: string; status: string }[]) {
    const key = `${z.email}|${z.bezug}`;
    const m = protokollJe.get(key) ?? {};
    m[z.vorlage] = { status: z.status };
    protokollJe.set(key, m);
  }
  const prot = (email: string, bezug: string) => protokollJe.get(`${email}|${bezug}`) ?? {};
  const imVorgang = (alleImVorgang ?? []) as { id: string; vorgang: string; status: string; created_at: string; no_show_am: string | null }[];

  const statistik = { termine: termine.length, anfragen: anfragen.length, gesendet: 0, protokolliert: 0, blockiert: 0, fehler: 0, entscheidungen: [] as string[] };
  const verbucht = new Set<string>();

  const verarbeite = async (
    r: Ergebnis,
    ziel: { email: string; userId: string | null; bezugFuer: (v: VorlageId) => string },
    senden: (v: VorlageId, faellig: Date) => Promise<string>,
  ) => {
    if (probe) {
      if (r.senden || r.protokoll.length)
        statistik.entscheidungen.push(`${ziel.email}: ${r.senden?.vorlage ?? "—"} ${r.protokoll.map((p) => `${p.vorlage}=${p.grund}`).join(", ")}`);
      return;
    }
    if (r.protokoll.length) {
      await protokolliere(service, r.protokoll.map((p) => ({ ...p, bezug: ziel.bezugFuer(p.vorlage), email: ziel.email, userId: ziel.userId })));
      statistik.protokolliert += r.protokoll.length;
    }
    // Höchstens eine automatische Mail je Adresse und Lauf.
    if (!r.senden || verbucht.has(ziel.email)) return;
    try {
      const s = await senden(r.senden.vorlage, r.senden.faelligAm);
      if (s === "gesendet") {
        statistik.gesendet++;
        verbucht.add(ziel.email);
      } else if (s === "blockiert") statistik.blockiert++;
    } catch (err) {
      if (err instanceof FehlendeDaten) statistik.blockiert++;
      else {
        statistik.fehler++;
        console.error(`[cron/mail-termine] ${r.senden.vorlage} an ${ziel.email}:`, err);
      }
    }
  };

  /* ── T und N ── */
  for (const t of termine) {
    const email = normEmail(t.email);
    const gekauft = gekauftMail.has(email) || (t.user_id ? gekauftUser.has(t.user_id) : false);
    const vorgang = imVorgang.filter((v) => v.vorgang === t.vorgang);
    const noShows = vorgang.filter((v) => v.no_show_am).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const r = entscheideTermin({
      jetzt,
      gesperrt: gesperrt.has(email),
      abgemeldet: (t.user_id ? abgemeldeteKonten.has(t.user_id) : false) || abgemeldeteAdr.has(email),
      pause: pausen.has(email) || crmZu.has(email),
      gekauft,
      letzteMarketingAm: letzte.get(email) ?? null,
      start: new Date(t.start_am),
      bestaetigtAm: new Date(t.created_at),
      status: t.status,
      noShowAm: t.no_show_am ? new Date(t.no_show_am) : null,
      noShowNummer: Math.max(1, noShows.findIndex((n) => n.id === t.id) + 1),
      neuGebucht: vorgang.some((v) => v.created_at > t.created_at),
      // Nur eine wirklich verschickte T02 verbraucht den Vorgang — Auslassungen stehen am Termin.
      t02Vorgang: prot(email, `vorgang:${t.vorgang}`).T02?.status === "gesendet",
      video5Da,
      protokoll: { ...prot(email, `termin:${t.id}`), ...prot(email, `noshow:${t.id}`) },
    });
    // Auslassungen einer T02 am Termin vermerken, nicht am Vorgang (sonst bliebe sie für eine Umbuchung gesperrt).
    await verarbeite(r, { email, userId: t.user_id, bezugFuer: (v) => (v === "T02" ? `termin:${t.id}` : terminBezug(v as TerminMailId, t)) }, (v, f) =>
      sendeZuTermin(service, v as TerminMailId, t, {}, f),
    );
  }

  /* ── B ── */
  // Ohne verlässliches Bild der Buchungen keine Buchungs-Erinnerung (lieber eine zu wenig).
  const bLesefehler = [vorgangTermine === null, protokoll === null].some(Boolean);
  for (const a of bLesefehler ? [] : anfragen) {
    const vorgang = `${a.art}:${a.id}`;
    const bezug = `anfrage:${vorgang}`;
    const r = entscheideAnfrage({
      jetzt,
      gesperrt: gesperrt.has(a.email),
      abgemeldet: (a.userId ? abgemeldeteKonten.has(a.userId) : false) || abgemeldeteAdr.has(a.email),
      pause: pausen.has(a.email),
      gekauft: gekauftMail.has(a.email) || (a.userId ? gekauftUser.has(a.userId) : false),
      letzteMarketingAm: letzte.get(a.email) ?? null,
      kalenderAb: a.ab,
      terminGebucht: mitTerminMail.has(a.email) || gebuchtLeadMail.has(a.email),
      abgeschlossen: a.abgeschlossen || crmZu.has(a.email),
      protokoll: prot(a.email, bezug),
    });
    await verarbeite(r, { email: a.email, userId: a.userId, bezugFuer: () => bezug }, async (v, f) => {
      const links = terminLinks(a.art, a.token);
      const mail = terminMail(v as TerminMailId, {
        vorname: vornameAus(a.name),
        kalenderUrl: links.kalenderUrl,
        unsubscribeUrl: abmeldeUrl({ userId: a.userId, email: a.email }),
      });
      return sendeVorlage(service, { vorlage: v, bezug, email: a.email, userId: a.userId, betreff: mail.betreff, jsx: mail.jsx, faelligAm: f });
    });
  }

  return NextResponse.json({ ok: true, probe, ...statistik });
}
