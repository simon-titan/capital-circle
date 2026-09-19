import { after, NextResponse } from "next/server";
import { findeNutzerZuDiscordId } from "@/lib/discord/konto";
import {
  ANTWORT,
  INTERAKTION,
  discordIdVon,
  feldWert,
  formular,
  interaktionenKonfiguriert,
  nurFuerDich,
  signaturGueltig,
  type Interaktion,
} from "@/lib/discord/interaktionen";
import { hilfeWeg } from "@/config/team";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";
import {
  juengsterFall,
  KNOPF_ZAHLUNG_ANTWORT,
  KNOPF_ZAHLUNG_MELDEN,
  meldeAntwortAnTeam,
  schreibeKundenAntwort,
} from "@/lib/zahlung/fall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Discord-Interaktionen: der Rückweg aus Discord in die Plattform.
 *
 * Eingetragen im Developer Portal unter *General Information → Interactions
 * Endpoint URL* als `https://www.capitalcircletrading.com/api/discord/interactions`
 * — **erst nach dem Deploy**: Discord prüft die Adresse beim Speichern sofort
 * mit einem PING und nimmt sie nur, wenn korrekt geantwortet wird.
 *
 * ── Was hier passiert, und was ausdrücklich nicht ───────────────────────────
 *
 * Ein Mitglied drückt einen Knopf (unter einer Direktnachricht oder unter der
 * Erklärung im Warteraum), füllt ein Formular aus, und der Text landet in der
 * Plattform. **Beantwortet wird ausschliesslich auf der Plattform**, in der
 * Fallakte im Adminbereich. Frei getippte Direktnachrichten kann der Bot nicht
 * lesen (dafür bräuchte es das privilegierte Message-Content-Intent und einen
 * Dauerprozess) — der Knopf ist der einzige Rückweg, und die Nachrichten sagen
 * das auch.
 *
 * ── Die Reihenfolge ist die Sicherheit ──────────────────────────────────────
 *
 * 1. Rohen Körper lesen (**nicht** `request.json()`, siehe `interaktionen.ts`).
 * 2. Signatur prüfen. Ohne `DISCORD_PUBLIC_KEY` wird nichts angenommen
 *    (fail-closed).
 * 3. Erst danach überhaupt parsen.
 *
 * ── Drei Sekunden ───────────────────────────────────────────────────────────
 *
 * Discord verwirft eine Interaktion, die nicht binnen drei Sekunden beantwortet
 * ist. Jeder Zweig kommt mit wenigen Datenbankabfragen aus; alles Langsame
 * (die Mail ans Team) läuft über `after()` nach der Antwort.
 */

/** Das Formular zu einem Zahlungsfall. Die Fall-ID steckt in der `custom_id`. */
const FORMULAR_ZAHLUNG = "zahlung_text";

/** Das Formular für ein Anliegen ohne Zahlungsfall (wird ein Support-Ticket). */
const FORMULAR_ANLIEGEN = "anliegen_neu";

/** Wie lang eine Antwort sein darf. Discord nimmt in einer Nachricht 2000 Zeichen. */
const ANTWORT_MAX = 1800;

export async function POST(request: Request) {
  if (!interaktionenKonfiguriert()) {
    // Fail-closed: Ohne Schlüssel lässt sich nichts prüfen, also wird nichts
    // angenommen. Ein offener Endpunkt wäre die schlechtere Antwort auf eine
    // fehlende Einrichtung.
    console.warn("[discord] Interaktion abgewiesen: DISCORD_PUBLIC_KEY fehlt.");
    return new NextResponse("nicht eingerichtet", { status: 401 });
  }

  const koerper = await request.text();

  if (
    !signaturGueltig({
      koerper,
      signatur: request.headers.get("x-signature-ed25519"),
      zeitstempel: request.headers.get("x-signature-timestamp"),
    })
  ) {
    return new NextResponse("ungültige Signatur", { status: 401 });
  }

  let interaktion: Interaktion;
  try {
    interaktion = JSON.parse(koerper) as Interaktion;
  } catch {
    return new NextResponse("kein gültiger Körper", { status: 400 });
  }

  /*
    Discord prüft die Endpunkt-URL beim Eintragen mit einem PING. Ohne diesen
    Zweig lässt sich die Adresse im Developer Portal gar nicht sichern.
  */
  if (interaktion.type === INTERAKTION.PING) {
    return NextResponse.json({ type: ANTWORT.PONG });
  }

  const discordId = discordIdVon(interaktion);
  if (!discordId) return NextResponse.json(nurFuerDich("Ich konnte dein Konto nicht erkennen."));

  const supabase = createServiceClient();
  const userId = await findeNutzerZuDiscordId(supabase, discordId);
  if (!userId) return NextResponse.json(nurFuerDich(nichtVerknuepft()));

  if (interaktion.type === INTERAKTION.BAUSTEIN) {
    const customId = interaktion.data?.custom_id ?? "";

    // Der Knopf unter einer Direktnachricht zum Zahlungsfall.
    if (customId.startsWith(`${KNOPF_ZAHLUNG_ANTWORT}:`)) {
      return NextResponse.json(zahlungFormular(customId.slice(KNOPF_ZAHLUNG_ANTWORT.length + 1)));
    }

    /*
      Der Knopf unter der angepinnten Erklärung im Warteraum. Er trägt keine
      Fall-ID — die Nachricht im Kanal ist für alle dieselbe —, der Fall wird
      hier gesucht, mit genau einer Abfrage.

      Kein Zahlungsfall ist im Warteraum der Normalfall, seit auch Gekündigte
      dort sitzen. Sie bekommen das Formular für ein Support-Ticket (Kategorie
      Abrechnung): Eine Mahnung eröffnen wir, weil wir etwas wollen; wer
      gekündigt hat und sich meldet, will selbst etwas, und das ist Support.
    */
    if (customId === KNOPF_ZAHLUNG_MELDEN) {
      const fallId = await juengsterFall(supabase, userId);
      return NextResponse.json(fallId ? zahlungFormular(fallId) : anliegenFormular());
    }

    return NextResponse.json(nurFuerDich("Diesen Knopf kenne ich nicht."));
  }

  if (interaktion.type === INTERAKTION.FORMULAR_ABGESCHICKT) {
    const customId = interaktion.data?.custom_id ?? "";

    if (customId.startsWith(`${FORMULAR_ZAHLUNG}:`)) {
      return NextResponse.json(
        await zahlungAntwortSchreiben(userId, customId.slice(FORMULAR_ZAHLUNG.length + 1), interaktion),
      );
    }

    if (customId === FORMULAR_ANLIEGEN) {
      return NextResponse.json(await anliegenAnlegen(userId, interaktion));
    }
  }

  return NextResponse.json(nurFuerDich("Damit kann ich nichts anfangen."));
}

/** Das Formular zu einem Zahlungsfall — eine Fassung für beide Knöpfe. */
function zahlungFormular(fallId: string) {
  return formular({
    customId: `${FORMULAR_ZAHLUNG}:${fallId}`,
    titel: "Zu deiner Zahlung",
    felder: [
      {
        customId: "text",
        label: "Was ist los?",
        lang: true,
        maxLaenge: ANTWORT_MAX,
        platzhalter: "Schreib uns kurz, was gerade nicht passt.",
      },
    ],
  });
}

/** Betreff kurz, Beschreibung lang. Wird ein Support-Ticket der Kategorie Abrechnung. */
function anliegenFormular() {
  return formular({
    customId: FORMULAR_ANLIEGEN,
    titel: "Anliegen klären",
    felder: [
      { customId: "betreff", label: "Worum geht es?", maxLaenge: 120, platzhalter: "Kurz in einem Satz" },
      { customId: "text", label: "Beschreibung", lang: true, maxLaenge: 4000 },
    ],
  });
}

/**
 * Ein Support-Ticket aus dem Warteraum anlegen — dieselben Tabellen wie
 * `/api/support/tickets`, nur über den Service-Client, weil hier keine
 * Sitzung davorsitzt. Das Konto kommt aus der Discord-Verknüpfung, nie aus
 * dem Anfragekörper. Beantwortet wird es wie jedes Ticket unter
 * `/admin/tickets`, der Kunde sieht es unter `/support`.
 */
async function anliegenAnlegen(userId: string, interaktion: Interaktion) {
  const betreff = feldWert(interaktion, "betreff").trim().slice(0, 120);
  const text = feldWert(interaktion, "text").trim().slice(0, 4000);
  if (betreff.length < 3 || text.length < 5) {
    return nurFuerDich("Betreff und Beschreibung dürfen nicht leer sein.");
  }

  const supabase = createServiceClient();
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: userId, subject: betreff, category: "billing" })
    .select("id")
    .single();

  if (error || !ticket) {
    console.warn("[discord] Ticket aus dem Warteraum nicht anlegbar:", error?.message);
    return nurFuerDich(`Das hat gerade nicht geklappt. Bitte melde dich ${hilfeWeg(getAppUrl())}.`);
  }

  const { error: nachrichtFehler } = await supabase.from("support_ticket_messages").insert({
    ticket_id: (ticket as { id: string }).id,
    sender_type: "user",
    sender_id: userId,
    body: text,
  });
  if (nachrichtFehler) console.warn("[discord] Ticket-Nachricht nicht speicherbar:", nachrichtFehler.message);

  return nurFuerDich(
    [
      `**Angekommen:** ${betreff}`,
      "",
      `Wir melden uns bei dir. Den Verlauf findest du nach dem Anmelden unter ${getAppUrl()}/support/${(ticket as { id: string }).id}`,
    ].join("\n"),
  );
}

/**
 * Die Antwort auf einen Zahlungsfall.
 *
 * Die Fall-Nummer aus der `custom_id` ist kein Berechtigungsnachweis:
 * `schreibeKundenAntwort` verlangt, dass der Fall diesem Konto gehört.
 *
 * Hier steht bewusst **kein** Link auf einen Vorgang — einen Zahlungsfall kann
 * der Kunde nirgends öffnen (im Verlauf stehen interne Notizen). Und keine
 * Zusage: Ob gestundet wird, entscheidet ein Mensch, nachdem er das gelesen
 * hat. Die Meldung ans Team läuft nach der Antwort über `after()`.
 */
async function zahlungAntwortSchreiben(userId: string, fallId: string, interaktion: Interaktion) {
  const supabase = createServiceClient();
  const text = feldWert(interaktion, "text");
  const ergebnis = await schreibeKundenAntwort(supabase, { userId, fallId, text });

  if (!ergebnis.ok) {
    if (ergebnis.fehler === "nicht_gefunden") return nurFuerDich("Diesen Vorgang finde ich nicht bei dir.");
    if (ergebnis.fehler === "leer") return nurFuerDich("Da stand nichts drin.");
    return nurFuerDich(`Das hat gerade nicht geklappt. Bitte melde dich ${hilfeWeg(getAppUrl())}.`);
  }

  after(() => meldeAntwortAnTeam(createServiceClient(), { fallId, userId, text }));

  return nurFuerDich(
    [
      "**Angekommen.** Wir lesen das und melden uns bei dir, per Mail und hier.",
      "",
      `Falls du in der Zwischenzeit zahlen möchtest: ${getAppUrl()}/einstellungen/abonnement`,
    ].join("\n"),
  );
}

/** Kein Konto zu dieser Discord-Kennung: Der Weg ist die Verknüpfung. */
function nichtVerknuepft(): string {
  return [
    "Dein Discord-Konto ist noch nicht mit deinem Capital-Circle-Zugang verknüpft, deshalb kann ich dein Anliegen niemandem zuordnen.",
    "",
    `Verknüpfen kannst du es nach dem Anmelden unter Einstellungen → Profil: ${getAppUrl()}/einstellungen/profil`,
    "",
    `Ohne Discord erreichst du uns ${hilfeWeg(getAppUrl())}.`,
  ].join("\n");
}
