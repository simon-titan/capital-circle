import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendWiderrufBetreiber } from "@/lib/email/templates/widerruf-betreiber";
import { sendWiderrufEingang } from "@/lib/email/templates/widerruf-eingang";
import { sendSlackNotification } from "@/lib/notifications/slack";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BETREIBER_EMAIL,
  ERKLAERUNG,
  GRENZEN,
  istGueltigeEmail,
  referenzAus,
  type WiderrufsBeleg,
} from "@/lib/widerruf/shared";
import { ipHash, istGedrosselt, ordneZu, type WiderrufsEingabe } from "@/lib/widerruf/verarbeiten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Name des Honeypot-Felds — muss mit dem Formular übereinstimmen. */
const HONIGTOPF = "cc_feld_url";

interface Rumpf {
  name?: unknown;
  email?: unknown;
  bestaetigungEmail?: unknown;
  vertragAngabe?: unknown;
  [HONIGTOPF]?: unknown;
}

type Feld = "name" | "email" | "bestaetigungEmail" | "vertragAngabe";

function text(wert: unknown): string {
  return typeof wert === "string" ? wert.trim() : "";
}

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/widerruf — die elektronische Widerrufsfunktion (§ 356a BGB).
 *
 * Öffentlich, ohne Anmeldung (`/api/*` läuft in `proxy.ts` ohne Auth-Gate).
 * Aufgerufen von der Schaltfläche „Widerruf bestätigen" auf `/widerrufen`
 * (§ 356a Abs. 3 BGB).
 *
 * Ablauf:
 *   1. Eingangszeitpunkt festhalten — **vor** allem anderen. Genau dieser
 *      Zeitpunkt wird bestätigt (Abs. 4) und entscheidet über die
 *      Fristwahrung (Abs. 5).
 *   2. Validieren, Honeypot, Drosselung.
 *   3. Zeile in `widerrufe` mit Status `eingegangen` speichern.
 *   4. Konto und Vertrag zuordnen (`lib/widerruf/verarbeiten.ts`) — nur als
 *      Arbeitshilfe. **Nichts** wird automatisch beendet oder erstattet.
 *   5. Zeile auf `manuell_pruefen` nachziehen, Eingangsbestätigung an den
 *      Verbraucher (dauerhafter Datenträger: E-Mail), Benachrichtigung an den
 *      Betreiber.
 *
 * Scheitert das Speichern (z. B. solange Migration 090 fehlt), wird der
 * Widerruf trotzdem angenommen und bestätigt: Der Verbraucher hat ihn
 * abgegeben, und die Betreiber-Mail ist dann der Beleg.
 */
export async function POST(request: NextRequest) {
  const eingegangenAm = new Date().toISOString();

  let rumpf: Rumpf;
  try {
    rumpf = (await request.json()) as Rumpf;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: für Menschen unsichtbar. Bewusst eine Fehlermeldung statt einer
  // vorgetäuschten Bestätigung — ein Mensch, dem das doch passiert, soll nicht
  // glauben, widerrufen zu haben.
  if (text(rumpf[HONIGTOPF])) {
    return NextResponse.json(
      { ok: false, error: "Die Anfrage konnte nicht verarbeitet werden. Bitte lade die Seite neu." },
      { status: 400 },
    );
  }

  /* ── Validierung ───────────────────────────────────────────────────────── */

  const felder: Partial<Record<Feld, string>> = {};

  const name = text(rumpf.name).slice(0, GRENZEN.nameMax);
  if (name.length < GRENZEN.nameMin) {
    felder.name = "Bitte gib deinen Vor- und Nachnamen an.";
  }

  const email = text(rumpf.email).toLowerCase();
  if (!istGueltigeEmail(email)) {
    felder.email = "Bitte gib die E-Mail-Adresse an, mit der du gekauft hast.";
  }

  const bestaetigungRoh = text(rumpf.bestaetigungEmail).toLowerCase();
  const bestaetigungEmail = bestaetigungRoh || email;
  if (bestaetigungRoh && !istGueltigeEmail(bestaetigungRoh)) {
    felder.bestaetigungEmail = "Bitte gib eine gültige E-Mail-Adresse für die Eingangsbestätigung an.";
  }

  const vertragAngabe = text(rumpf.vertragAngabe).slice(0, GRENZEN.vertragMax) || null;

  if (Object.keys(felder).length > 0) {
    return NextResponse.json({ ok: false, error: "Bitte prüfe die markierten Angaben.", felder }, { status: 400 });
  }

  /* ── Drosselung ────────────────────────────────────────────────────────── */

  const ipHashWert = ipHash(clientIp(request));
  if (await istGedrosselt({ email, bestaetigungEmail, ipHashWert })) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Zu dieser Adresse sind in der letzten Stunde bereits mehrere Widerrufe eingegangen. Die " +
          `Eingangsbestätigung liegt in deinem Postfach. Fehlt etwas, schreib uns an ${BETREIBER_EMAIL} oder ` +
          "versuche es in einer Stunde erneut.",
      },
      { status: 429 },
    );
  }

  /* ── Eingang speichern ─────────────────────────────────────────────────── */

  const eingabe: WiderrufsEingabe = { name, email, bestaetigungEmail, vertragAngabe };

  const id = randomUUID();
  const referenz = referenzAus(id);
  const service = createServiceClient();

  const { error: speicherFehler } = await service.from("widerrufe").insert({
    id,
    eingegangen_am: eingegangenAm,
    erklaerung: ERKLAERUNG,
    name,
    email,
    bestaetigung_email: bestaetigungEmail,
    vertrag_angabe: vertragAngabe,
    status: "eingegangen",
    ip_hash: ipHashWert,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (speicherFehler) {
    console.error(`[widerruf] ${referenz} nicht gespeichert:`, speicherFehler.message);
  }
  const gespeichert = !speicherFehler;

  /* ── Zuordnen (ohne Ausführung) ────────────────────────────────────────── */

  let sitzung: { userId: string; email: string | null } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) sitzung = { userId: data.user.id, email: data.user.email ?? null };
  } catch {
    // Ohne lesbare Sitzung wie „nicht eingeloggt" weiter.
  }

  const zuordnung = await ordneZu(eingabe, sitzung, eingegangenAm);

  if (gespeichert) {
    const { error } = await service
      .from("widerrufe")
      .update({
        user_id: zuordnung.userId,
        eingeloggt: zuordnung.eingeloggt,
        vertrag_bezeichnung: zuordnung.vertragBezeichnung,
        vertrag_plan: zuordnung.plan,
        stripe_subscription_id: zuordnung.stripeSubscriptionId,
        vertragsschluss_am: zuordnung.vertragsschlussAm,
        frist_ende: zuordnung.fristEnde,
        fristgerecht: zuordnung.fristgerecht,
        status: "manuell_pruefen",
        pruef_hinweis: zuordnung.pruefHinweis,
      })
      .eq("id", id);
    if (error) console.error(`[widerruf] ${referenz} Zuordnung nicht nachgezogen:`, error.message);
  }

  /* ── Eingangsbestätigung und Benachrichtigung ──────────────────────────── */

  // Der Beleg enthält nur, was der Verbraucher selbst angegeben oder — als
  // Eingeloggter — auf der Seite gesehen hat. Keine Auskunft über gefundene
  // Konten oder Verträge an jemanden, der nur eine E-Mail-Adresse kennt.
  const beleg: WiderrufsBeleg = {
    referenz,
    eingegangenAm,
    erklaerung: ERKLAERUNG,
    name,
    email,
    vertragBezeichnung: zuordnung.vertragBezeichnung,
    vertragAngabe,
    bestaetigungEmail,
    bestaetigungVersendet: false,
  };

  try {
    await sendWiderrufEingang({ an: bestaetigungEmail, beleg });
    beleg.bestaetigungVersendet = true;
  } catch (err) {
    console.error(`[widerruf] ${referenz} Eingangsbestätigung fehlgeschlagen:`, err);
  }

  // Ging die Bestätigung an eine andere Adresse als die des Kontos, erfährt
  // der Konto-Inhaber es trotzdem. Der Betreiber beendet auf einen Widerruf
  // hin den Zugang — ein Dritter soll das nicht still auslösen können.
  if (zuordnung.kontoEmail && zuordnung.kontoEmail !== bestaetigungEmail) {
    try {
      await sendWiderrufEingang({ an: zuordnung.kontoEmail, beleg, kopieAnKonto: true });
    } catch (err) {
      console.error(`[widerruf] ${referenz} Kopie an Konto-Adresse fehlgeschlagen:`, err);
    }
  }

  if (gespeichert && beleg.bestaetigungVersendet) {
    const { error } = await service
      .from("widerrufe")
      .update({ bestaetigung_gesendet_am: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error(`[widerruf] ${referenz} Versandzeit nicht gespeichert:`, error.message);
  }

  try {
    await sendWiderrufBetreiber({
      beleg,
      info: {
        pruefHinweis: zuordnung.pruefHinweis,
        userId: zuordnung.userId,
        eingeloggt: zuordnung.eingeloggt,
        plan: zuordnung.plan,
        stripeSubscriptionId: zuordnung.stripeSubscriptionId,
        vertragsschlussAm: zuordnung.vertragsschlussAm,
        fristEnde: zuordnung.fristEnde,
        fristgerecht: zuordnung.fristgerecht,
        gespeichert,
        speicherFehler: speicherFehler?.message ?? null,
        bestaetigungVersendet: beleg.bestaetigungVersendet,
      },
    });
  } catch (err) {
    console.error(`[widerruf] ${referenz} Betreiber-Mail fehlgeschlagen:`, err);
  }

  // Zusätzlich Slack, falls eingerichtet (ohne `SLACK_WEBHOOK_URL` still übersprungen).
  await sendSlackNotification(
    `Widerruf über /widerrufen: bitte prüfen — ${referenz}` +
      (zuordnung.fristgerecht === false ? " · nach der regulären Frist" : "") +
      (gespeichert ? "" : " · NICHT in der Datenbank gespeichert"),
  );

  return NextResponse.json({ ok: true, beleg });
}
