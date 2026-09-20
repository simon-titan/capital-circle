import { NextResponse, type NextRequest } from "next/server";
import { sendKontaktBetreiber, sendKontaktEingang } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/email/resend";
import { sendSlackNotification } from "@/lib/notifications/slack";
import {
  KONTAKT_EMAIL,
  KONTAKT_GRENZEN,
  KONTAKT_HONIGTOPF,
  KONTAKT_KATEGORIEN,
  istGueltigeEmail,
  istKontaktKategorie,
  kontaktGedrosselt,
  kontaktIpHash,
  kontaktVerlaufUrl,
} from "@/lib/support/kontakt";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Rumpf {
  name?: unknown;
  email?: unknown;
  kategorie?: unknown;
  betreff?: unknown;
  nachricht?: unknown;
  [KONTAKT_HONIGTOPF]?: unknown;
}

type Feld = "name" | "email" | "betreff" | "nachricht";

function text(wert: unknown): string {
  return typeof wert === "string" ? wert.trim() : "";
}

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/kontakt — Kontaktformular ohne Anmeldung.
 *
 * Öffentlich (`/api/*` läuft in `proxy.ts` ohne Auth-Gate). Legt ein Ticket
 * ohne `user_id` an, also im selben System wie die Tickets der Mitglieder;
 * der Absender steht in `contact_email`. Die Antwort trägt den Link zum
 * Verlauf, denn ohne Konto ist der Token in dieser Adresse der einzige Weg
 * zurück zum Ticket. Derselbe Link steht in der Bestätigungsmail.
 *
 * Schutz vor Missbrauch: Honeypot, Drosselung je Adresse, je (gehashter) IP
 * und insgesamt, dazu Längengrenzen. Die Bestätigungsmail geht an eine
 * ungeprüfte Adresse, darum ist die Drosselung je Adresse Pflicht — sonst
 * ließe sich das Formular als Mailschleuder gegen Dritte benutzen.
 */
export async function POST(request: NextRequest) {
  let rumpf: Rumpf;
  try {
    rumpf = (await request.json()) as Rumpf;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: für Menschen unsichtbar. Bots bekommen eine Fehlermeldung, ein
  // Mensch, dem das doch passiert, wird nicht in dem Glauben gelassen, er habe
  // geschrieben.
  if (text(rumpf[KONTAKT_HONIGTOPF])) {
    return NextResponse.json(
      { ok: false, error: "Die Anfrage konnte nicht verarbeitet werden. Bitte lade die Seite neu." },
      { status: 400 },
    );
  }

  const felder: Partial<Record<Feld, string>> = {};

  const name = text(rumpf.name).slice(0, KONTAKT_GRENZEN.nameMax);
  if (name.length < KONTAKT_GRENZEN.nameMin) felder.name = "Bitte gib deinen Namen an.";

  const email = text(rumpf.email).toLowerCase();
  if (!istGueltigeEmail(email)) felder.email = "Bitte gib eine gültige E-Mail-Adresse an, damit wir dir antworten können.";

  const betreff = text(rumpf.betreff).slice(0, KONTAKT_GRENZEN.betreffMax);
  if (betreff.length < KONTAKT_GRENZEN.betreffMin) felder.betreff = "Bitte gib einen kurzen Betreff an.";

  const nachricht = text(rumpf.nachricht);
  if (nachricht.length < KONTAKT_GRENZEN.nachrichtMin) {
    felder.nachricht = "Bitte beschreibe dein Anliegen etwas ausführlicher.";
  } else if (nachricht.length > KONTAKT_GRENZEN.nachrichtMax) {
    felder.nachricht = `Die Nachricht ist zu lang (höchstens ${KONTAKT_GRENZEN.nachrichtMax} Zeichen).`;
  }

  const kategorie = istKontaktKategorie(rumpf.kategorie) ? rumpf.kategorie : "other";

  if (Object.keys(felder).length > 0) {
    return NextResponse.json({ ok: false, error: "Bitte prüfe die markierten Angaben.", felder }, { status: 400 });
  }

  const ipHashWert = kontaktIpHash(clientIp(request));
  if (await kontaktGedrosselt({ email, ipHashWert })) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Von dieser Adresse sind in der letzten Stunde schon mehrere Nachrichten eingegangen. Wir melden uns " +
          `bei dir. Wenn es dringend ist, schreib an ${KONTAKT_EMAIL} oder versuche es später noch einmal.`,
      },
      { status: 429 },
    );
  }

  const service = createServiceClient();

  const { data: ticket, error: ticketFehler } = await service
    .from("support_tickets")
    .insert({
      user_id: null,
      contact_email: email,
      contact_name: name,
      subject: betreff,
      category: kategorie,
      quelle: "kontakt",
      ip_hash: ipHashWert,
    })
    .select("id,zugangs_token")
    .single();

  if (ticketFehler || !ticket) {
    console.error("[kontakt] Ticket nicht anlegbar:", ticketFehler?.message);
    return NextResponse.json(
      {
        ok: false,
        error: `Die Nachricht konnte gerade nicht gespeichert werden. Bitte schreib uns an ${KONTAKT_EMAIL}.`,
      },
      { status: 500 },
    );
  }

  const ticketId = ticket.id as string;
  const token = ticket.zugangs_token as string;

  const { error: nachrichtFehler } = await service.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    sender_type: "user",
    sender_id: null,
    body: nachricht,
  });
  if (nachrichtFehler) {
    // Ein Ticket ohne Text nützt niemandem. Zurückrollen, damit der Nutzer es noch einmal versuchen kann.
    console.error("[kontakt] Nachricht nicht speicherbar:", nachrichtFehler.message);
    await service.from("support_tickets").delete().eq("id", ticketId);
    return NextResponse.json(
      {
        ok: false,
        error: `Die Nachricht konnte gerade nicht gespeichert werden. Bitte schreib uns an ${KONTAKT_EMAIL}.`,
      },
      { status: 500 },
    );
  }

  const appUrl = getAppUrl();
  const verlaufUrl = kontaktVerlaufUrl(appUrl, ticketId, token);
  const kategorieLabel = KONTAKT_KATEGORIEN.find((k) => k.wert === kategorie)?.label ?? kategorie;

  let bestaetigungVersendet = false;
  try {
    await sendKontaktEingang({ an: email, name, betreff, nachricht, verlaufUrl });
    bestaetigungVersendet = true;
  } catch (err) {
    console.error(`[kontakt] Bestätigung an ${ticketId} fehlgeschlagen:`, err);
  }

  try {
    await sendKontaktBetreiber({
      name,
      email,
      kategorie: kategorieLabel,
      betreff,
      nachricht,
      ticketUrl: `${appUrl}/admin/tickets/${ticketId}`,
    });
  } catch (err) {
    console.error(`[kontakt] Betreiber-Mail zu ${ticketId} fehlgeschlagen:`, err);
  }

  await sendSlackNotification(`Neue Kontaktanfrage ohne Anmeldung: ${betreff} (${kategorieLabel})`);

  return NextResponse.json({ ok: true, verlaufUrl, bestaetigungVersendet });
}
