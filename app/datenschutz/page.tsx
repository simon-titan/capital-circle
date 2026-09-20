import type { Metadata } from "next";
import Link from "next/link";
import { RechtstextSeite } from "@/components/legal/RechtstextSeite";
import { anbieter, anbieterAnschriftZeilen, aufsichtsbehoerde, rechtsPfade } from "@/config/legal";

export const metadata: Metadata = {
  title: "Datenschutzerklärung · Capital Circle",
  description: "Welche Daten Capital Circle verarbeitet, wofür, auf welcher Grundlage, und welche Rechte du hast.",
};

/**
 * Datenschutzerklärung (`/datenschutz`).
 *
 * ── Grundlage ist der Code, nicht ein Generator ────────────────────────────
 * Jeder Abschnitt beschreibt einen Dienst oder eine Verarbeitung, die im Code
 * tatsächlich steckt (Inventur vom 19.09.2026). Was eingebaut, aber nicht
 * eingeschaltet ist, steht hier bewusst **nicht**:
 *   - Cloudflare Turnstile (`TURNSTILE_*` leer),
 *   - Slack-Benachrichtigungen (`SLACK_WEBHOOK_URL` leer),
 *   - Upstash (nur leere Variablen, kein Code),
 *   - Öffnungs-/Klickverfolgung in Resend (in der Resend-Domain aus; der
 *     Webhook `app/api/resend/webhook` würde sie speichern, sobald sie an ist).
 * Wer einen davon einschaltet oder einen neuen Dienst einbaut, ergänzt hier
 * den Abschnitt und erhöht `rechtstexteVersion` in `config/legal.ts`.
 *
 * Abschnitte, die an einer bestimmten Stelle im Code hängen, nennen sie im
 * Kommentar darüber — fällt die Stelle weg, fällt der Abschnitt mit.
 */
export default function DatenschutzPage() {
  return (
    <RechtstextSeite
      titel="Datenschutzerklärung"
      einleitung="Welche personenbezogenen Daten wir verarbeiten, wenn du unsere Website und die Plattform nutzt, wofür, auf welcher Grundlage, und welche Rechte du hast."
    >
      <ul className="rt-inhalt">
        <li><a href="#verantwortlicher">1. Verantwortlicher</a></li>
        <li><a href="#grundlagen">2. Rechtsgrundlagen im Überblick</a></li>
        <li><a href="#hosting">3. Hosting und Server-Protokolle</a></li>
        <li><a href="#konto">4. Konto und Anmeldung</a></li>
        <li><a href="#zahlung">5. Kauf, Zahlung, Kündigung und Widerruf</a></li>
        <li><a href="#videos">6. Videos und Livestreams</a></li>
        <li><a href="#dateien">7. Hochgeladene Dateien</a></li>
        <li><a href="#journal">8. Trading Journal</a></li>
        <li><a href="#discord">9. Community auf Discord</a></li>
        <li><a href="#beitraege">10. Kommentare, Support und veröffentlichte Nachweise</a></li>
        <li><a href="#bewerbungen">11. Bewerbungen, Anfragen und Terminbuchung</a></li>
        <li><a href="#telegram">12. Telegram-Bot</a></li>
        <li><a href="#messung">13. Auswertung unserer Werbeseiten</a></li>
        <li><a href="#emails">14. E-Mails</a></li>
        <li><a href="#speicher">15. Cookies und Speicher im Browser</a></li>
        <li><a href="#drittland">16. Empfänger und Übermittlung in Drittländer</a></li>
        <li><a href="#dauer">17. Speicherdauer</a></li>
        <li><a href="#rechte">18. Deine Rechte</a></li>
        <li><a href="#sonstiges">19. Sonstiges</a></li>
      </ul>

      <h2 id="verantwortlicher">1. Verantwortlicher</h2>
      <address>
        {anbieter.name} ({anbieter.rechtsform}), handelnd unter „{anbieter.marke}“
        <br />
        {anbieterAnschriftZeilen().map((zeile) => (
          <span key={zeile}>
            {zeile}
            <br />
          </span>
        ))}
        E-Mail: <a href={`mailto:${anbieter.email}`}>{anbieter.email}</a>
        {anbieter.telefon ? (
          <>
            <br />
            Telefon: {anbieter.telefon}
          </>
        ) : null}
      </address>
      <p>Für alle Fragen zum Datenschutz und zur Ausübung deiner Rechte erreichst du uns unter dieser Adresse.</p>

      <h2 id="grundlagen">2. Rechtsgrundlagen im Überblick</h2>
      <ul>
        <li><strong>Art. 6 Abs. 1 lit. a DSGVO</strong>: deine Einwilligung;</li>
        <li><strong>Art. 6 Abs. 1 lit. b DSGVO</strong>: Erfüllung eines Vertrags mit dir oder vorvertragliche Maßnahmen auf deine Anfrage;</li>
        <li><strong>Art. 6 Abs. 1 lit. c DSGVO</strong>: rechtliche Pflichten, etwa steuer- und handelsrechtliche Aufbewahrung;</li>
        <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong>: unsere berechtigten Interessen, die wir jeweils nennen.</li>
      </ul>
      <p>
        Für das Speichern von Informationen in deinem Browser und das Auslesen daraus gilt zusätzlich § 25 des
        Telekommunikation-Digitale-Dienste-Datenschutz-Gesetzes (TDDDG).
      </p>

      {/* Hosting: Vercel (Deployment, Funktionen, Cronjobs — `vercel.json`). */}
      <h2 id="hosting">3. Hosting und Server-Protokolle</h2>
      <p>
        Website und Plattform laufen bei Vercel Inc. (USA). Bei jedem Aufruf verarbeitet Vercel die technisch nötigen
        Angaben: IP-Adresse, Datum und Uhrzeit, die aufgerufene Adresse, die übertragene Datenmenge, Browser und
        Betriebssystem sowie die zuvor besuchte Seite. Das ist nötig, um die Seiten auszuliefern, Fehler zu finden und
        Angriffe abzuwehren (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO). Vercel ist für uns als
        Auftragsverarbeiter tätig; die Verarbeitung kann auch in den USA stattfinden (siehe{" "}
        <a href="#drittland">Abschnitt 16</a>).
      </p>
      {/* Schrift: next/font (`app/fonts.ts`) liefert Inter von der eigenen Domain;
          die Mails nutzen Systemschriften. Kein Google Fonts mehr. */}
      <p>
        Auch die Schriftart unserer Seiten liefern wir auf diesem Weg selbst aus. Dein Browser stellt dafür keine
        Verbindung zu Google oder einem anderen Schriftenanbieter her; unsere E-Mails verwenden die Schriften deines
        Geräts.
      </p>

      {/* Supabase: Datenbank und Anmeldung (`lib/supabase/*`). */}
      <h2 id="konto">4. Konto und Anmeldung</h2>
      <p>
        Für den Mitgliederbereich brauchst du ein Konto. Dafür verarbeiten wir deine E-Mail-Adresse, dein Passwort
        (gespeichert nur als verschlüsselter Hashwert), deinen Namen, auf Wunsch einen Benutzernamen und ein
        Profilbild, deinen Mitgliedsstatus, deine Zustimmung zu Codex und Nutzungsvereinbarung mit Zeitpunkt, den
        Zeitpunkt deiner letzten Anmeldung sowie deinen Lernfortschritt (angesehene Videos, Lernzeit, aktive Tage).
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <p>
        Datenbank und Anmeldung betreibt für uns Supabase, Inc. (USA) als Auftragsverarbeiter. Damit du angemeldet
        bleibst, setzen wir ein Anmelde-Cookie (siehe <a href="#speicher">Abschnitt 15</a>). Den Zeitpunkt der letzten
        Anmeldung nutzen wir auch, um dich zu erinnern, wenn du länger nicht da warst (siehe{" "}
        <a href="#emails">Abschnitt 14</a>).
      </p>

      {/* Stripe: gehostete Kasse (`app/go/[plan]`), eingebettete Kasse
          (`app/api/stripe/create-checkout-session`, Stripe.js nur auf /checkout),
          Kundenportal, Rechnungen, Webhooks. Trichter: Tabelle `checkout_sessions`,
          Cookie `cc_checkout` (`lib/checkout/cookie.ts`). */}
      <h2 id="zahlung">5. Kauf, Zahlung, Kündigung und Widerruf</h2>
      <p>
        Bezahlt wird über Stripe (Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin,
        Irland). In der Kasse von Stripe gibst du deine E-Mail-Adresse, deine Zahlungsdaten und, soweit abgefragt,
        deine Rechnungsanschrift ein. Stripe übermittelt uns E-Mail-Adresse, Name, Anschrift soweit angegeben, die
        gewählte Mitgliedschaft, den Zahlungsstatus und die Rechnungen; deine vollständigen Karten- oder Kontodaten
        erhalten wir nicht. Stripe verarbeitet Daten teilweise in eigener Verantwortung, etwa zur Betrugsprävention
        und zur Erfüllung gesetzlicher Pflichten; dafür gilt die{" "}
        <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Stripe
        </a>
        . In der Kasse setzt Stripe eigene Cookies, die für Zahlung und Betrugsprävention nötig sind.
      </p>
      <p>
        Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. c (steuer- und handelsrechtliche
        Aufbewahrung). Deine Zustimmung zu AGB und sofortigem Leistungsbeginn in der Kasse speichert Stripe mit der
        Bestellung; wir halten zusätzlich fest, dass und wann du zugestimmt hast und welcher Stand unserer
        Rechtstexte beim Kauf galt, um das später belegen zu können (Art. 6 Abs. 1 lit. f DSGVO).
      </p>
      <p>
        Für jede geöffnete Kasse halten wir außerdem den gewählten Plan, eine Kennzeichnung der Quelle, die Seite, von
        der aus die Kasse geöffnet wurde, gegebenenfalls deine Nutzer-ID und den Stand des Kaufvorgangs fest. Für zwei
        Stunden setzen wir dazu das Cookie <code>cc_checkout</code>, damit wir dich nach einem Abbruch an die richtige
        Stelle zurückleiten können. Zweck ist, den Kaufweg zu verbessern und zu erkennen, wo er abbricht (Art. 6 Abs. 1
        lit. f DSGVO).
      </p>
      <p>
        Wenn du kündigst, kannst du freiwillig einen Grund angeben. Wir speichern ihn, um unser Angebot zu verbessern,
        und übermitteln ihn als Notiz zur Kündigung auch an Stripe (Art. 6 Abs. 1 lit. f DSGVO).
      </p>
      {/* Kündigungsbutton (`app/kuendigen`, Tabelle `kuendigungen`) und
          Widerrufsfunktion (`app/widerrufen`, Tabelle `widerrufe`). */}
      <p>
        Kündigst oder widerrufst du über „Verträge hier kündigen“ oder „Vertrag widerrufen“, speichern wir deine
        Erklärung mit Name, E-Mail-Adresse, deinen Angaben zum Vertrag, der Adresse für die Bestätigung und dem
        Zeitpunkt des Eingangs, ordnen sie deinem Konto und Vertrag zu und schicken dir die gesetzlich vorgeschriebene
        Bestätigung per E-Mail (Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit § 312k und § 356a BGB). Zum Schutz vor
        Missbrauch halten wir außerdem einen Hashwert deiner IP-Adresse (nicht die Adresse selbst) und die Kennung
        deines Browsers fest (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      {/* Cloudflare Stream: `lib/cloudflare-stream.ts`, Player, /stream-iframe. */}
      <h2 id="videos">6. Videos und Livestreams</h2>
      <p>
        Videos und Livestreams liefern wir über Cloudflare Stream (Cloudflare, Inc., USA) aus. Beim Abspielen ruft
        dein Browser die Videodaten direkt bei Cloudflare ab; Cloudflare verarbeitet dabei deine IP-Adresse und
        technische Angaben zum Abruf. Kursvideos sind mit zeitlich begrenzten Zugangsschlüsseln geschützt, die keine
        Angaben über dich enthalten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO im Mitgliederbereich und lit. f
        für Videos auf unseren öffentlichen Seiten.
      </p>

      {/* Cloudflare R2, EU-Jurisdiktion (`lib/storage.ts`, R2_ENDPOINT *.eu.*). */}
      <h2 id="dateien">7. Hochgeladene Dateien</h2>
      <p>
        Dateien, die du hochlädst (Profilbild, eingereichte Nachweise, Screenshots im Trading Journal), speichern
        wir bei Cloudflare R2 in einem Speicher mit Datenstandort in der EU. Dein Browser lädt sie über zeitlich
        begrenzte Links direkt von dort. Cloudflare, Inc. ist dabei unser Auftragsverarbeiter; Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <h2 id="journal">8. Trading Journal</h2>
      <p>
        Im Trading Journal speicherst du Handelskonten (Bezeichnung, Broker), importierte oder eingetragene Trades
        (Instrument, Richtung, Menge, Preise, Zeiten, Ergebnis, Gebühren), Notizen, Tags und Screenshots. Wir
        verarbeiten diese Angaben nur, um dir das Journal und seine Auswertung bereitzustellen (Art. 6 Abs. 1 lit. b
        DSGVO).
      </p>

      {/* Discord: OAuth `identify guilds.join` (`app/api/discord/*`,
          `app/api/discord-funnel/*`), Bot vergibt/entzieht Rollen. */}
      <h2 id="discord">9. Community auf Discord</h2>
      <p>
        Unsere Community läuft auf Discord (Discord Inc., USA). Wenn du dein Discord-Konto mit der Plattform
        verbindest, meldest du dich bei Discord an und erlaubst uns, deine Discord-ID und deinen Benutzernamen abzurufen
        und dich unserem Server hinzuzufügen (Berechtigungen „identify“ und „guilds.join“). Wir speichern Discord-ID,
        Benutzernamen und die von Discord dafür ausgestellten Zugangsschlüssel. Unser Bot vergibt damit die
        Mitgliederrolle und entzieht sie, wenn deine Mitgliedschaft endet. Trennst du die Verbindung, entfernen wir
        dich vom Server und löschen die gespeicherten Discord-Angaben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <p>
        Was du auf Discord schreibst und teilst, verarbeitet Discord in eigener Verantwortung; dafür gilt die{" "}
        <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Discord
        </a>
        .
      </p>

      <h2 id="beitraege">10. Kommentare, Support und veröffentlichte Nachweise</h2>
      <p>
        <strong>News:</strong> Kommentare, Likes, gemerkte Beiträge und den Gelesen-Status speichern wir mit deinem
        Konto. Kommentare sehen andere Mitglieder zusammen mit deinem Namen (Art. 6 Abs. 1 lit. b DSGVO).
      </p>
      <p>
        <strong>Support:</strong> Tickets und Nachrichten speichern wir, um dein Anliegen zu bearbeiten; über Antworten
        informieren wir dich per E-Mail (Art. 6 Abs. 1 lit. b DSGVO). Schreibst du uns eine E-Mail, verarbeiten wir sie
        zum selben Zweck.
      </p>
      <p>
        <strong>Nachweise:</strong> Im Mitgliederbereich kannst du Trading-Nachweise mit Bildunterschrift einreichen.
        Unser Team prüft sie. Wenn du es möchtest, erscheint ein freigegebener Nachweis mit deinem Vornamen, dem Bild
        und der Bildunterschrift öffentlich auf der Seite <Link href="/erfolge">Erfolge</Link>. Rechtsgrundlage dafür
        ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit mit Wirkung für die Zukunft widerrufen
        kannst.
      </p>
      <p>
        <strong>Ergebnisse und Bewertungen:</strong> Auf der Seite <Link href="/ergebnisse">Ergebnisse</Link> und auf
        der Verkaufsseite zeigen wir Auszahlungs- und Prüfungsnachweise sowie Bewertungen von Mitgliedern, so wie sie
        uns überlassen wurden, teils mit Namen und Bild. Grundlage ist die Einwilligung der jeweiligen Mitglieder (Art.
        6 Abs. 1 lit. a DSGVO), die sie jederzeit widerrufen können.
      </p>

      {/* Bewerbungen: `app/api/applications/*`, `app/api/ht-applications/*`,
          `app/api/discord-funnel/lead` (IP + User-Agent). Calendly-Widget auf
          /bewerbung/danke, /discord/termin/danke, /termin/danke — erst nach
          Klick (`components/marketing/CalendlyZweiKlick.tsx`); Webhook
          `app/api/integrations/calendly/webhook`. */}
      <h2 id="bewerbungen">11. Bewerbungen, Anfragen und Terminbuchung</h2>
      <p>Je nach Formular verarbeiten wir:</p>
      <ul>
        <li>
          <strong>Kostenloser Einstiegskurs:</strong> Name, E-Mail-Adresse, Passwort für dein Konto und deine Antworten
          zu Erfahrung, größtem Problem und Ziel.
        </li>
        <li>
          <strong>Bewerbung für die Mitgliedschaft:</strong> Vorname und Alter, E-Mail-Adresse, Telefon- bzw.
          WhatsApp-Nummer und deine Antworten zu Trading-Erfahrung, Märkten, Problemen, Zielen, beruflicher Situation,
          Motivation und Budgetrahmen.
        </li>
        <li>
          <strong>Bewerbung für das 1:1-Mentoring:</strong> deine Antworten zu Situation, Zielen, bisherigem Mentoring,
          Motivation und verfügbarer Zeit, deine WhatsApp-Nummer und deinen Budgetrahmen.
        </li>
        <li>
          <strong>Discord- und Termin-Anfragen:</strong> Name, E-Mail-Adresse, Telefonnummer, deine Antworten (unter
          anderem zum Budget und dazu, wie du auf uns aufmerksam wurdest), Kampagnenparameter und die verweisende Seite
          sowie, wenn du dich mit Discord anmeldest, Discord-ID und Benutzername.
        </li>
      </ul>
      <p>
        Wir nutzen diese Angaben, um zu prüfen, ob unser Angebot zu dir passt, um dich zu kontaktieren und um ein
        Gespräch vorzubereiten; zum Gespräch und seinem Ergebnis halten wir interne Notizen fest. Rechtsgrundlage ist
        Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen auf deine Anfrage). Bei der Bewerbung zum
        Einstiegskurs und bei Discord- und Termin-Anfragen speichern wir zusätzlich deine IP-Adresse und die Kennung
        deines Browsers, um Missbrauch und Mehrfacheinträge zu erkennen (Art. 6 Abs. 1 lit. f DSGVO).
      </p>
      <p>
        <strong>Terminbuchung mit Calendly:</strong> Auf den Bestätigungsseiten nach einer Bewerbung oder Anfrage
        kannst du einen Termin über den Buchungskalender von Calendly (Calendly LLC, USA) buchen. Der Kalender wird
        erst geladen, wenn du auf „Termin-Kalender laden“ klickst; vorher stellt dein Browser keine Verbindung zu
        Calendly her. Mit dem Klick willigst du ein, dass der Kalender geladen wird: Dein Browser verbindet sich mit
        Calendly, Calendly verarbeitet dabei deine IP-Adresse und kann Cookies setzen (Art. 6 Abs. 1 lit. a DSGVO,
        § 25 Abs. 1 TDDDG). Du kannst die Einwilligung jederzeit für die Zukunft widerrufen, indem du den Kalender
        nicht erneut lädst und die Cookies von Calendly in deinem Browser löschst. Zum Vorausfüllen übergeben wir
        Vorname und E-Mail-Adresse sowie eine interne Kennung, mit der wir die Buchung deiner Anfrage zuordnen. Nach
        einer Buchung meldet Calendly uns E-Mail-Adresse, Termin und diese Kennung (Art. 6 Abs. 1 lit. b DSGVO). Für
        die Verarbeitung bei Calendly gilt die{" "}
        <a href="https://calendly.com/privacy" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Calendly
        </a>
        .
      </p>

      {/* Telegram: `app/api/telegram/webhook`, Tabelle `telegram_leads`. */}
      <h2 id="telegram">12. Telegram-Bot</h2>
      <p>
        Wenn du unseren Telegram-Bot startest, erhalten wir von Telegram deine Telegram-ID und Chat-ID, deinen
        Benutzernamen, Vor- und Nachnamen, deine Spracheinstellung und den Link, über den du gekommen bist. Wir
        speichern diese Angaben, um dir zu antworten und um zu sehen, über welche Kanäle Interessenten zu uns kommen
        (Art. 6 Abs. 1 lit. b und f DSGVO). Für die Nutzung von Telegram selbst gilt die Datenschutzerklärung von
        Telegram.
      </p>

      {/* Eigene Messung: `app/api/discord-funnel/visit|video`, `app/api/tracking/event`,
          sessionStorage `cc_discord_sid`, `cc_tracking_sid`, `cc_tracking_ref`. */}
      <h2 id="messung">13. Auswertung unserer Werbeseiten</h2>
      <p>
        Wir setzen keine Analyse- oder Werbedienste Dritter ein: kein Google Analytics, keine Werbe-Pixel. Auf einigen
        Werbeseiten messen wir selbst:
      </p>
      <ul>
        <li>
          Beim Aufruf unserer Discord- und Terminseiten speichern wir eine zufällige Sitzungskennung,
          Kampagnenparameter (<code>utm_*</code>) und die verweisende Seite, beim Vorstellungsvideo zusätzlich, wie
          lange und wie weit du es angesehen hast.
        </li>
        <li>Über eigene Tracking-Links zählen wir Aufrufe und Bewerbungen je Link.</li>
      </ul>
      <p>
        Die Sitzungskennung liegt nur für die Dauer des Browser-Tabs im Sitzungsspeicher deines Browsers. IP-Adressen
        speichern wir dabei nicht. Schickst du anschließend ein Formular ab, verknüpfen wir diese Angaben mit deiner
        Anfrage. Zweck ist, die Wirksamkeit unserer Werbung zu messen (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      {/* Resend (EU-Region eu-west-1), Crons in `vercel.json`. */}
      <h2 id="emails">14. E-Mails</h2>
      <p>
        E-Mails versenden wir über Resend (Resend, Inc., USA); der Versand läuft über das Rechenzentrum von Resend in
        Irland. Wir senden dir:
      </p>
      <ul>
        <li>
          E-Mails zu deinem Vertrag und Konto: Bestätigungen, Passwort, Zahlungsprobleme, Antworten des Supports (Art.
          6 Abs. 1 lit. b DSGVO);
        </li>
        <li>
          nach der Anmeldung zum kostenlosen Einstiegskurs die zugehörige Folge von Kurs-E-Mails, die auch auf unsere
          Mitgliedschaft hinweist (Art. 6 Abs. 1 lit. b und f DSGVO);
        </li>
        <li>
          als Kundin oder Kunde Hinweise zu unseren eigenen, ähnlichen Angeboten: Erinnerungen, wenn du länger nicht
          aktiv warst, die Bitte um Feedback und Angebote nach einer Kündigung, Informationen zum 1:1-Mentoring und zu
          Änderungen der Plattform (Art. 6 Abs. 1 lit. f DSGVO in Verbindung mit § 7 Abs. 3 UWG).
        </li>
      </ul>
      {/* Abmeldelink: `lib/email/abmeldung.ts`, Hinweis im Footer von `BaseEmail`. */}
      <p>
        Den E-Mails der letzten beiden Gruppen kannst du jederzeit widersprechen, per E-Mail an{" "}
        <a href={`mailto:${anbieter.email}`}>{anbieter.email}</a> oder über den Abmeldelink, den jede dieser E-Mails
        enthält. Dafür entstehen dir keine anderen als die Übermittlungskosten nach den Basistarifen. Nach einem
        Widerspruch erhältst du nur noch E-Mails zu deinem Vertrag und Konto. Öffnungen und Klicks in unseren E-Mails
        werten wir nicht aus.
      </p>

      <h2 id="speicher">15. Cookies und Speicher im Browser</h2>
      <p>Wir selbst setzen oder lesen im Browser nur Folgendes:</p>
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Zweck</th>
            <th scope="col">Dauer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-…-auth-token</code> (Cookie)</td>
            <td>hält dich angemeldet; technisch notwendig</td>
            <td>bis zur Abmeldung, höchstens 400 Tage</td>
          </tr>
          <tr>
            <td><code>cc_checkout</code> (Cookie)</td>
            <td>ordnet einen Kaufabbruch der geöffneten Kasse zu und leitet dich zurück</td>
            <td>2 Stunden</td>
          </tr>
          <tr>
            <td><code>cc_discord_sid</code>, <code>cc_tracking_sid</code>, <code>cc_tracking_ref</code> (Sitzungsspeicher)</td>
            <td>Auswertung unserer Werbeseiten (Abschnitt 13)</td>
            <td>bis zum Schließen des Tabs</td>
          </tr>
          <tr>
            <td><code>cc:journal:activeAccount</code> (lokaler Speicher)</td>
            <td>merkt sich das zuletzt gewählte Journal-Konto</td>
            <td>bis du ihn löschst</td>
          </tr>
          <tr>
            <td><code>chakra-ui-color-mode</code> (lokaler Speicher)</td>
            <td>Darstellung (Farbschema); technisch notwendig</td>
            <td>bis du ihn löschst</td>
          </tr>
        </tbody>
      </table>
      <p>
        Das Anmelde-Cookie und die technisch notwendigen Einträge sind nach § 25 Abs. 2 Nr. 2 TDDDG ohne Einwilligung
        zulässig. Dazu kommen die Cookies von Stripe in der Kasse (<a href="#zahlung">Abschnitt 5</a>) und von
        Calendly auf den Seiten zur Terminbuchung, sobald du dort den Kalender lädst (
        <a href="#bewerbungen">Abschnitt 11</a>).
      </p>

      <h2 id="drittland">16. Empfänger und Übermittlung in Drittländer</h2>
      <p>
        Wir geben deine Daten nur an die in dieser Erklärung genannten Dienstleister weiter. Als Auftragsverarbeiter
        arbeiten für uns Vercel, Supabase, Cloudflare und Resend; Stripe, Discord und Calendly verarbeiten Daten in
        den genannten Fällen ganz oder teilweise in eigener Verantwortung.
      </p>
      <p>
        Mehrere dieser Anbieter haben ihren Sitz in den USA oder können Daten dort verarbeiten: Vercel, Supabase,
        Cloudflare, Resend, Discord, Calendly und (für einzelne Zwecke) Stripe. Für die USA besteht ein
        Angemessenheitsbeschluss der EU-Kommission (EU-U.S. Data Privacy Framework); auf ihn stützen wir die
        Übermittlung, soweit der jeweilige Anbieter danach zertifiziert ist. Im Übrigen erfolgt die Übermittlung auf
        Grundlage der Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2 lit. c DSGVO).
      </p>

      <h2 id="dauer">17. Speicherdauer</h2>
      <ul>
        <li>Konto, Lernfortschritt, Journal, Kommentare und Tickets speichern wir, solange dein Konto besteht.</li>
        <li>
          Rechnungs- und Buchungsunterlagen bewahren wir so lange auf, wie es das Steuer- und Handelsrecht verlangt, in
          der Regel acht bzw. zehn Jahre (§ 147 AO, § 257 HGB).
        </li>
        <li>
          Angaben aus Bewerbungen, Anfragen und der Auswertung unserer Werbeseiten löschen wir, sobald wir sie für den
          jeweiligen Zweck nicht mehr brauchen oder du der Verarbeitung widersprichst, soweit keine Pflicht zur
          Aufbewahrung besteht.
        </li>
        <li>
          Kündigungs- und Widerrufserklärungen bewahren wir als Nachweis auf, solange aus dem Vertrag noch Ansprüche
          geltend gemacht werden können, in der Regel drei Jahre ab dem Ende des Jahres der Erklärung (§ 195 BGB).
        </li>
        <li>Veröffentlichte Nachweise nehmen wir von der Seite, sobald du deine Einwilligung widerrufst.</li>
        <li>Für Cookies und Browserspeicher gelten die Zeiten aus Abschnitt 15.</li>
      </ul>
      <p>
        Die Löschung deines Kontos kannst du jederzeit per E-Mail an{" "}
        <a href={`mailto:${anbieter.email}`}>{anbieter.email}</a> verlangen.
      </p>

      <h2 id="rechte">18. Deine Rechte</h2>
      <p>Du hast das Recht auf</p>
      <ul>
        <li>Auskunft über die Daten, die wir über dich verarbeiten (Art. 15 DSGVO),</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO),</li>
        <li>Löschung (Art. 17 DSGVO) und Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
        <li>Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).</li>
      </ul>
      <div className="rt-kasten">
        <p>
          <strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Verarbeiten wir Daten auf Grundlage unserer berechtigten
          Interessen (Art. 6 Abs. 1 lit. f DSGVO), kannst du aus Gründen, die sich aus deiner besonderen Situation
          ergeben, jederzeit widersprechen. Der Verarbeitung für Direktwerbung kannst du jederzeit ohne Angabe von
          Gründen widersprechen; wir verarbeiten deine Daten dann nicht mehr für diesen Zweck.
        </p>
      </div>
      <p>
        Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), etwa bei der für uns
        zuständigen Behörde:
      </p>
      <address>
        {aufsichtsbehoerde.name}
        <br />
        {aufsichtsbehoerde.strasse}
        <br />
        {aufsichtsbehoerde.plzOrt}
        <br />
        <a href={aufsichtsbehoerde.web} target="_blank" rel="noopener noreferrer">
          {aufsichtsbehoerde.web.replace(/^https:\/\//, "")}
        </a>
      </address>

      <h2 id="sonstiges">19. Sonstiges</h2>
      <p>
        <strong>Pflicht zur Angabe:</strong> Für den Abschluss einer Mitgliedschaft brauchen wir deine E-Mail-Adresse
        und Zahlungsdaten; ohne sie kommt kein Vertrag zustande. Alle weiteren Angaben sind freiwillig, soweit wir
        nichts anderes sagen.
      </p>
      <p>
        <strong>Keine automatisierten Entscheidungen:</strong> Wir treffen keine Entscheidungen, die ausschließlich auf
        einer automatisierten Verarbeitung beruhen und dir gegenüber rechtliche Wirkung entfalten (Art. 22 DSGVO).
      </p>
      <p>
        <strong>Änderungen:</strong> Wir passen diese Erklärung an, wenn sich unsere Dienste oder die Rechtslage
        ändern. Es gilt die jeweils hier veröffentlichte Fassung. Die Bedingungen deiner Mitgliedschaft stehen in den{" "}
        <Link href={rechtsPfade.agb}>AGB</Link>.
      </p>
    </RechtstextSeite>
  );
}
