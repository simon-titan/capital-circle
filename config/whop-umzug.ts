/**
 * Der Whop-Umzug — die letzten zahlenden Mitglieder holen wir selbst.
 *
 * ── Worum es geht ───────────────────────────────────────────────────────────
 *
 * Capital Circle verkauft seit dem 19./20.09.2026 wieder selbst (Stripe,
 * `/go/<plan>`). Auf Whop laufen noch 29 bezahlte Mitgliedschaften. Sie sollen
 * umziehen: **ihr Whop-Abo selbst kündigen** (nur der Abonnent kann das) und
 * bei uns neu abschliessen.
 *
 * Die Zusage, die jede Nachricht dieser Kampagne trägt: **Wer bezahlt hat,
 * behält den Zugang bis zum Ende seines bezahlten Zeitraums.** Technisch ist
 * das `profiles.access_until` aus dem Import
 * (`scripts/whop-umzug-import.mjs`), beendet wird er vom Nachtlauf
 * (`lib/whop-umzug/ablauf.ts`). Niemand verliert etwas, wofür er gezahlt hat —
 * und niemand behält es länger.
 *
 * ── Drei Stufen, zwei Wege ──────────────────────────────────────────────────
 *
 *   ankuendigung  sofort            Mail + Direktnachricht
 *   erinnerung    5 Tage vor Ablauf Mail + Direktnachricht
 *   ende          am Ablauftag      nur Mail
 *
 * Jede Stufe geht **genau einmal** raus; die Merkliste ist `kampagne_versand`
 * (Migration 082) über (Kampagne, Stufe, Adresse). Ausgelöst wird von Hand
 * über `/api/admin/whop-umzug` bzw. `npm run whop:umzug` — die Folgestufen
 * werden vom Nachtlauf **fällig gemeldet**, aber nicht verschickt. Ein Cron,
 * der Kundenpost ohne Auslöser verschickt, ist genau das, was hier niemand
 * will.
 *
 * ── Werbung oder Vertragspost? Beides, und deshalb mit Abmeldelink ──────────
 *
 * Der Kern jeder dieser Mails ist Vertragspost an Bestandskunden: „dein
 * bezahlter Zeitraum endet am <Datum>, dein Abo läuft bei einem Anbieter, den
 * wir nicht mehr benutzen, kündige es dort selbst". Das muss jeden erreichen,
 * auch wen, der Werbung widersprochen hat — sonst endet ein Zugang
 * unangekündigt.
 *
 * Daneben steht in derselben Mail ein Kaufangebot mit Preisen, und **das** ist
 * Werbung. Deshalb:
 *
 *   - **Die Mails gehen an alle** aus dem Import, auch an `unsubscribed_at`.
 *     Sie tragen aber Abmeldelink und den Hinweis nach § 7 Abs. 3 Nr. 4 UWG
 *     (`abmeldeUrl()` → `BaseEmail`), damit der Werbeteil sauber abbestellbar
 *     bleibt.
 *   - **Die Direktnachricht geht nicht an Widersprechende** — weder bei
 *     `discord_dm_widerspruch` noch bei `unsubscribed_at`. Sie ist der zweite,
 *     zusätzliche Weg; die Mail trägt dieselbe Information verlässlich. Wer
 *     widersprochen hat, verliert dadurch keine Information, nur eine
 *     Wiederholung.
 *
 * ── Keine Rabatte ───────────────────────────────────────────────────────────
 *
 * Entscheidung Simon, 19.09.2026, gilt hier weiter: Es gibt keinen
 * Umzugsrabatt und keinen Gutschein. Die Preise in jeder Nachricht sind die
 * normalen aus `config/landing-membership.ts`.
 */

import { preiskarten } from "@/config/landing-membership";
import { LIFETIME_PREIS } from "@/config/lifetime";
import { passwortVergessen, TEAM_POSTFACH } from "@/config/team";

/** Kennung im Versandprotokoll (`kampagne_versand.kampagne`). */
export const WHOP_UMZUG_KAMPAGNE = "whop-umzug-2026-09";

/** Die drei Stufen, in der Reihenfolge, in der sie fällig werden. */
export const WHOP_UMZUG_STUFEN = ["ankuendigung", "erinnerung", "ende"] as const;
export type WhopUmzugStufe = (typeof WHOP_UMZUG_STUFEN)[number];

export function istWhopUmzugStufe(wert: string): wert is WhopUmzugStufe {
  return (WHOP_UMZUG_STUFEN as readonly string[]).includes(wert);
}

/**
 * Wie viele Tage vor dem persönlichen Ablauf die Erinnerung fällig ist.
 *
 * Fünf Tage: lang genug, um das Whop-Abo noch vor der nächsten Abbuchung zu
 * kündigen (Whop bucht am Verlängerungstag), kurz genug, dass der Ablauf
 * greifbar ist. Wessen Zeitraum schon innerhalb dieser Frist endet, wenn die
 * Ankündigung rausgeht, bekommt gar keine Erinnerung mehr — dann steht die
 * Ankündigung ohnehin nur Tage vor dem Ende.
 */
export const ERINNERUNG_VORLAUF_TAGE = 5;

/** Kennzeichnung im Kaufweg, damit die Käufe dieser Kampagne zuordenbar sind. */
export const WHOP_UMZUG_SRC = "whop";

/**
 * Wie vielen der Nachtlauf in einer Nacht höchstens den Zugang beendet.
 *
 * Dieselbe Überlegung wie bei `ROLLENENTZUG_MAX_PRO_NACHT` in
 * `config/discord.ts`: Die Grenze schützt nicht gegen falsche Regeln, sondern
 * gegen falsche Daten. Die 29 Ablauftermine verteilen sich über vier Wochen,
 * der dichteste Tag trägt sechs. Stünden plötzlich fünfzehn zum Ablauf an,
 * wäre das kein Betriebszustand, sondern ein kaputtes `access_until` — dann
 * beendet der Lauf **keinen einzigen** Zugang und meldet es.
 */
export const ABLAUF_MAX_PRO_NACHT = 15;

/** `/go/<plan>?src=whop` — der Kaufweg aus jeder Nachricht dieser Kampagne. */
export function kaufUrl(appUrl: string, plan: string): string {
  return `${appUrl}/go/${plan}?src=${WHOP_UMZUG_SRC}`;
}

/** Ein Datum, wie es in Mail und Direktnachricht steht. Immer deutsche Zeit. */
export function datumLang(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Kurzform für Listen und Protokolle (z. B. „04.10.2026"). */
export function datumKurz(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Die Preiszeilen für Mail und Direktnachricht — aus derselben Quelle wie die
 * Verkaufsseite (`config/landing-membership.ts`). Stünden sie hier noch einmal
 * als Text, wäre eine Preisänderung zwei Dateien weit auseinander, und die
 * Kampagne nennte still den alten Betrag.
 */
export const PREISZEILEN: ReadonlyArray<{ plan: string; text: string }> = preiskarten.map((k) => ({
  plan: k.plan,
  text: `${k.laufzeit}: ${k.preis} ${k.periode}`,
}));

/**
 * Wie man sein Whop-Abo kündigt.
 *
 * **Nur der Abonnent selbst kann das** — wir haben keinen Zugriff auf seinen
 * Whop-Vertrag, und ohne Kündigung bucht Whop am Verlängerungstag erneut ab.
 * Das ist der wichtigste Handlungsschritt der ganzen Kampagne, deshalb steht
 * er als Schrittliste da und nicht als Halbsatz.
 *
 * Der letzte Schritt ist Absicht: Whop ändert seine Oberfläche, ohne uns zu
 * fragen. Ein Weg zu einem Menschen ist billiger als eine Anleitung, die
 * irgendwann nicht mehr stimmt.
 */
export const WHOP_KUENDIGUNG_SCHRITTE: readonly string[] = [
  "Auf whop.com mit demselben Konto anmelden, mit dem du Capital Circle gekauft hast.",
  "Oben rechts auf dein Profilbild, dann auf „Memberships“ (Mitgliedschaften).",
  "Capital Circle auswählen und dort „Cancel membership“ (Mitgliedschaft kündigen) bestätigen.",
];

/** Der Satz danach, in Mail und Direktnachricht gleich. */
export function whopKuendigungHilfe(): string {
  return `Findest du den Punkt nicht, schreib uns kurz an ${TEAM_POSTFACH}. Wir schauen mit dir drauf.`;
}

/**
 * Der Abmeldehinweis unter jeder Direktnachricht.
 *
 * Auch wenn der Kern Vertragspost ist: In derselben Nachricht steht ein
 * Kauf-Link, und wer über diesen Weg angeschrieben wird, muss sehen, wie er
 * ihn zudreht. Derselbe Satz wie in der Rückgewinnung
 * (`config/rueckgewinnung.ts`), damit der Schalter überall gleich heisst.
 */
const DM_ABBESTELLEN =
  "Keine Direktnachrichten mehr? Die schaltest du unter Einstellungen → Profil ab. Die wichtigen Mails zum Umzug bekommst du weiterhin.";

/**
 * Die Direktnachricht zur Ankündigung.
 *
 * Kurz halten: Discord schneidet lange Nachrichten optisch ab, und die
 * ausführliche Fassung steht in der Mail. Was hier zwingend hineingehört, ist
 * das **persönliche Datum** und der **Kauf-Link** — alles andere ist Beiwerk.
 */
export function umzugDirektnachricht1(p: {
  vorname: string | null;
  appUrl: string;
  zugangBis: string;
}): string {
  return [
    `Hey ${p.vorname ?? "du"}, hier ist Capital Circle.`,
    "",
    "Kurz und wichtig: Wir sind von Whop auf unsere eigene Plattform umgezogen. Für dich ändert sich dadurch nichts an den Inhalten, aber dein Abo läuft noch bei Whop, und dort läuft es nicht weiter.",
    "",
    `**Dein Zugang bei uns bleibt bis zum ${datumLang(p.zugangBis)}.** Bis dahin hast du alles wie bisher: Institut, Discord, dein Fortschritt.`,
    "",
    "Zwei Dinge sind zu tun:",
    "1. Dein Whop-Abo selbst kündigen, sonst bucht Whop weiter ab. Wie das geht, steht in der Mail, die du gerade bekommen hast.",
    "2. Bei uns neu abschliessen, wann du möchtest:",
    kaufUrl(p.appUrl, "monthly"),
    "",
    `Dein Konto liegt schon bereit, mit derselben E-Mail. ${passwortVergessen(p.appUrl)}`,
    "",
    `Fragen? Antworte hier nicht, der Bot liest das nicht. Schreib uns an ${TEAM_POSTFACH}.`,
    "",
    DM_ABBESTELLEN,
  ].join("\n");
}

/**
 * Die Direktnachricht zur Erinnerung. Noch kürzer: Wer sie bekommt, kennt die
 * Sache schon und braucht nur das Datum und den Link.
 */
export function umzugDirektnachricht2(p: {
  vorname: string | null;
  appUrl: string;
  zugangBis: string;
  tageRest: number;
}): string {
  const rest =
    p.tageRest <= 0
      ? "heute"
      : p.tageRest === 1
        ? "morgen"
        : `in ${p.tageRest} Tagen`;
  return [
    `Hey ${p.vorname ?? "du"}, kurze Erinnerung von Capital Circle.`,
    "",
    `Dein bezahlter Zeitraum endet ${rest}, am ${datumLang(p.zugangBis)}. Danach ruht dein Zugang: Institut und Mitgliederkanäle sind dann zu, dein Konto und dein Fortschritt bleiben gespeichert.`,
    "",
    "Wenn du dabeibleiben möchtest, schliesst du hier neu ab:",
    kaufUrl(p.appUrl, "monthly"),
    "",
    `Und denk bitte ans Kündigen bei Whop, falls noch nicht geschehen. Sonst bucht Whop am ${datumKurz(p.zugangBis)} erneut ab. ${whopKuendigungHilfe()}`,
    "",
    `Lieber einmalig statt monatlich? Lifetime kostet ${LIFETIME_PREIS}, einmalig. Die Karte dazu findest du nach dem Anmelden unter Einstellungen → Abonnement.`,
    "",
    DM_ABBESTELLEN,
  ].join("\n");
}
