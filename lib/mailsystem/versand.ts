import type * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TEAM_POSTFACH } from "@/config/team";
import { sendEmail } from "@/lib/email/send";
import { VORLAGEN, type VorlageId } from "./vorlagen";

/**
 * Versand der Playbook-Vorlagen mit Protokoll (`mail_versand`, Migration 110).
 *
 * Ablauf je Mail (Playbook Kapitel 11, `before_send`):
 *   1. Zustellsperre prüfen (Bounce/Beschwerde) — dann „gestoppt".
 *   2. Dedupe-Schlüssel (E-Mail + Vorlage + Anlass) atomar reservieren. Ist er
 *      schon da, ging die Mail bereits raus oder wurde bewusst ausgelassen.
 *   3. Genau eine Mail senden, Ergebnis eintragen. Scheitert der Versand, wird
 *      die Reservierung zurückgenommen, damit der nächste Lauf es erneut
 *      versucht — und der Fehler geht nach oben.
 *
 * Absender: „Emre | Capital Circle" bzw. „<Berater> | Capital Circle",
 * Antworten an ein betreutes Postfach (Kapitel 09: keine unbeaufsichtigte
 * No-Reply-Adresse). Adresse über `MAIL_ABSENDER_EMAIL` (sonst
 * `RESEND_FROM_EMAIL`), Antworten über `MAIL_ANTWORT_AN` (sonst Team-Postfach).
 */

export type VersandStatus = "gesendet" | "schon_erledigt" | "gesperrt" | "abstand";

/** Eine Reservierung, die so lange nicht abgeschlossen wurde, gilt als hängengeblieben. */
const RESERVIERUNG_VERFALL_MS = 15 * 60_000;

function absender(name: string): string {
  const email = (process.env.MAIL_ABSENDER_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "").trim();
  if (!email) throw new Error("MAIL_ABSENDER_EMAIL / RESEND_FROM_EMAIL fehlt");
  return `${name} | Capital Circle <${email}>`;
}

function antwortAn(): string {
  return (process.env.MAIL_ANTWORT_AN ?? "").trim() || TEAM_POSTFACH;
}

export const normEmail = (e: string) => e.trim().toLowerCase();

export async function istGesperrt(service: SupabaseClient, email: string): Promise<boolean> {
  const { data, error } = await service.from("mail_sperre").select("email").eq("email", normEmail(email)).maybeSingle();
  if (error) {
    // Ohne Migration 110 gibt es die Tabelle nicht — dann ist niemand gesperrt.
    if (!/does not exist|schema cache/i.test(error.message)) console.error("[mailsystem] mail_sperre nicht lesbar:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function sendeVorlage(
  service: SupabaseClient,
  opts: {
    vorlage: VorlageId;
    bezug: string;
    email: string;
    userId: string | null;
    betreff: string;
    jsx: React.ReactElement;
    faelligAm?: Date | null;
    /** Name des Beraters für Termin-Mails; sonst Emre. */
    beraterName?: string | null;
  },
): Promise<VersandStatus> {
  const meta = VORLAGEN[opts.vorlage];
  const email = normEmail(opts.email);

  if (await istGesperrt(service, email)) {
    await protokolliere(service, [
      { vorlage: opts.vorlage, bezug: opts.bezug, email, userId: opts.userId, status: "gestoppt", grund: "zustellsperre", faelligAm: opts.faelligAm ?? null },
    ]);
    return "gesperrt";
  }

  const reserviere = () =>
    service
      .from("mail_versand")
      .insert({
        vorlage: opts.vorlage,
        bezug: opts.bezug,
        email,
        user_id: opts.userId,
        klasse: meta.klasse,
        status: "reserviert",
        faellig_am: opts.faelligAm?.toISOString() ?? null,
      })
      .select("id")
      .maybeSingle();
  let { data: reserviert, error: resFehler } = await reserviere();
  if (resFehler?.code === "23505") {
    // Hängengebliebene Reservierung (Abbruch zwischen Reservieren und Senden)? Dann freigeben und neu.
    const { data: alt } = await service
      .from("mail_versand")
      .select("id, status, created_at")
      .eq("email", email)
      .eq("vorlage", opts.vorlage)
      .eq("bezug", opts.bezug)
      .maybeSingle();
    const a = alt as { id: string; status: string; created_at: string } | null;
    if (!a || a.status !== "reserviert" || Date.now() - new Date(a.created_at).getTime() < RESERVIERUNG_VERFALL_MS) {
      return "schon_erledigt";
    }
    await service.from("mail_versand").delete().eq("id", a.id).eq("status", "reserviert");
    ({ data: reserviert, error: resFehler } = await reserviere());
    if (resFehler?.code === "23505") return "schon_erledigt";
  }
  if (resFehler) throw new Error(`mail_versand: ${resFehler.message}`);
  const id = (reserviert as { id: string }).id;

  /*
    Mindestabstand auch zwischen gleichzeitig laufenden Crons: Hat eine andere
    M/K-Mail an diese Adresse in den letzten 24 h stattgefunden (oder ist gerade
    reserviert), tritt diese zurück. Die Entscheidung davor sah nur ihren Stand.
  */
  if (meta.klasse !== "S") {
    const seit = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data: andere } = await service
      .from("mail_versand")
      .select("id, vorlage, status, gesendet_am, created_at")
      .eq("email", email)
      .in("klasse", ["M", "K"])
      .in("status", ["gesendet", "reserviert"])
      .neq("id", id)
      .gte("created_at", seit);
    const konflikt = ((andere ?? []) as { status: string; gesendet_am: string | null; created_at: string }[]).some((z) =>
      z.status === "gesendet" ? (z.gesendet_am ?? z.created_at) >= seit : Date.now() - new Date(z.created_at).getTime() < RESERVIERUNG_VERFALL_MS,
    );
    if (konflikt) {
      await service.from("mail_versand").delete().eq("id", id).eq("status", "reserviert");
      return "abstand";
    }
  }

  try {
    const name = meta.absender === "berater" && opts.beraterName ? opts.beraterName : "Emre";
    const r = await sendEmail({
      to: email,
      subject: opts.betreff,
      jsx: opts.jsx,
      from: absender(name),
      replyTo: antwortAn(),
    });
    await service
      .from("mail_versand")
      .update({ status: "gesendet", gesendet_am: new Date().toISOString(), resend_id: r.resendMessageId ?? null })
      .eq("id", id);
    return "gesendet";
  } catch (err) {
    await service.from("mail_versand").delete().eq("id", id).eq("status", "reserviert");
    throw err;
  }
}

export type ProtokollZeile = {
  vorlage: VorlageId;
  bezug: string;
  email: string;
  userId: string | null;
  status: "uebersprungen" | "gestoppt";
  grund: string;
  faelligAm: Date | null;
};

/** Ausgelassene Vorlagen festhalten — nie doppelt (der Dedupe-Schlüssel gilt auch hier). */
export async function protokolliere(service: SupabaseClient, zeilen: ProtokollZeile[]): Promise<void> {
  if (!zeilen.length) return;
  const { error } = await service.from("mail_versand").upsert(
    zeilen.map((z) => ({
      vorlage: z.vorlage,
      bezug: z.bezug,
      email: normEmail(z.email),
      user_id: z.userId,
      klasse: VORLAGEN[z.vorlage].klasse,
      status: z.status,
      grund: z.grund,
      faellig_am: z.faelligAm?.toISOString() ?? null,
    })),
    { onConflict: "email,vorlage,bezug", ignoreDuplicates: true },
  );
  if (error) console.error("[mailsystem] Protokoll nicht geschrieben:", error.message);
}

/**
 * Letzte automatische M/K-Sendung an diese Adressen (gleich welcher Weg) —
 * für den Mindestabstand von 24 h. A02 zählt mit: Auch nach der Annahme kommt
 * der erste Lern-/Salesimpuls frühestens 24 h später (Kapitel 08).
 */
export async function letzteMarketingSendungen(service: SupabaseClient, emails: string[]): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (!emails.length) return map;
  const { data, error } = await service
    .from("mail_versand")
    .select("email, gesendet_am, klasse, vorlage")
    .in("email", emails.map(normEmail))
    .eq("status", "gesendet")
    .gte("gesendet_am", new Date(Date.now() - 3 * 86_400_000).toISOString());
  if (error) {
    console.error("[mailsystem] letzte Sendungen nicht lesbar:", error.message);
    return map;
  }
  for (const z of (data ?? []) as { email: string; gesendet_am: string; klasse: string; vorlage: string }[]) {
    if (z.klasse === "S" && z.vorlage !== "A02") continue;
    const d = new Date(z.gesendet_am);
    const alt = map.get(z.email);
    if (!alt || d > alt) map.set(z.email, d);
  }
  return map;
}

/** Absender und Antwortadresse der Playbook-Mails, für Versender außerhalb von `sendeVorlage`. */
export function playbookAbsender(name = "Emre"): { from: string; replyTo: string } {
  return { from: absender(name), replyTo: antwortAn() };
}

/**
 * Eine anderswo verschickte Mail (z. B. Kaufbestätigung mit eigenem Log) im
 * Playbook-Protokoll vermerken — damit Mindestabstand, Board und Folgemails
 * (U01/U02 nach W01) sie kennen. Best effort, wirft nie.
 */
export async function vermerkeGesendet(
  service: SupabaseClient,
  z: { vorlage: VorlageId; bezug: string; email: string; userId: string | null; resendId?: string | null },
): Promise<void> {
  const { error } = await service.from("mail_versand").upsert(
    {
      vorlage: z.vorlage,
      bezug: z.bezug,
      email: normEmail(z.email),
      user_id: z.userId,
      klasse: VORLAGEN[z.vorlage].klasse,
      status: "gesendet",
      gesendet_am: new Date().toISOString(),
      resend_id: z.resendId ?? null,
    },
    { onConflict: "email,vorlage,bezug", ignoreDuplicates: true },
  );
  if (error && !/does not exist|schema cache/i.test(error.message)) console.error("[mailsystem] vermerkeGesendet:", error.message);
}
