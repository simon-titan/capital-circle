/**
 * Die Stellschrauben von Warteraum und Rauswurf.
 *
 * Übernommen aus MoonTrading. Inhalte gehören nach `config/`, und hier wiegt
 * das schwerer als sonst: An diesen Listen hängt, **wer vom Server fliegt und
 * wer nicht**. Eine Namensliste mitten in einer Funktion findet niemand mehr,
 * der sie prüfen will.
 */

import { lifetimeHinweis } from "@/config/lifetime";
import { hilfeWeg, passwortVergessen } from "@/config/team";

/**
 * Rollen, deren Träger nie vom Server entfernt werden, unabhängig von allem
 * anderen.
 *
 * ── Warum über den Namen und nicht über die ID ─────────────────────────────
 *
 * Die Mitgliederrolle steht als ID in der Umgebung, weil das System sie setzt
 * und entzieht. Diese hier werden auf dem Server angelegt und umbenannt, ohne
 * dass jemand eine Umgebungsvariable nachzieht. Ein Name lässt sich auf dem
 * Bildschirm gegen die tatsächliche Rollenliste halten, und genau das tun
 * `npm run discord:check` und der Rauswurf-Lauf selbst: **Fehlt einer dieser
 * Namen auf dem Server, entfernt der Lauf niemanden**, bis die Liste wieder
 * stimmt. Ein umbenanntes „ADMIN" schützt sonst lautlos niemanden mehr.
 *
 * ── Der Stand am 19.09.2026 (gelesen, nicht geraten) ───────────────────────
 *
 * Auf dem Server stehen: CEO, ADMIN, CC Mod, CC Elite, CC OG (= die
 * Mitgliederrolle `DISCORD_ROLE_ID`), CC Member, Capital Circle Free Member,
 * dazu Bot-Rollen. Geschützt sind:
 *
 * - **CEO, ADMIN, CC Mod** — das Team. Discord schützt CEO und ADMIN
 *   zusätzlich über die Rollenhierarchie, CC Mod steht unter dem Bot.
 * - **CC Elite** — eine Sonderstufe, über die dieser Code nichts weiss.
 * - **CC Member** — vergeben nicht von unserem Bot, vermutlich über Whop (der
 *   Whop-Bot steht ganz oben in der Rollenliste). Wer darüber zahlt, zahlt
 *   nicht über Stripe, und ein abgelaufenes Plattformkonto hiesse bei ihm
 *   nichts. Lieber einmal zu viel geschützt als einen Whop-Zahler entfernt.
 *
 * Bewusst **nicht** geschützt ist „Capital Circle Free Member": Sonst würde
 * praktisch niemand je entfernt. Wer nach dem Rauswurf über den Discord-Funnel
 * wiederkommt, trägt weder Mitglieder- noch Warteraumrolle und wird deshalb
 * kein zweites Mal fällig (siehe `lib/discord/aufraeumen.ts`).
 */
export const SCHUTZROLLEN = ["CEO", "ADMIN", "CC Mod", "CC Elite", "CC Member"] as const;

/**
 * Wie lange jemand nach dem Ende seines Zugangs auf dem Server bleibt, bevor er
 * entfernt wird. Entscheidung Simon, 19.09.2026: dreissig Tage, wie im
 * Schwesterprojekt.
 *
 * Ein Monat ist lang genug, dass jemand mit einer neuen Karte zurückkommt, ohne
 * seine Kanäle je verloren zu haben, und kurz genug, dass der Server nicht mit
 * Karteileichen volläuft.
 *
 * ── Gemessen wird ab `profiles.access_until` ────────────────────────────────
 *
 * Diese Spalte setzt jede Stelle, die den Zugang beendet: `subscription.deleted`,
 * der Ablauf eines Aufschubs, der siebte Tag eines Zahlungsfalls, das Ende
 * einer Pause. Fehlt sie, gibt es keine Fälligkeit, und niemand wird entfernt.
 * Das ist die vorsichtige Richtung.
 */
export const KARENZ_TAGE = 30;

/**
 * Wie viele in einer Nacht höchstens entfernt werden.
 *
 * Die Grenze schützt nicht gegen falsche Regeln, sondern gegen falsche
 * **Daten**: Kommt eine Abfrage leer zurück, sähe plötzlich jeder aus wie
 * ausgelaufen. Wird sie überschritten, entfernt der Lauf **niemanden** und
 * meldet es. Ein halber Rauswurf wäre die schlechteste aller Antworten.
 */
export const ENTFERNEN_MAX_PRO_NACHT = 15;

/**
 * Wie vielen der Nachtlauf in einer Nacht höchstens die Mitgliederrolle nimmt.
 *
 * Dieselbe Überlegung wie beim Rauswurf, eine Stufe milder: Ein Rollenentzug
 * ist umkehrbar, aber vierzig auf einmal sind kein Betriebszustand, sondern
 * ein Datenfehler (etwa ein leeres `access_until` im Bestand). Über der
 * Grenze entzieht der Lauf niemandem etwas und meldet es; das Zurückgeben an
 * Zahler läuft davon unberührt weiter.
 */
export const ROLLENENTZUG_MAX_PRO_NACHT = 25;

/**
 * Was jemand als Direktnachricht bekommt, bevor er nach der Karenz vom Server
 * entfernt wird.
 *
 * ── Warum sie vor dem Rauswurf rausgeht ────────────────────────────────────
 *
 * Danach ginge sie nicht mehr: Ein Bot kann jemandem, mit dem er keinen
 * gemeinsamen Server mehr teilt, keine Direktnachricht schicken.
 *
 * ── Der Ton ─────────────────────────────────────────────────────────────────
 *
 * Kein Vorwurf und keine Rechtfertigung. Er weiss, was passiert ist; was er
 * nicht weiss, ist, dass er jederzeit zurückkommen kann, und das ist der Satz,
 * auf den es ankommt. Dazu der Lifetime-Hinweis (Entscheidung 19.09.2026),
 * aber nur, wenn die Person Werbung nicht widersprochen hat.
 */
export function abschiedNachKarenz(p: {
  appUrl: string;
  tage: number;
  mitLifetime: boolean;
}): string {
  return [
    "Hallo, hier ist der Capital Circle Bot.",
    "",
    `Deine Mitgliedschaft ist vor mehr als ${p.tage} Tagen ausgelaufen. Wir räumen den Server regelmässig auf, deshalb nehmen wir dich jetzt heraus.`,
    "",
    `Das ist kein Abschied für immer: Dein Konto, dein Journal und dein Fortschritt bleiben gespeichert, und du kannst jederzeit wieder einsteigen. Nach dem Anmelden unter Einstellungen → Abonnement: ${p.appUrl}/einstellungen/abonnement (${passwortVergessen(p.appUrl)})`,
    ...(p.mitLifetime ? ["", lifetimeHinweis(p.appUrl)] : []),
    "",
    `Wenn das ein Irrtum ist und du bezahlt hast, melde dich bitte kurz ${hilfeWeg(p.appUrl)}.`,
  ].join("\n");
}
