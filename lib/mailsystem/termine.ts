import type { SupabaseClient } from "@supabase/supabase-js";
import { abmeldeUrl } from "@/lib/email/abmeldung";
import { FehlendeDaten } from "@/lib/email/templates/playbook/free-kurs";
import { terminMail, type TerminMailDaten, type TerminMailId } from "@/lib/email/templates/playbook/termin";
import { benachrichtigeTeamFehler } from "@/lib/email/templates/training-team";
import { getAppUrl } from "@/lib/site-url";
import { vornameAus } from "@/lib/training/zugang";
import { normEmail, sendeVorlage } from "./versand";

/**
 * Analysegespräche aus Calendly (`termine`, Migration 111) und die Mails, die an
 * einem Termin-Ereignis hängen: T01 (Buchung), R01 (Umbuchung), R02/R03
 * (Absage). Die zeitgesteuerten T02–T04, N01/N02 und B01–B03 verschickt der
 * Cron `mail-termine`.
 *
 * Die Termin-Mails ersetzen Calendlys eigene Bestätigungen und Erinnerungen.
 * Deshalb gehen sie erst raus, wenn **`PLAYBOOK_TERMINMAILS=1`** gesetzt ist —
 * im selben Moment, in dem in Calendly die Mails an Eingeladene abgeschaltet
 * werden. Bis dahin werden die Termine nur festgehalten (Board → Termine).
 */

export function terminMailsAktiv(): boolean {
  return process.env.PLAYBOOK_TERMINMAILS?.trim() === "1";
}

export type LeadArt = "training" | "discord";

export type TerminZeile = {
  id: string;
  lead_art: LeadArt;
  lead_id: string;
  lead_token: string | null;
  vorgang: string;
  user_id: string | null;
  email: string;
  name: string | null;
  invitee_uri: string;
  event_uri: string | null;
  start_am: string;
  ende_am: string | null;
  zeitzone: string | null;
  berater_name: string | null;
  berater_email: string | null;
  join_url: string | null;
  absage_url: string | null;
  umbuchen_url: string | null;
  status: "gebucht" | "umgebucht" | "abgesagt_kunde" | "abgesagt_team" | "gefuehrt" | "no_show";
  vorgaenger_id: string | null;
  abgesagt_am: string | null;
  kein_interesse: boolean;
  no_show_am: string | null;
  gefuehrt_am: string | null;
  created_at: string;
};

/* ─── Adressen (Playbook Kapitel 10) ────────────────────────────────────── */

export function leadSchluessel(art: LeadArt, token: string): string {
  return `${art === "training" ? "t" : "d"}-${token}`;
}

export function terminLinks(art: LeadArt, token: string | null, terminId?: string) {
  const app = getAppUrl();
  const s = token ? leadSchluessel(art, token) : null;
  return {
    /** qualified_calendar_url — Kalender zur vorhandenen Anfrage, ohne neue Bewerbung. */
    kalenderUrl: s ? `${app}/termin/kalender/${s}` : `${app}/call`,
    /** appointment_video_5_url — Video 5 ohne Free-Bewerbung. */
    video5Url: s ? `${app}/termin/vorbereitung/${s}` : null,
    /** calendar_event_url */
    kalenderEintragUrl: s && terminId ? `${app}/api/termin/ics/${terminId}?t=${encodeURIComponent(token!)}` : null,
  };
}

/* ─── Lead zu einer Buchung ─────────────────────────────────────────────── */

/** `_` und `%` sind in ILIKE Platzhalter — in Adressen wörtlich gemeint. */
function ohnePlatzhalter(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type LeadInfo = { art: LeadArt; id: string; token: string | null; name: string | null; email: string; userId: string | null };

export async function findeLead(
  service: SupabaseClient,
  p: { medium: string | null; token: string | null; email: string | null },
): Promise<LeadInfo | null> {
  const ausTraining = async (spalte: "token" | "email", wert: string): Promise<LeadInfo | null> => {
    let q = service.from("training_leads").select("id, token, name, email, user_id");
    q = spalte === "token" ? q.eq("token", wert) : q.ilike("email", ohnePlatzhalter(wert));
    const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return null;
    const d = data as { id: string; token: string; name: string; email: string; user_id: string | null };
    return { art: "training", id: d.id, token: d.token, name: d.name, email: d.email, userId: d.user_id };
  };
  const ausDiscord = async (spalte: "token" | "email", wert: string): Promise<LeadInfo | null> => {
    let q = service.from("discord_leads").select("id, token, name, email");
    q = spalte === "token" ? q.eq("token", wert) : q.ilike("email", ohnePlatzhalter(wert));
    const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return null;
    const d = data as { id: string; token: string | null; name: string | null; email: string };
    return { art: "discord", id: d.id, token: d.token, name: d.name, email: d.email, userId: null };
  };

  const medium = p.medium?.toLowerCase() ?? null;
  const reihenfolge = medium === "training" ? [ausTraining, ausDiscord] : [ausDiscord, ausTraining];
  if (p.token) for (const f of reihenfolge) {
    const l = await f("token", p.token);
    if (l) return l;
  }
  if (p.email) for (const f of reihenfolge) {
    const l = await f("email", p.email);
    if (l) return l;
  }
  return null;
}

/* ─── Calendly-Ereignisse ───────────────────────────────────────────────── */

export type CalendlyInvitee = {
  uri?: string;
  email?: string;
  name?: string;
  first_name?: string | null;
  timezone?: string;
  cancel_url?: string;
  reschedule_url?: string;
  old_invitee?: string | null;
  rescheduled?: boolean;
  cancellation?: { canceled_by?: string; reason?: string | null; canceler_type?: "host" | "invitee" | string };
  /** invitee_no_show.created: URI des Eingeladenen */
  invitee?: string;
  tracking?: { utm_medium?: string | null; utm_content?: string | null };
  scheduled_event?: {
    uri?: string;
    start_time?: string;
    end_time?: string;
    location?: { join_url?: string | null; location?: string | null; type?: string | null } | null;
    event_memberships?: { user_email?: string | null; user_name?: string | null }[];
  };
};

/**
 * Wirft bei Fehlern, die eine Wiederholung lohnen (Datenbank, Versand) — der
 * Webhook antwortet dann 500 und Calendly stellt erneut zu. Termin und Mails
 * sind idempotent (invitee_uri, Dedupe-Schlüssel).
 */
export async function verarbeiteCalendly(service: SupabaseClient, ereignis: string, p: CalendlyInvitee): Promise<void> {
  if (ereignis === "invitee.created") await gebucht(service, p);
  else if (ereignis === "invitee.canceled") await abgesagt(service, p);
  else if (ereignis === "invitee_no_show.created") await noShowAusCalendly(service, p, true);
  else if (ereignis === "invitee_no_show.deleted") await noShowAusCalendly(service, p, false);
}

async function gebucht(service: SupabaseClient, p: CalendlyInvitee) {
  const ev = p.scheduled_event;
  if (!p.uri || !ev?.start_time || !p.email) return;
  const { data: schon } = await service.from("termine").select("*").eq("invitee_uri", p.uri).maybeSingle();
  if (schon) {
    // Wiederholung des Webhooks: Termin steht, Bestätigung ggf. nachholen (Dedupe verhindert eine zweite).
    const t = schon as TerminZeile;
    if (t.status === "gebucht") {
      const vor = t.vorgaenger_id
        ? ((await service.from("termine").select("start_am").eq("id", t.vorgaenger_id).maybeSingle()).data as { start_am: string } | null)
        : null;
      await sendeZuTermin(service, t.vorgaenger_id ? "R01" : "T01", t, { alterStart: vor ? new Date(vor.start_am) : null });
    }
    return;
  }

  // Umbuchung: Calendly schickt die neue Buchung mit `old_invitee` — der Lead kommt dann vom alten Termin.
  let vorgaenger: TerminZeile | null = null;
  if (p.old_invitee) {
    const { data } = await service.from("termine").select("*").eq("invitee_uri", p.old_invitee).maybeSingle();
    vorgaenger = (data as TerminZeile | null) ?? null;
  }
  const lead: LeadInfo | null = vorgaenger
    ? {
        art: vorgaenger.lead_art,
        id: vorgaenger.lead_id,
        token: vorgaenger.lead_token,
        name: vorgaenger.name,
        email: vorgaenger.email,
        userId: vorgaenger.user_id,
      }
    : await findeLead(service, {
        medium: p.tracking?.utm_medium ?? null,
        token: p.tracking?.utm_content?.trim() || null,
        email: p.email.trim().toLowerCase(),
      });
  if (!lead) {
    // Ohne Calendly-Mails bekäme dieser Mensch nichts — das Team muss Bescheid wissen.
    console.warn("[termine] Buchung ohne passenden Lead", { email: p.email });
    await benachrichtigeTeamFehler(
      `Buchung ohne Anfrage: ${p.email}`,
      `${p.name ?? p.email} hat für ${ev.start_time} gebucht, aber zu dieser Adresse gibt es keine Gesprächsanfrage. Es geht keine Terminbestätigung raus — bitte persönlich bestätigen.`,
    );
    return;
  }
  const berater = ev.event_memberships?.[0];
  const { data: neu, error } = await service
    .from("termine")
    .insert({
      lead_art: lead.art,
      lead_id: lead.id,
      lead_token: lead.token,
      vorgang: vorgaenger?.vorgang ?? `${lead.art}:${lead.id}`,
      user_id: lead.userId,
      email: normEmail(p.email),
      name: p.name ?? lead.name,
      invitee_uri: p.uri,
      event_uri: ev.uri ?? null,
      start_am: ev.start_time,
      ende_am: ev.end_time ?? null,
      zeitzone: p.timezone ?? null,
      berater_name: berater?.user_name ?? null,
      berater_email: berater?.user_email ?? null,
      join_url: ev.location?.join_url ?? null,
      absage_url: p.cancel_url ?? null,
      umbuchen_url: p.reschedule_url ?? null,
      vorgaenger_id: vorgaenger?.id ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return;
    throw new Error(`termine: ${error.message}`);
  }
  const termin = neu as TerminZeile;
  if (vorgaenger && vorgaenger.status === "gebucht") {
    await service.from("termine").update({ status: "umgebucht", updated_at: new Date().toISOString() }).eq("id", vorgaenger.id);
  }
  await sendeZuTermin(service, vorgaenger ? "R01" : "T01", termin, { alterStart: vorgaenger ? new Date(vorgaenger.start_am) : null });
}

async function abgesagt(service: SupabaseClient, p: CalendlyInvitee) {
  if (!p.uri) return;
  const { data } = await service.from("termine").select("*").eq("invitee_uri", p.uri).maybeSingle();
  const termin = data as TerminZeile | null;
  if (!termin || termin.status !== "gebucht") return;
  const jetzt = new Date().toISOString();

  // Umbuchung: Die neue Buchung kommt (oder kam) als eigenes Ereignis mit R01.
  if (p.rescheduled) {
    await service.from("termine").update({ status: "umgebucht", updated_at: jetzt }).eq("id", termin.id);
    return;
  }
  // Absage durch den Gastgeber = „Ausfall durch Capital Circle" (R03). Sagt der Kunde
  // telefonisch ab, im Board „Abgesagt" wählen statt in Calendly abzusagen.
  const team = p.cancellation?.canceler_type === "host";
  await service
    .from("termine")
    .update({ status: team ? "abgesagt_team" : "abgesagt_kunde", abgesagt_am: jetzt, updated_at: jetzt })
    .eq("id", termin.id);
  if (termin.lead_art === "training") {
    await service.from("training_leads").update({ status: "nachfassen", updated_at: jetzt }).eq("id", termin.lead_id).eq("status", "termin");
  }
  await sendeZuTermin(service, team ? "R03" : "R02", termin, {});
}

async function noShowAusCalendly(service: SupabaseClient, p: CalendlyInvitee, gesetzt: boolean) {
  const inviteeUri = p.invitee ?? p.uri;
  if (!inviteeUri) return;
  const { data } = await service.from("termine").select("id, status").eq("invitee_uri", inviteeUri).maybeSingle();
  if (!data) return;
  const t = data as { id: string; status: string };
  // Zurücknehmen nur, wenn wirklich No-Show steht (nie ein „geführt" überschreiben).
  if (!gesetzt && t.status !== "no_show") return;
  await setzeTerminStatus(service, t.id, gesetzt ? "no_show" : "gebucht", null);
}

/* ─── Status durch das Team (Board → Termine) ───────────────────────────── */

export type TerminAktion = "no_show" | "gefuehrt" | "gebucht" | "abgesagt_kunde" | "kein_interesse" | "abgesagt_team";

export async function setzeTerminStatus(
  service: SupabaseClient,
  terminId: string,
  aktion: TerminAktion,
  von: string | null,
): Promise<{ ok: true } | { ok: false; fehler: string }> {
  const { data } = await service.from("termine").select("*").eq("id", terminId).maybeSingle();
  const t = data as TerminZeile | null;
  if (!t) return { ok: false, fehler: "nicht_gefunden" };
  const jetzt = new Date().toISOString();
  const basis = { updated_at: jetzt, gesetzt_von: von };

  if (aktion === "no_show") {
    // „Kein Teamversäumnis als Kundenfehler": nur nach dem Beginn, nie bei abgesagten Terminen.
    if (new Date(t.start_am).getTime() > Date.now()) return { ok: false, fehler: "noch_nicht_begonnen" };
    if (!["gebucht", "no_show"].includes(t.status)) return { ok: false, fehler: "status" };
    await service.from("termine").update({ ...basis, status: "no_show", no_show_am: t.no_show_am ?? jetzt }).eq("id", t.id);
    if (t.lead_art === "training")
      await service.from("training_leads").update({ status: "no_show", updated_at: jetzt }).eq("id", t.lead_id).not("status", "in", "(gewonnen,verloren)");
    else await service.from("discord_leads").update({ no_show: true }).eq("id", t.lead_id);
    // Zweiter bestätigter No-Show im Vorgang: keine Automatik mehr — das Team muss persönlich klären.
    const { count } = await service.from("termine").select("id", { count: "exact", head: true }).eq("vorgang", t.vorgang).not("no_show_am", "is", null);
    if ((count ?? 0) >= 2) {
      await benachrichtigeTeamFehler(
        `Zweiter No-Show: ${t.email}`,
        `${t.name ?? t.email} ist zum zweiten Mal nicht erschienen. Es gehen keine automatischen Mails mehr raus und der Kalenderlink ist gesperrt — bitte persönlich klären.`,
      );
    }
    return { ok: true };
  }
  // „Gebucht" nur als Rücknahme eines No-Shows, „geführt" nur aus gebucht/No-Show.
  if (aktion === "gebucht" && t.status !== "no_show") return { ok: false, fehler: "status" };
  if (aktion === "gefuehrt" && !["gebucht", "no_show"].includes(t.status)) return { ok: false, fehler: "status" };
  if (aktion === "gefuehrt" || aktion === "gebucht") {
    // „Gebucht" = No-Show zurücknehmen (verspätet erschienen, technischer Fehler).
    await service
      .from("termine")
      .update({ ...basis, status: aktion, gefuehrt_am: aktion === "gefuehrt" ? jetzt : null, no_show_am: null })
      .eq("id", t.id);
    if (t.lead_art === "discord") await service.from("discord_leads").update({ no_show: false }).eq("id", t.lead_id);
    return { ok: true };
  }
  // Absagen über das Board (z. B. am Telefon) — nur für noch gebuchte, noch nicht begonnene Termine.
  if (t.status !== "gebucht") return { ok: false, fehler: "status" };
  if (new Date(t.start_am).getTime() <= Date.now()) return { ok: false, fehler: "schon_begonnen" };
  const team = aktion === "abgesagt_team";
  await service
    .from("termine")
    .update({ ...basis, status: team ? "abgesagt_team" : "abgesagt_kunde", abgesagt_am: jetzt, kein_interesse: aktion === "kein_interesse" })
    .eq("id", t.id);
  if (t.lead_art === "training") {
    await service
      .from("training_leads")
      .update({ status: aktion === "kein_interesse" ? "verloren" : "nachfassen", updated_at: jetzt })
      .eq("id", t.lead_id)
      .not("status", "in", "(gewonnen,verloren)");
  }
  await sendeZuTermin(service, team ? "R03" : "R02", { ...t, kein_interesse: aktion === "kein_interesse" }, {});
  return { ok: true };
}

/* ─── Versand einer Termin-Mail ─────────────────────────────────────────── */

export function terminDaten(t: TerminZeile, extra: Partial<TerminMailDaten> = {}): TerminMailDaten {
  const links = terminLinks(t.lead_art, t.lead_token, t.id);
  return {
    vorname: vornameAus(t.name),
    kalenderUrl: links.kalenderUrl,
    video5Url: links.video5Url,
    termin: {
      start: new Date(t.start_am),
      ende: t.ende_am ? new Date(t.ende_am) : null,
      zeitzone: t.zeitzone,
      beraterName: t.berater_name,
      joinUrl: t.join_url,
      verwaltenUrl: t.umbuchen_url ?? t.absage_url,
      kalenderEintragUrl: links.kalenderEintragUrl,
    },
    keinInteresse: t.kein_interesse,
    ...extra,
  };
}

/** Anlass je Vorlage (Playbook Kapitel 11, Deduplizierung). */
export function terminBezug(vorlage: TerminMailId, t: Pick<TerminZeile, "id" | "vorgang">): string {
  if (vorlage === "T02") return `vorgang:${t.vorgang}`;
  if (vorlage === "N01" || vorlage === "N02") return `noshow:${t.id}`;
  return `termin:${t.id}`;
}

/** Einwahllink eines Calendly-Termins über die API (nur mit `CALENDLY_API_TOKEN`). */
async function holeJoinUrl(eventUri: string): Promise<string | null> {
  const token = process.env.CALENDLY_API_TOKEN?.trim();
  if (!token) return null;
  try {
    const res = await fetch(eventUri, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { resource?: { location?: { join_url?: string | null } } };
    return json.resource?.location?.join_url ?? null;
  } catch {
    return null;
  }
}

export async function sendeZuTermin(
  service: SupabaseClient,
  vorlage: TerminMailId,
  termin: TerminZeile,
  extra: Partial<TerminMailDaten>,
  faelligAm?: Date,
): Promise<"gesendet" | "aus" | "blockiert" | "schon_erledigt" | "gesperrt" | "abstand"> {
  if (!terminMailsAktiv()) return "aus";
  let t = termin;
  // Calendly legt Zoom/Meet asynchron an — fehlt der Einwahllink noch, einmal nachladen.
  if (!t.join_url && t.event_uri && ["T01", "T03", "T04", "R01"].includes(vorlage)) {
    const join = await holeJoinUrl(t.event_uri);
    if (join) {
      await service.from("termine").update({ join_url: join, updated_at: new Date().toISOString() }).eq("id", t.id);
      t = { ...t, join_url: join };
    }
  }
  const klasseM = vorlage === "T02" || vorlage === "N01" || vorlage === "N02";
  let mail;
  try {
    mail = terminMail(vorlage, {
      ...terminDaten(t, extra),
      ...(klasseM ? { unsubscribeUrl: abmeldeUrl({ userId: t.user_id, email: t.email }) } : {}),
    });
  } catch (err) {
    if (err instanceof FehlendeDaten) {
      console.error(`[termine] ${vorlage} für ${t.email} blockiert: ${err.message}`);
      // Genau einmal festhalten und melden — der Cron entscheidet alle 5 Minuten neu.
      const { error: protFehler } = await service.from("mail_versand").insert({
        vorlage,
        bezug: terminBezug(vorlage, t),
        email: normEmail(t.email),
        user_id: t.user_id,
        klasse: vorlage === "T02" ? "M" : vorlage.startsWith("N") ? "K" : "S",
        status: "gestoppt",
        grund: "fehlende_daten",
        faellig_am: faelligAm?.toISOString() ?? null,
      });
      if (protFehler) return "blockiert";
      await benachrichtigeTeamFehler(
        `${vorlage} an ${t.email} nicht verschickt`,
        `${err.message}. Termin am ${new Date(t.start_am).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} (Calendly-Ort mit Einwahllink und Gastgeber prüfen). Bitte den Kontakt persönlich informieren.`,
      );
      return "blockiert";
    }
    throw err;
  }
  return sendeVorlage(service, {
    vorlage,
    bezug: terminBezug(vorlage, t),
    email: t.email,
    userId: t.user_id,
    betreff: mail.betreff,
    jsx: mail.jsx,
    faelligAm: faelligAm ?? null,
    beraterName: t.berater_name,
  });
}

/** Lead zu einem Schlüssel aus einer Mail (`t-<token>` / `d-<token>`), sonst null. */
export async function leadAusSchluessel(service: SupabaseClient, schluessel: string): Promise<LeadInfo | null> {
  const m = /^([td])-([A-Za-z0-9_-]{8,80})$/.exec(schluessel);
  if (!m) return null;
  const art: LeadArt = m[1] === "t" ? "training" : "discord";
  const token = m[2]!;
  if (art === "training") {
    const { data } = await service.from("training_leads").select("id, token, name, email, user_id").eq("token", token).maybeSingle();
    if (!data) return null;
    const d = data as { id: string; token: string; name: string; email: string; user_id: string | null };
    return { art, id: d.id, token: d.token, name: d.name, email: d.email, userId: d.user_id };
  }
  const { data } = await service.from("discord_leads").select("id, token, name, email").eq("token", token).maybeSingle();
  if (!data) return null;
  const d = data as { id: string; token: string; name: string | null; email: string };
  return { art, id: d.id, token: d.token, name: d.name, email: d.email, userId: null };
}

/** Calendly-Adresse für eine vorhandene Anfrage — mit Token, damit der Webhook zuordnet. */
export function calendlyUrlFuer(lead: LeadInfo): string {
  const basis =
    (lead.art === "training" ? process.env.NEXT_PUBLIC_TRAINING_CALENDLY_URL?.trim() : null) ||
    process.env.NEXT_PUBLIC_CALL_CALENDLY_URL?.trim() ||
    process.env.NEXT_PUBLIC_DISCORD_CALENDLY_URL?.trim() ||
    "https://calendly.com/contact-capitalcircletrading/capital-circle";
  const url = new URL(basis);
  url.searchParams.set("utm_source", "capital-circle");
  url.searchParams.set("utm_medium", lead.art);
  url.searchParams.set("utm_campaign", "mail");
  if (lead.token) url.searchParams.set("utm_content", lead.token);
  const vorname = (lead.name ?? "").trim().split(/\s+/)[0];
  if (vorname) url.searchParams.set("first_name", vorname);
  url.searchParams.set("email", lead.email);
  return url.toString();
}
