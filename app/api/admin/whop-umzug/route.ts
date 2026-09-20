import { NextResponse } from "next/server";
import {
  ERINNERUNG_VORLAUF_TAGE,
  WHOP_UMZUG_KAMPAGNE,
  WHOP_UMZUG_STUFEN,
  datumKurz,
  istWhopUmzugStufe,
  umzugDirektnachricht1,
  umzugDirektnachricht2,
  type WhopUmzugStufe,
} from "@/config/whop-umzug";
import { cronBefugt } from "@/lib/cron/auth";
import { sendeDirektnachricht } from "@/lib/discord/api";
import { abmeldeUrl } from "@/lib/email/abmeldung";
import { sendWhopUmzug1 } from "@/lib/email/templates/whop-umzug-1-ankuendigung";
import { sendWhopUmzug2 } from "@/lib/email/templates/whop-umzug-2-erinnerung";
import { sendWhopUmzug3 } from "@/lib/email/templates/whop-umzug-3-ende";
import { getAppUrl } from "@/lib/site-url";
import { requireAdminRole } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeUmzugKreis, zaehleKreis, type UmzugMitglied } from "@/lib/whop-umzug/kreis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Eine Seite Empfänger mit Pausen je Person. */
export const maxDuration = 300;

/**
 * Der Whop-Umzug — Mail und Direktnachricht an die letzten Whop-Zahler.
 *
 * Gebaut nach dem Muster der Rückgewinnung (`app/api/admin/rueckgewinnung`):
 * Trockenlauf, Einzeltest, Versandprotokoll, Mail plus Direktnachricht.
 * **Kein Cron.** Der Nachtlauf meldet, welche Stufe fällig wäre; verschickt
 * wird nur, wenn ein Mensch diese Route aufruft.
 *
 *   GET                                   Stand je Mitglied, nichts wird verschickt
 *   POST { stufe, nurAn: "<adresse>" }    Einzeltest (umgeht die Merkliste)
 *   POST { stufe, limit: 25 }             scharf, höchstens 100 je Aufruf
 *   POST { limit: 25 }                    scharf, jede Stufe an den, bei dem sie fällig ist
 *
 * ── Drei Prüfungen vor jeder Nachricht ──────────────────────────────────────
 *
 * 1. **Die Merkliste** (`kampagne_versand`, Migration 082): Jede Stufe geht je
 *    Adresse genau einmal raus. Ein abgebrochener Lauf darf neu gestartet
 *    werden, ohne dass die erste Hälfte alles doppelt bekommt.
 * 2. **Ein Abschluss bei uns beendet die Kampagne** für diese Person. Wer
 *    gekauft hat, darf nicht lesen, sein Zugang laufe demnächst ab.
 * 3. **Der Widerspruch gilt für die Direktnachricht**, nicht für die Mail —
 *    die Begründung steht in `config/whop-umzug.ts` und ist die einzige
 *    Stelle, an der diese Kampagne von der Rückgewinnung abweicht.
 *
 * Zugang: Admin-Sitzung (Rolle „admin") oder `Authorization: Bearer $CRON_SECRET`
 * (fail-closed).
 */

/** Resend-Ratelimit (2 Anfragen pro Sekunde im Standardtarif). */
const MAIL_PAUSE_MS = 600;
/** Pause zwischen zwei Direktnachrichten: Derselbe Bot trägt Mahnungen und Warteraum. */
const DM_PAUSE_MS = 1200;

const schlafen = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function befugt(request: Request): Promise<NextResponse | null> {
  if (cronBefugt(request)) return null;
  const { error } = await requireAdminRole("admin");
  return error;
}

/** Was den Versand von vornherein verbietet. */
function hindernis(): string | null {
  try {
    abmeldeUrl({ userId: "00000000-0000-0000-0000-000000000000", email: "probe@example.com" });
  } catch {
    return "Der Abmeldeweg ist nicht verfügbar (UNSUBSCRIBE_TOKEN_SECRET/SUPABASE_SERVICE_ROLE_KEY fehlt). Ohne ihn wird nichts verschickt.";
  }
  for (const v of ["STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_QUARTERLY", "STRIPE_PRICE_YEARLY"]) {
    if (!process.env[v]?.trim()) {
      return `${v} ist nicht gesetzt. Die Mail verlinkt auf /go/<plan>. Ohne Preis landet jeder Kaufwillige auf „/?fehler=konfiguration".`;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const fehler = await befugt(request);
  if (fehler) return fehler;
  try {
    const kreis = await ladeUmzugKreis();
    return NextResponse.json({
      ok: true,
      probe: true,
      kampagne: WHOP_UMZUG_KAMPAGNE,
      stufen: WHOP_UMZUG_STUFEN,
      erinnerungVorlaufTage: ERINNERUNG_VORLAUF_TAGE,
      hindernis: hindernis(),
      ...zaehleKreis(kreis),
      /*
        Die Vorschau zeigt Adressen — diese Route steht hinter der Adminprüfung,
        und ohne sie liesse sich ein Versand nicht kontrollieren. Ins
        Serverprotokoll gehört sie trotzdem nicht; deshalb nur in der Antwort.
      */
      mitglieder: kreis.mitglieder.map((m) => ({
        email: m.email,
        name: m.name,
        zugangBis: m.zugangBis ? datumKurz(m.zugangBis) : null,
        tageRest: m.tageRest,
        zugangOffen: m.zugangOffen,
        discord: Boolean(m.discordId),
        dmMoeglich: Boolean(m.discordId) && !m.dmWiderspruch && !m.werbeWiderspruch,
        stripeAbo: m.hatStripeAbo,
        gesendet: Object.fromEntries(
          WHOP_UMZUG_STUFEN.map((s) => [s, m.gesendet[s] ? { mail: m.gesendet[s]!.mail, dm: m.gesendet[s]!.dm } : null]),
        ),
        faellig: m.faellig,
      })),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

interface ZeileErgebnis {
  email: string;
  stufe: WhopUmzugStufe;
  mail: "gesendet" | "fehler";
  dm: "gesendet" | "uebersprungen" | "fehler";
  detail?: string;
}

/**
 * Die Mail zur Stufe. Jede braucht das persönliche Datum — deshalb steht der
 * Abbruch ohne `zugangBis` hier und nicht in drei Vorlagen einzeln.
 */
async function sendeMail(
  stufe: WhopUmzugStufe,
  m: UmzugMitglied,
  abmeldeLink: string,
  replyTo?: string,
): Promise<{ resendId: string | null }> {
  if (!m.zugangBis) {
    throw new Error("kein access_until am Profil, ohne Datum wird nichts verschickt (siehe Import-Bericht)");
  }
  const gemeinsam = { an: m.email, vorname: m.vorname, zugangBis: m.zugangBis, abmeldeLink, replyTo };
  const res =
    stufe === "ankuendigung"
      ? await sendWhopUmzug1(gemeinsam)
      : stufe === "erinnerung"
        ? await sendWhopUmzug2({ ...gemeinsam, tageRest: Math.max(m.tageRest ?? 0, 0) })
        : await sendWhopUmzug3(gemeinsam);
  return { resendId: res.resendMessageId ?? null };
}

/**
 * Die Direktnachricht zur Stufe, oder `null`.
 *
 * Zur Stufe „ende" gibt es keine: Der Zugang ist dann beendet, die
 * Mitgliederrolle weg — und eine Direktnachricht an jemanden, der gerade aus
 * den Kanälen geflogen ist, liest sich als Nachtreten. Der Weg zurück steht in
 * der Mail.
 */
function dmText(stufe: WhopUmzugStufe, m: UmzugMitglied, appUrl: string): string | null {
  if (!m.zugangBis) return null;
  if (stufe === "ankuendigung") {
    return umzugDirektnachricht1({ vorname: m.vorname, appUrl, zugangBis: m.zugangBis });
  }
  if (stufe === "erinnerung") {
    return umzugDirektnachricht2({
      vorname: m.vorname,
      appUrl,
      zugangBis: m.zugangBis,
      tageRest: Math.max(m.tageRest ?? 0, 0),
    });
  }
  return null;
}

export async function POST(request: Request) {
  const fehler = await befugt(request);
  if (fehler) return fehler;

  const blocker = hindernis();
  if (blocker) return NextResponse.json({ ok: false, error: blocker }, { status: 409 });

  const body = ((await request.json().catch(() => ({}))) ?? {}) as {
    stufe?: string;
    nurAn?: string;
    limit?: number;
    replyTo?: string;
  };

  if (body.stufe !== undefined && !istWhopUmzugStufe(body.stufe)) {
    return NextResponse.json(
      { ok: false, error: `Unbekannte Stufe „${body.stufe}". Erlaubt: ${WHOP_UMZUG_STUFEN.join(", ")}.` },
      { status: 400 },
    );
  }
  const gewuenschteStufe = body.stufe as WhopUmzugStufe | undefined;

  const appUrl = getAppUrl();
  const supabase = createServiceClient();

  let kreis: Awaited<ReturnType<typeof ladeUmzugKreis>>;
  try {
    kreis = await ladeUmzugKreis();
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }

  /*
    ── Einzeltest ────────────────────────────────────────────────────────────

    Umgeht die Merkliste, aber **nicht** den Kreis: Getestet wird mit einem
    echten Datensatz, sonst prüft der Test die Vorlage und nicht den Weg. Für
    einen Test ohne echte Person legt man sich mit dem Import eine
    Wegwerf-Zeile an (`delivered+…@resend.dev`) und räumt sie danach wieder ab.
  */
  if (body.nurAn?.trim()) {
    const an = body.nurAn.trim().toLowerCase();
    const m = kreis.mitglieder.find((x) => x.email === an);
    if (!m) {
      return NextResponse.json(
        {
          ok: false,
          error: `${an} steht nicht im Whop-Umzug (profiles.whop_umzug_am ist leer). Erst importieren, dann testen.`,
        },
        { status: 404 },
      );
    }
    const stufe = gewuenschteStufe ?? m.faellig ?? "ankuendigung";
    const link = abmeldeUrl({ userId: m.userId, email: m.email });
    let mail: ZeileErgebnis["mail"] = "gesendet";
    let detail: string | undefined;
    try {
      await sendeMail(stufe, m, link, body.replyTo);
    } catch (err) {
      mail = "fehler";
      detail = (err as Error).message;
    }
    const text = dmText(stufe, m, appUrl);
    const dm: ZeileErgebnis["dm"] =
      text && m.discordId && !m.dmWiderspruch && !m.werbeWiderspruch
        ? (await sendeDirektnachricht(m.discordId, text))
          ? "gesendet"
          : "fehler"
        : "uebersprungen";
    return NextResponse.json({ ok: mail === "gesendet", einzeln: true, email: an, stufe, mail, dm, detail });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 100);

  /*
    Ohne `stufe` bekommt jeder die Stufe, die bei ihm ansteht — ein Aufruf für
    die ganze Kampagne. Mit `stufe` nur die, bei denen genau diese fällig ist;
    so lässt sich eine Welle einzeln fahren und kontrollieren.
  */
  const dran = kreis.mitglieder
    .filter((m) => m.faellig !== null && (gewuenschteStufe === undefined || m.faellig === gewuenschteStufe))
    .slice(0, limit);

  const ergebnisse: ZeileErgebnis[] = [];

  for (const [i, m] of dran.entries()) {
    const stufe = m.faellig as WhopUmzugStufe;
    const link = abmeldeUrl({ userId: m.userId, email: m.email });

    let mail: ZeileErgebnis["mail"] = "gesendet";
    let detail: string | undefined;
    let resendId: string | null = null;
    try {
      const res = await sendeMail(stufe, m, link, body.replyTo);
      resendId = res.resendId;
    } catch (err) {
      mail = "fehler";
      detail = (err as Error).message;
    }

    // Die Direktnachricht läuft auch, wenn die Mail scheiterte: zwei unabhängige Wege.
    let dm: ZeileErgebnis["dm"] = "uebersprungen";
    const text = dmText(stufe, m, appUrl);
    if (text && m.discordId && !m.dmWiderspruch && !m.werbeWiderspruch) {
      dm = (await sendeDirektnachricht(m.discordId, text)) ? "gesendet" : "fehler";
      await schlafen(DM_PAUSE_MS);
    }

    /*
      Vermerken, sobald überhaupt etwas rausging. Scheitert der Eintrag,
      bekommt der Empfänger beim nächsten Lauf dieselbe Stufe erneut — doppelt
      ist hier das kleinere Übel gegenüber einer still übersprungenen halben
      Liste.
    */
    if (mail === "gesendet" || dm === "gesendet") {
      const { error: merkFehler } = await supabase.from("kampagne_versand").insert({
        kampagne: WHOP_UMZUG_KAMPAGNE,
        stufe,
        email: m.email,
        user_id: m.userId,
        mail_gesendet: mail === "gesendet",
        dm_gesendet: dm === "gesendet",
        resend_message_id: resendId,
      });
      if (merkFehler) detail = `${detail ? `${detail}; ` : ""}versendet, aber nicht vermerkt: ${merkFehler.message}`;
    }

    ergebnisse.push({ email: m.email, stufe, mail, dm, detail });
    if (i < dran.length - 1) await schlafen(MAIL_PAUSE_MS);
  }

  const offen = kreis.mitglieder.filter(
    (m) => m.faellig !== null && (gewuenschteStufe === undefined || m.faellig === gewuenschteStufe),
  ).length;

  return NextResponse.json({
    ok: ergebnisse.every((r) => r.mail === "gesendet"),
    kampagne: WHOP_UMZUG_KAMPAGNE,
    stufe: gewuenschteStufe ?? "fällige",
    bearbeitet: ergebnisse.length,
    mails: ergebnisse.filter((r) => r.mail === "gesendet").length,
    direktnachrichten: ergebnisse.filter((r) => r.dm === "gesendet").length,
    fehler: ergebnisse.filter((r) => r.mail === "fehler" || r.dm === "fehler").length,
    verbleibend: Math.max(offen - ergebnisse.length, 0),
    zeilen: ergebnisse,
  });
}
