import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendKuendigungBetreiber } from "@/lib/email/templates/kuendigung-betreiber";
import { sendKuendigungEingang } from "@/lib/email/templates/kuendigung-eingang";
import {
  BETREIBER_EMAIL,
  GRENZEN,
  heuteBerlin,
  istGueltigeEmail,
  referenzAus,
  STATUS_LABEL,
  type KuendigungsArt,
  type KuendigungsBeleg,
  type KuendigungsErgebnis,
} from "@/lib/kuendigung/shared";
import { ipHash, istGedrosselt, ordneZuUndFuehreAus, type KuendigungsEingabe } from "@/lib/kuendigung/verarbeiten";
import { sendSlackNotification } from "@/lib/notifications/slack";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Name des Honeypot-Felds — muss mit dem Formular übereinstimmen. */
const HONIGTOPF = "cc_feld_url";

interface Rumpf {
  art?: unknown;
  grund?: unknown;
  name?: unknown;
  email?: unknown;
  bestaetigungEmail?: unknown;
  vertragAngabe?: unknown;
  zeitpunkt?: unknown;
  datum?: unknown;
  [HONIGTOPF]?: unknown;
}

type Feld = "art" | "grund" | "name" | "email" | "bestaetigungEmail" | "vertragAngabe" | "datum";

function text(wert: unknown): string {
  return typeof wert === "string" ? wert.trim() : "";
}

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/kuendigung — der gesetzliche Kündigungsbutton (§ 312k BGB).
 *
 * Öffentlich, ohne Anmeldung (`/api/*` läuft in `proxy.ts` ohne Auth-Gate).
 *
 * Ablauf:
 *   1. Eingangszeitpunkt festhalten — **vor** allem anderen, denn genau dieser
 *      Zeitpunkt wird dem Kunden bestätigt.
 *   2. Validieren, Honeypot, Drosselung.
 *   3. Zeile in `kuendigungen` mit Status `eingegangen` speichern. Die Zeile
 *      steht damit, bevor irgendetwas bei Stripe passiert; bricht die
 *      Verarbeitung danach ab, bleibt sie als „eingegangen" sichtbar.
 *   4. Konto und Vertrag zuordnen, ggf. bei Stripe zum Periodenende kündigen
 *      (`lib/kuendigung/verarbeiten.ts`, dort die Begründung, wann).
 *   5. Zeile nachziehen, Bestätigung an den Kunden, Benachrichtigung an den
 *      Betreiber.
 *
 * Scheitert das Speichern (z. B. solange Migration 072 fehlt), wird die
 * Kündigung trotzdem angenommen und bestätigt: Der Kunde hat sie abgegeben,
 * und die Betreiber-Mail ist dann der Beleg. Eine Kündigung abzuweisen, weil
 * unsere Datenbank hakt, wäre genau die Hürde, die der Kündigungsbutton
 * abschaffen soll.
 */
export async function POST(request: NextRequest) {
  const eingegangenAm = new Date().toISOString();

  let rumpf: Rumpf;
  try {
    rumpf = (await request.json()) as Rumpf;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: Das Feld ist für Menschen unsichtbar und ohne Autofill. Wer es
  // füllt, ist ein Bot. Bewusst eine Fehlermeldung statt einer vorgetäuschten
  // Bestätigung — ein Mensch, dem das doch passiert, soll nicht glauben,
  // gekündigt zu haben.
  if (text(rumpf[HONIGTOPF])) {
    return NextResponse.json(
      { ok: false, error: "Die Anfrage konnte nicht verarbeitet werden. Bitte lade die Seite neu." },
      { status: 400 },
    );
  }

  /* ── Validierung ───────────────────────────────────────────────────────── */

  const felder: Partial<Record<Feld, string>> = {};

  const art = text(rumpf.art) as KuendigungsArt;
  if (art !== "ordentlich" && art !== "ausserordentlich") {
    felder.art = "Bitte wähle die Art der Kündigung.";
  }

  const grundRoh = text(rumpf.grund);
  const grund = art === "ausserordentlich" ? grundRoh.slice(0, GRENZEN.grundMax) : null;
  if (art === "ausserordentlich" && grundRoh.length < GRENZEN.grundMin) {
    felder.grund = "Bitte nenne den Grund für die außerordentliche Kündigung (mindestens ein Satz).";
  }

  const name = text(rumpf.name).slice(0, GRENZEN.nameMax);
  if (name.length < GRENZEN.nameMin) {
    felder.name = "Bitte gib deinen Vor- und Nachnamen an.";
  }

  const email = text(rumpf.email).toLowerCase();
  if (!istGueltigeEmail(email)) {
    felder.email = "Bitte gib die E-Mail-Adresse deines Kontos an.";
  }

  const bestaetigungRoh = text(rumpf.bestaetigungEmail).toLowerCase();
  const bestaetigungEmail = bestaetigungRoh || email;
  if (bestaetigungRoh && !istGueltigeEmail(bestaetigungRoh)) {
    felder.bestaetigungEmail = "Bitte gib eine gültige E-Mail-Adresse für die Bestätigung an.";
  }

  const vertragAngabe = text(rumpf.vertragAngabe).slice(0, GRENZEN.vertragMax) || null;

  const zeitpunkt = text(rumpf.zeitpunkt);
  let zeitpunktWunsch: string | null = null;
  if (zeitpunkt === "datum") {
    const datum = text(rumpf.datum);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || Number.isNaN(Date.parse(`${datum}T12:00:00Z`))) {
      felder.datum = "Bitte wähle ein Datum.";
    } else if (datum < heuteBerlin()) {
      felder.datum = "Das Datum darf nicht in der Vergangenheit liegen.";
    } else {
      zeitpunktWunsch = datum;
    }
  }

  if (Object.keys(felder).length > 0) {
    return NextResponse.json(
      { ok: false, error: "Bitte prüfe die markierten Angaben.", felder },
      { status: 400 },
    );
  }

  /* ── Drosselung ────────────────────────────────────────────────────────── */

  const ipHashWert = ipHash(clientIp(request));
  if (await istGedrosselt({ email, bestaetigungEmail, ipHashWert })) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Zu dieser Adresse sind in der letzten Stunde bereits mehrere Kündigungen eingegangen. Die Bestätigung " +
          `liegt in deinem Postfach. Fehlt etwas, schreib uns an ${BETREIBER_EMAIL} oder versuche es in einer ` +
          "Stunde erneut.",
      },
      { status: 429 },
    );
  }

  /* ── Eingang speichern ─────────────────────────────────────────────────── */

  const eingabe: KuendigungsEingabe = {
    art,
    grund,
    name,
    email,
    bestaetigungEmail,
    vertragAngabe,
    zeitpunktWunsch,
  };

  const id = randomUUID();
  const referenz = referenzAus(id);
  const service = createServiceClient();

  const { error: speicherFehler } = await service.from("kuendigungen").insert({
    id,
    eingegangen_am: eingegangenAm,
    name,
    email,
    bestaetigung_email: bestaetigungEmail,
    art,
    grund,
    zeitpunkt_wunsch: zeitpunktWunsch,
    vertrag_angabe: vertragAngabe,
    status: "eingegangen",
    ip_hash: ipHashWert,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (speicherFehler) {
    console.error(`[kuendigung] ${referenz} nicht gespeichert:`, speicherFehler.message);
  }
  const gespeichert = !speicherFehler;

  /* ── Zuordnen und ggf. ausführen ───────────────────────────────────────── */

  let sitzung: { userId: string; email: string | null } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) sitzung = { userId: data.user.id, email: data.user.email ?? null };
  } catch {
    // Ohne lesbare Sitzung wie „nicht eingeloggt" weiter.
  }

  const zuordnung = await ordneZuUndFuehreAus(eingabe, sitzung);

  if (gespeichert) {
    const { error } = await service
      .from("kuendigungen")
      .update({
        user_id: zuordnung.userId,
        eingeloggt: zuordnung.eingeloggt,
        vertrag_plan: zuordnung.plan,
        stripe_subscription_id: zuordnung.stripeSubscriptionId,
        wirksam_zum: zuordnung.wirksamZum,
        status: zuordnung.status,
        pruef_hinweis: zuordnung.pruefHinweis,
        ausgefuehrt_am: zuordnung.ausgefuehrtAm,
      })
      .eq("id", id);
    if (error) console.error(`[kuendigung] ${referenz} Status nicht nachgezogen:`, error.message);
  }

  /* ── Bestätigung und Benachrichtigung ──────────────────────────────────── */

  /*
    Wer sieht was: Konto- und Vertragsdetails (Tarif, Vertragsende, „kein
    Vertrag gefunden") bekommt nur, wer nachweislich zum Konto gehört — die
    eingeloggte Sitzung oder das Postfach der Konto-Adresse. Alle anderen
    erhalten eine neutrale Eingangsbestätigung. Sonst verriete diese
    öffentliche Seite jedem, der eine E-Mail-Adresse kennt, ob dahinter ein
    bezahltes Abo steckt, welcher Tarif und bis wann.
  */
  const detail = zuordnung.ergebnis;
  const neutral: KuendigungsErgebnis = { art: "eingegangen" };
  const darfDetails = (empfaenger: string) =>
    zuordnung.eingeloggt ||
    empfaenger === zuordnung.kontoEmail ||
    (zuordnung.kontoEmail === null && empfaenger === email);

  const basis: Omit<KuendigungsBeleg, "ergebnis"> = {
    referenz,
    eingegangenAm,
    art,
    grund,
    name,
    email,
    bestaetigungEmail,
    vertragAngabe,
    zeitpunktWunsch,
    bestaetigungVersendet: false,
  };

  try {
    await sendKuendigungEingang({
      an: bestaetigungEmail,
      beleg: { ...basis, ergebnis: darfDetails(bestaetigungEmail) ? detail : neutral },
    });
    basis.bestaetigungVersendet = true;
  } catch (err) {
    console.error(`[kuendigung] ${referenz} Bestätigungsmail fehlgeschlagen:`, err);
  }

  // Ging die Bestätigung an eine andere Adresse als die des Kontos, erfährt
  // der Konto-Inhaber es trotzdem — mit allen Details. Sonst könnte ein
  // Dritter still kündigen.
  if (zuordnung.kontoEmail && zuordnung.kontoEmail !== bestaetigungEmail) {
    try {
      await sendKuendigungEingang({ an: zuordnung.kontoEmail, beleg: { ...basis, ergebnis: detail }, kopieAnKonto: true });
    } catch (err) {
      console.error(`[kuendigung] ${referenz} Kopie an Konto-Adresse fehlgeschlagen:`, err);
    }
  }

  const beleg: KuendigungsBeleg = { ...basis, ergebnis: zuordnung.eingeloggt ? detail : neutral };

  if (gespeichert && beleg.bestaetigungVersendet) {
    const { error } = await service
      .from("kuendigungen")
      .update({ bestaetigung_gesendet_am: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error(`[kuendigung] ${referenz} Versandzeit nicht gespeichert:`, error.message);
  }

  const info = {
    status: zuordnung.status,
    pruefHinweis: zuordnung.pruefHinweis,
    userId: zuordnung.userId,
    eingeloggt: zuordnung.eingeloggt,
    stripeSubscriptionId: zuordnung.stripeSubscriptionId,
    gespeichert,
    speicherFehler: speicherFehler?.message ?? null,
    bestaetigungVersendet: beleg.bestaetigungVersendet,
  };

  try {
    await sendKuendigungBetreiber({ beleg: { ...basis, ergebnis: detail }, info });
  } catch (err) {
    console.error(`[kuendigung] ${referenz} Betreiber-Mail fehlgeschlagen:`, err);
  }

  // Zusätzlich Slack, falls eingerichtet (ohne `SLACK_WEBHOOK_URL` still übersprungen).
  await sendSlackNotification(
    `Kündigung über /kuendigen: ${STATUS_LABEL[zuordnung.status]} — ${referenz}` +
      (zuordnung.pruefHinweis ? ` · ${zuordnung.pruefHinweis}` : "") +
      (gespeichert ? "" : " · NICHT in der Datenbank gespeichert"),
  );

  return NextResponse.json({ ok: true, beleg });
}
