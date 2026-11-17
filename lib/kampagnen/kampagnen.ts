import type { SupabaseClient } from "@supabase/supabase-js";
import { KAMPAGNEN, type KampagneId } from "@/config/kampagnen";
import { abmeldeUrl } from "@/lib/email/abmeldung";
import { sendEmail } from "@/lib/email/send";
import { kampagnenMail } from "@/lib/email/templates/playbook/kampagnen";
import { generateReaktivierungToken } from "@/lib/email/unsubscribe-token";
import { abgemeldeteAdressen } from "@/lib/mailsystem/pause";
import { normEmail, playbookAbsender, sendeVorlage } from "@/lib/mailsystem/versand";
import { ladeAuthInfos } from "@/lib/training/board";
import { aktuellesEnde, vornameAus, type TrainingZugangZeile } from "@/lib/training/zugang";

/**
 * Einmal-Kampagnen (15.11.2026), ausgelöst unter `/admin/kampagnen`:
 * Retargeting der ehemaligen Free-Kurs-Mitglieder (RT01) und Trustpilot-Bitte
 * an alle zahlenden Mitglieder (TP01).
 *
 * Jede Mail geht über `sendeVorlage`: genau einmal je Adresse und Kampagne
 * (`mail_versand`, Bezug `kampagne:<id>`), Zustellsperre, 24 h Mindestabstand
 * zu anderen Werbe-Mails. Wer in den letzten 24 h schon eine bekam, bleibt
 * „offen" und geht beim nächsten Klick auf „Senden" mit.
 *
 * **Echter Versand nur in Produktion** (`darfEchtSenden`): Die Preview teilt
 * sich die Datenbank mit der Live-Seite, ein Klick dort ginge an echte
 * Mitglieder — und die Links zeigten auf die Preview. Testmails gehen überall.
 */

export type Empfaenger = { userId: string; email: string; vorname: string | null };

export type KampagnenStand = {
  id: KampagneId;
  gesamt: number;
  gesendet: number;
  offen: number;
  abgemeldet: number;
  /** Gestoppt (Zustellsperre) oder übersprungen. */
  gestoppt: number;
};

/** Pause zwischen zwei Mails: Resend erlaubt je Schlüssel nur wenige Anfragen pro Sekunde. */
const PAUSE_MS = 550;

export function darfEchtSenden(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.KAMPAGNEN_ECHT_SENDEN === "1";
}

const bezugVon = (id: KampagneId) => `kampagne:${id}`;

type ProfilZeile = { id: string; full_name: string | null; is_paid: boolean | null; is_admin: boolean | null; unsubscribed_at: string | null };

async function alleProfile(service: SupabaseClient, ids?: string[]): Promise<ProfilZeile[]> {
  const spalten = "id,full_name,is_paid,is_admin,unsubscribed_at";
  if (!ids) {
    const { data, error } = await service.from("profiles").select(spalten).eq("is_paid", true).limit(5000);
    if (error) throw new Error(`profiles: ${error.message}`);
    return (data ?? []) as ProfilZeile[];
  }
  const aus: ProfilZeile[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await service.from("profiles").select(spalten).in("id", ids.slice(i, i + 200));
    if (error) throw new Error(`profiles: ${error.message}`);
    aus.push(...((data ?? []) as ProfilZeile[]));
  }
  return aus;
}

/**
 * Wer die Kampagne bekommen soll — vor Abmeldungen und Protokoll.
 *
 * Retargeting: alle, die die Willkommensmail des alten Free-Kurses bekamen
 * (`email_sequence_log`, `free_course_welcome`), heute nicht zahlen, keine
 * Bewerbung im neuen Weg haben (auch keine abgelehnte) und keinen laufenden
 * Trainingszugang. Trustpilot: alle mit `is_paid`, ohne Admins.
 */
async function kandidaten(service: SupabaseClient, id: KampagneId): Promise<(ProfilZeile & { email: string })[]> {
  let profile: ProfilZeile[];
  if (id === "retargeting") {
    const { data, error } = await service
      .from("email_sequence_log")
      .select("user_id")
      .eq("sequence", "free_course_welcome")
      .limit(10000);
    if (error) throw new Error(`email_sequence_log: ${error.message}`);
    const ids = [...new Set(((data ?? []) as { user_id: string | null }[]).map((z) => z.user_id).filter((x): x is string => Boolean(x)))];
    profile = (await alleProfile(service, ids)).filter((p) => !p.is_paid && !p.is_admin);

    const pIds = profile.map((p) => p.id);
    const raus = new Set<string>();
    for (let i = 0; i < pIds.length; i += 200) {
      const teil = pIds.slice(i, i + 200);
      const [{ data: bew }, { data: zug }] = await Promise.all([
        service.from("training_bewerbungen").select("user_id").in("user_id", teil),
        service.from("training_zugang").select("*").in("user_id", teil),
      ]);
      for (const b of (bew ?? []) as { user_id: string }[]) raus.add(b.user_id);
      for (const z of (zug ?? []) as TrainingZugangZeile[]) if (aktuellesEnde(z) > new Date()) raus.add(z.user_id);
    }
    profile = profile.filter((p) => !raus.has(p.id));
  } else {
    profile = (await alleProfile(service)).filter((p) => p.is_paid && !p.is_admin);
  }

  const auth = await ladeAuthInfos(service, new Set(profile.map((p) => p.id)));
  return profile
    .map((p) => ({ ...p, email: auth.get(p.id)?.email ?? "" }))
    .filter((p) => p.email)
    .map((p) => ({ ...p, email: normEmail(p.email) }));
}

async function protokollVon(service: SupabaseClient, id: KampagneId): Promise<Map<string, string>> {
  const { data, error } = await service
    .from("mail_versand")
    .select("email,status")
    .eq("vorlage", KAMPAGNEN[id].vorlage)
    .eq("bezug", bezugVon(id))
    .limit(10000);
  if (error) throw new Error(`mail_versand: ${error.message}`);
  return new Map(((data ?? []) as { email: string; status: string }[]).map((z) => [z.email, z.status]));
}

async function zerlege(service: SupabaseClient, id: KampagneId) {
  const alle = await kandidaten(service, id);
  const [protokoll, abgemeldetOhneKonto] = await Promise.all([
    protokollVon(service, id),
    abgemeldeteAdressen(
      service,
      alle.map((p) => p.email),
    ),
  ]);
  const offen: Empfaenger[] = [];
  let gesendet = 0;
  let abgemeldet = 0;
  let gestoppt = 0;
  for (const p of alle) {
    const status = protokoll.get(p.email);
    if (status === "gesendet") gesendet++;
    else if (status === "gestoppt" || status === "uebersprungen") gestoppt++;
    else if (p.unsubscribed_at || abgemeldetOhneKonto.has(p.email)) abgemeldet++;
    else if (status !== "reserviert") offen.push({ userId: p.id, email: p.email, vorname: vornameAus(p.full_name) || null });
  }
  return { gesamt: alle.length, gesendet, abgemeldet, gestoppt, offen };
}

export async function ladeKampagnenStand(service: SupabaseClient, id: KampagneId): Promise<KampagnenStand> {
  const z = await zerlege(service, id);
  return { id, gesamt: z.gesamt, gesendet: z.gesendet, offen: z.offen.length, abgemeldet: z.abgemeldet, gestoppt: z.gestoppt };
}

function mailFuer(id: KampagneId, e: { userId: string; email: string; vorname: string | null }, basisUrl: string) {
  const ziel =
    id === "retargeting" ? `${basisUrl}/training/aktivieren?t=${generateReaktivierungToken(e.userId)}` : KAMPAGNEN.trustpilot.zielUrl;
  return kampagnenMail(KAMPAGNEN[id].vorlage, {
    vorname: e.vorname,
    zielUrl: ziel,
    unsubscribeUrl: abmeldeUrl({ userId: e.userId, email: e.email }),
  });
}

/** Ein Paket echter Mails. Ruft der Admin so lange auf, bis `uebrig` 0 ist. */
export async function sendeKampagnenPaket(
  service: SupabaseClient,
  id: KampagneId,
  opts: { limit: number; basisUrl: string },
): Promise<{ gesendet: number; abstand: number; gesperrt: number; fehler: number; uebrig: number }> {
  const { offen } = await zerlege(service, id);
  const r = { gesendet: 0, abstand: 0, gesperrt: 0, fehler: 0, uebrig: 0 };
  const paket = offen.slice(0, opts.limit);
  for (const e of paket) {
    try {
      const mail = mailFuer(id, e, opts.basisUrl);
      const status = await sendeVorlage(service, {
        vorlage: KAMPAGNEN[id].vorlage,
        bezug: bezugVon(id),
        email: e.email,
        userId: e.userId,
        betreff: mail.betreff,
        jsx: mail.jsx,
      });
      if (status === "gesendet") r.gesendet++;
      else if (status === "abstand") r.abstand++;
      else if (status === "gesperrt") r.gesperrt++;
    } catch (err) {
      r.fehler++;
      console.error(`[kampagnen/${id}] ${e.email}:`, err);
    }
    await new Promise((ok) => setTimeout(ok, PAUSE_MS));
  }
  // Wer wegen Mindestabstand zurücktrat, bleibt offen — zählt aber nicht als Rest dieses Laufs.
  r.uebrig = Math.max(0, offen.length - paket.length);
  return r;
}

/** Testmail an den Admin selbst — ohne Protokoll, mit dem eigenen Konto als Empfänger der Links. */
export async function sendeKampagnenTest(
  id: KampagneId,
  an: { userId: string; email: string; vorname: string | null },
  basisUrl: string,
): Promise<void> {
  const mail = mailFuer(id, an, basisUrl);
  const { from, replyTo } = playbookAbsender();
  await sendEmail({ to: an.email, subject: `[Test] ${mail.betreff}`, jsx: mail.jsx, from, replyTo });
}
