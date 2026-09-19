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
import { KNOPF_ZAHLUNG_ANTWORT, meldeAntwortAnTeam, schreibeKundenAntwort } from "@/lib/zahlung/fall";

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

    return NextResponse.json(nurFuerDich("Diesen Knopf kenne ich nicht."));
  }

  if (interaktion.type === INTERAKTION.FORMULAR_ABGESCHICKT) {
    const customId = interaktion.data?.custom_id ?? "";

    if (customId.startsWith(`${FORMULAR_ZAHLUNG}:`)) {
      return NextResponse.json(
        await zahlungAntwortSchreiben(userId, customId.slice(FORMULAR_ZAHLUNG.length + 1), interaktion),
      );
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
