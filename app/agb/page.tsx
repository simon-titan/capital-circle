import type { Metadata } from "next";
import Link from "next/link";
import { RechtstextSeite } from "@/components/legal/RechtstextSeite";
import { preiskarten } from "@/config/landing-membership";
import { anbieter, anbieterAnschriftEinzeilig, rechtsPfade, rechtstexteVersion } from "@/config/legal";

export const metadata: Metadata = {
  title: "AGB — Capital Circle",
  description: "Allgemeine Geschäftsbedingungen für die Mitgliedschaft bei Capital Circle.",
};

/**
 * Allgemeine Geschäftsbedingungen (`/agb`).
 *
 * Die Preise kommen aus `preiskarten` in `config/landing-membership.ts` —
 * derselben Quelle wie die Preiskarten der Verkaufsseite. Abgerechnet wird
 * trotzdem immer der Stripe-Preis (`lib/stripe/plan-map.ts`); wer dort
 * etwas ändert, muss die Anzeige mitziehen.
 *
 * ── § 6 Laufzeit und die Technik ───────────────────────────────────────────
 * § 6 ist nach § 309 Nr. 9 BGB formuliert: Nach der Erstlaufzeit verlängert
 * sich der Vertrag nur auf unbestimmte Zeit und ist dann jederzeit mit
 * höchstens einem Monat Frist kündbar, bereits bezahlte Zeit danach wird
 * anteilig erstattet. **Die Stripe-Abos bilden das heute nicht ab**: Sie
 * verlängern vierteljährlich/jährlich um volle 3/12 Monate und kündigen nur
 * zum Periodenende, eine anteilige Erstattung gibt es nicht. Das ist eine
 * offene Entscheidung (Technik anpassen oder Klausel ändern), keine Sache
 * dieses Texts. Der Text am Bezahlknopf (`lib/stripe/kasse-recht.ts`) sagt
 * dasselbe wie § 6 und muss mitgezogen werden.
 */

const ABRECHNUNG: Record<string, string> = {
  monthly: "monatlich im Voraus",
  quarterly: "alle drei Monate im Voraus",
  yearly: "jährlich im Voraus",
};

export default function AgbPage() {
  return (
    <RechtstextSeite
      titel="Allgemeine Geschäftsbedingungen"
      einleitung="Die Bedingungen für deine Mitgliedschaft bei Capital Circle — so knapp wie möglich, so genau wie nötig."
    >
      <ul className="rt-inhalt">
        <li>
          <a href="#p1">§ 1 Geltungsbereich und Vertragspartner</a>
        </li>
        <li>
          <a href="#p2">§ 2 Leistungen</a>
        </li>
        <li>
          <a href="#p3">§ 3 Keine Anlageberatung, Risikohinweis</a>
        </li>
        <li>
          <a href="#p4">§ 4 Vertragsschluss</a>
        </li>
        <li>
          <a href="#p5">§ 5 Preise und Zahlung</a>
        </li>
        <li>
          <a href="#p6">§ 6 Laufzeit, Verlängerung und Kündigung</a>
        </li>
        <li>
          <a href="#p7">§ 7 Dauerzugang gegen Einmalzahlung</a>
        </li>
        <li>
          <a href="#p8">§ 8 Widerrufsrecht</a>
        </li>
        <li>
          <a href="#p9">§ 9 Konto, Zugang und Nutzungsrechte</a>
        </li>
        <li>
          <a href="#p10">§ 10 Community-Regeln</a>
        </li>
        <li>
          <a href="#p11">§ 11 Änderungen der Leistungen</a>
        </li>
        <li>
          <a href="#p12">§ 12 Mängelrechte</a>
        </li>
        <li>
          <a href="#p13">§ 13 Haftung</a>
        </li>
        <li>
          <a href="#p14">§ 14 Vertragstext, Sprache, Streitbeilegung</a>
        </li>
        <li>
          <a href="#p15">§ 15 Schlussbestimmungen</a>
        </li>
      </ul>

      <h2 id="p1">§ 1 Geltungsbereich und Vertragspartner</h2>
      <p>
        (1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge über eine Mitgliedschaft bei Capital
        Circle, die du über unsere Website abschließt, und für die Nutzung kostenloser Zugänge zu unserer Plattform.
      </p>
      <p>
        (2) Dein Vertragspartner ist {anbieter.name}, {anbieter.rechtsform}, handelnd unter „{anbieter.marke}“,{" "}
        {anbieterAnschriftEinzeilig()}, E-Mail: <a href={`mailto:${anbieter.email}`}>{anbieter.email}</a> (im
        Folgenden „wir“). Weitere Angaben findest du im <Link href={rechtsPfade.impressum}>Impressum</Link>.
      </p>
      <p>(3) Für ein individuelles 1:1-Mentoring treffen wir eine gesonderte Vereinbarung.</p>

      <h2 id="p2">§ 2 Leistungen</h2>
      <p>
        (1) Die Mitgliedschaft gibt dir für die Dauer des Vertrags Zugang zum Mitgliederbereich unserer Plattform. Dazu
        gehören insbesondere:
      </p>
      <ul>
        <li>das Institut: Lernmodule mit Videos zu Marktstruktur, Handelsstrategie, Risiko und Psychologie;</li>
        <li>Live-Sessions nach dem im Kalender der Plattform veröffentlichten Plan sowie Aufzeichnungen, soweit wir sie bereitstellen;</li>
        <li>der Zugang zu unserer Community auf Discord, sobald du dein Discord-Konto mit der Plattform verbunden hast;</li>
        <li>das Trading Journal zur Auswertung deiner eigenen Trades und der Positionsrechner;</li>
        <li>Ressourcen wie Analysen, Wochenaufgaben, Vorlagen, PDFs und Übersichten zu Tools und Fremdkapital;</li>
        <li>News aus der Community und Support über das Ticketsystem der Plattform.</li>
      </ul>
      <p>
        (2) Den aktuellen Umfang beschreiben wir auf unserer Angebotsseite. Verlegen wir einzelne Live-Termine oder
        fallen sie aus, etwa wegen Krankheit oder an Feiertagen, kündigen wir das so früh wie möglich im Kalender oder
        in der Community an.
      </p>
      <p>(3) Wir schulden die Bereitstellung der Inhalte und Termine, nicht einen bestimmten Lern- oder Handelserfolg.</p>
      <p>
        (4) Kostenlose Zugänge, etwa zum kostenlosen Einstiegskurs, umfassen nur die jeweils freigeschalteten Bereiche.
        Kostenlose Angebote können wir jederzeit ändern oder einstellen.
      </p>
      <p>
        (5) Für die Nutzung brauchst du ein internetfähiges Gerät mit einem aktuellen Browser, für die Community
        zusätzlich ein Discord-Konto. Für Discord gelten die Nutzungsbedingungen von Discord.
      </p>

      <h2 id="p3">§ 3 Keine Anlageberatung, Risikohinweis</h2>
      <p>
        (1) Capital Circle vermittelt Wissen über den Handel an den Finanzmärkten. Wir erbringen keine Anlageberatung,
        keine Anlage- oder Abschlussvermittlung und keine Vermögensverwaltung. Wir geben keine Signale und keine
        Empfehlungen, bestimmte Finanzinstrumente zu kaufen oder zu verkaufen. Analysen und Live-Trades zeigen unsere
        eigene Vorgehensweise; sie sind keine Aufforderung, Geschäfte nachzuahmen.
      </p>
      <p>(2) Deine Handelsentscheidungen triffst du selbst, in eigener Verantwortung und auf eigenes Risiko.</p>
      <p>
        (3) Der Handel mit Finanzinstrumenten, insbesondere mit Futures, CFDs, Devisen und anderen gehebelten
        Produkten, ist mit erheblichen Risiken verbunden und kann zum Verlust des gesamten eingesetzten Kapitals
        führen; bei einzelnen Produkten, etwa Futures, können Verluste auch darüber hinausgehen. Frühere Ergebnisse —
        auch die auf unserer Website gezeigten Auszahlungen — sind keine Garantie für zukünftige Ergebnisse. Handle
        nur mit Geld, dessen Verlust du verkraften kannst.
      </p>

      <h2 id="p4">§ 4 Vertragsschluss</h2>
      <p>(1) Die Darstellung der Mitgliedschaften auf unserer Website ist noch kein verbindliches Angebot.</p>
      <p>
        (2) Nach der Wahl der Laufzeit gelangst du in die Kasse unseres Zahlungsdienstleisters Stripe. Dort gibst du
        deine E-Mail-Adresse, deine Zahlungsdaten und, soweit abgefragt, deine Rechnungsanschrift ein. Mit einem
        Pflicht-Häkchen akzeptierst du diese AGB, bestätigst, die Widerrufsbelehrung zur Kenntnis genommen zu haben,
        und verlangst, dass wir sofort mit der Leistung beginnen (siehe § 8). Bis zum Klick auf den
        Bezahlknopf kannst du deine Eingaben jederzeit prüfen und korrigieren oder den Vorgang abbrechen, indem du die
        Kasse verlässt.
      </p>
      <p>
        (3) Mit dem Klick auf den Bezahlknopf gibst du ein verbindliches Angebot zum Abschluss des Vertrags ab. Wir
        nehmen es an, indem wir deinen Zugang freischalten. Das geschieht unmittelbar nach erfolgreicher Zahlung; wir
        bestätigen es dir auf der Bestätigungsseite und per E-Mail.
      </p>
      <p>
        (4) Hast du noch kein Konto, legen wir es mit der in der Kasse angegebenen E-Mail-Adresse an. Dein Passwort
        setzt du im Anschluss selbst.
      </p>

      <h2 id="p5">§ 5 Preise und Zahlung</h2>
      <p>
        (1) Es gelten die Preise zum Zeitpunkt der Bestellung. Alle Preise sind Endpreise einschließlich der
        gesetzlichen Umsatzsteuer. Derzeit bieten wir an:
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Mitgliedschaft</th>
            <th scope="col">Preis</th>
            <th scope="col">Abrechnung</th>
          </tr>
        </thead>
        <tbody>
          {preiskarten.map((karte) => (
            <tr key={karte.plan}>
              <td>{karte.laufzeit}</td>
              <td className="cc-num">
                {karte.preis} {karte.periode}
              </td>
              <td>{ABRECHNUNG[karte.plan] ?? "im Voraus"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        (2) Das Entgelt ist jeweils zu Beginn eines Abrechnungszeitraums im Voraus fällig. Stripe zieht es mit der
        Zahlungsart ein, die du in der Kasse gewählt hast; welche Zahlungsarten verfügbar sind, zeigt die Kasse. Die
        Rechnung erhältst du per E-Mail, frühere Rechnungen findest du im Mitgliederbereich unter Einstellungen →
        Abrechnung.
      </p>
      <p>(3) Rabattcodes kannst du in der Kasse einlösen. Sie gelten zu den Bedingungen, die beim jeweiligen Code genannt sind.</p>
      <p>
        (4) Schlägt ein Einzug fehl, benachrichtigen wir dich per E-Mail, und Stripe versucht den Einzug erneut. Wird
        der offene Betrag nicht beglichen, dürfen wir deinen Zugang frühestens 48 Stunden nach der ersten
        Benachrichtigung sperren, bis die Zahlung eingegangen ist. Weitergehende gesetzliche Rechte bei Zahlungsverzug
        bleiben unberührt.
      </p>

      <h2 id="p6">§ 6 Laufzeit, Verlängerung und Kündigung</h2>
      <p>
        (1) Die Mitgliedschaft beginnt mit Vertragsschluss. Ihre Erstlaufzeit entspricht dem gewählten Zeitraum: ein
        Monat (monatlich), drei Monate (vierteljährlich) oder zwölf Monate (jährlich).
      </p>
      <p>(2) Du kannst jederzeit zum Ende der Erstlaufzeit kündigen. Eine Kündigungsfrist gibt es dafür nicht.</p>
      <p>
        (3) Kündigst du nicht, verlängert sich die Mitgliedschaft nach Ablauf der Erstlaufzeit auf unbestimmte Zeit.
        Du kannst sie dann jederzeit mit einer Frist von einem Monat kündigen. Endet der laufende Abrechnungszeitraum
        vor Ablauf dieser Frist, endet die Mitgliedschaft bereits mit ihm.
      </p>
      <p>
        (4) Auch nach der Verlängerung rechnen wir im gewählten Zeitraum im Voraus ab. Endet die Mitgliedschaft vor
        dem Ende eines bereits bezahlten Abrechnungszeitraums, erstatten wir dir das Entgelt für die Zeit nach dem
        Vertragsende anteilig.
      </p>
      <p>
        (5) Wir können die Mitgliedschaft mit einer Frist von einem Monat zum Ende der Erstlaufzeit und nach der
        Verlängerung jederzeit mit einer Frist von einem Monat kündigen. Absatz 4 gilt entsprechend.
      </p>
      <p>
        (6) Das Recht beider Seiten zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein
        wichtiger Grund liegt für uns insbesondere vor, wenn du Zugangsdaten oder Inhalte entgegen § 9 weitergibst oder
        trotz Abmahnung wiederholt gegen die Community-Regeln verstößt.
      </p>
      <p>(7) Kündigen kannst du</p>
      <ul>
        <li>
          über die Schaltfläche <Link href={rechtsPfade.kuendigen}>„Verträge hier kündigen“</Link> im Fußbereich
          unserer Seiten und in der Navigation des Mitgliederbereichs,
        </li>
        <li>
          in deinem Konto unter <Link href="/einstellungen/abonnement">Einstellungen → Abonnement</Link> oder
        </li>
        <li>
          in Textform, zum Beispiel per E-Mail an <a href={`mailto:${anbieter.email}`}>{anbieter.email}</a>.
        </li>
      </ul>
      <p>
        (8) Bis zum Vertragsende bleibt dein Zugang bestehen. Danach endet der Zugang zu den kostenpflichtigen
        Bereichen; dein Konto bleibt als kostenloses Konto bestehen, bis du seine Löschung verlangst.
      </p>

      <h2 id="p7">§ 7 Dauerzugang gegen Einmalzahlung</h2>
      <p>
        (1) Bestehenden Mitgliedern bieten wir im Mitgliederbereich zeitweise einen dauerhaften Zugang gegen eine
        Einmalzahlung an. Er gilt ohne Enddatum und verlängert sich nicht; weitere Zahlungen fallen dafür nicht an.
      </p>
      <p>(2) Ein laufendes Abo endet mit dem Kauf zum Ende des bereits bezahlten Abrechnungszeitraums.</p>
      <p>(3) § 6 Abs. 6 (Kündigung aus wichtigem Grund) gilt entsprechend.</p>

      <h2 id="p8">§ 8 Widerrufsrecht</h2>
      <p>
        Als Verbraucher hast du ein gesetzliches Widerrufsrecht. Die Einzelheiten stehen in der{" "}
        <Link href={rechtsPfade.widerruf}>Widerrufsbelehrung</Link>. In der Kasse kannst du ausdrücklich verlangen,
        dass wir sofort mit der Leistung beginnen. Dann erlischt dein Widerrufsrecht für die digitalen Inhalte mit
        Beginn der Bereitstellung; für die Dienstleistungen erlischt es mit ihrer vollständigen Erbringung, und bei
        einem Widerruf schuldest du für die bis dahin erbrachten Dienstleistungen anteiligen Wertersatz.
      </p>

      <h2 id="p9">§ 9 Konto, Zugang und Nutzungsrechte</h2>
      <p>
        (1) Dein Zugang ist persönlich. Du darfst deine Zugangsdaten nicht weitergeben und musst sie vor dem Zugriff
        Dritter schützen.
      </p>
      <p>
        (2) Alle Inhalte — Videos, Texte, Analysen, Vorlagen, PDFs und Live-Sessions — sind urheberrechtlich geschützt.
        Du erhältst für die Dauer des Vertrags das einfache, nicht übertragbare Recht, sie für deine persönliche Aus-
        und Weiterbildung zu nutzen.
      </p>
      <p>
        (3) Nicht erlaubt ist insbesondere, Inhalte ganz oder teilweise aufzuzeichnen, herunterzuladen, soweit wir
        keinen Download anbieten, zu vervielfältigen, an Dritte weiterzugeben, öffentlich zugänglich zu machen oder für
        eigene Kurse, Coachings oder Communities zu verwenden.
      </p>
      <p>
        (4) Verstößt du dagegen, dürfen wir deinen Zugang vorübergehend sperren und den Vertrag aus wichtigem Grund
        kündigen. Weitergehende Ansprüche bleiben vorbehalten.
      </p>

      <h2 id="p10">§ 10 Community-Regeln</h2>
      <p>In der Community — auf Discord und in den Kommentaren der Plattform — gilt:</p>
      <ul>
        <li>Wir gehen respektvoll miteinander um. Beleidigungen, Diskriminierung und Belästigung haben hier keinen Platz.</li>
        <li>Keine Werbung, kein Spam und keine Angebote für eigene Signale, Kurse oder Dienstleistungen.</li>
        <li>Keine Inhalte, die Rechte Dritter verletzen, und keine personenbezogenen Daten anderer ohne deren Einverständnis.</li>
        <li>Was andere Mitglieder über ihre Konten und Ergebnisse teilen, bleibt in der Community.</li>
      </ul>
      <p>
        Beiträge, die gegen diese Regeln verstoßen, dürfen wir entfernen. Mitglieder, die wiederholt dagegen verstoßen,
        können wir nach einer Abmahnung aus der Community ausschließen, bei schweren Verstößen auch sofort.
      </p>

      <h2 id="p11">§ 11 Änderungen der Leistungen</h2>
      <p>
        (1) Wir entwickeln Capital Circle laufend weiter. Wir dürfen Inhalte und Funktionen aktualisieren, umgestalten
        oder ersetzen, wenn dafür ein triftiger Grund besteht — etwa die Weiterentwicklung der Inhalte, veränderte
        Marktbedingungen, technische oder rechtliche Anforderungen oder die Sicherheit der Plattform —, dir dadurch
        keine zusätzlichen Kosten entstehen und wir dich klar und verständlich über die Änderung informieren.
      </p>
      <p>
        (2) Beeinträchtigt eine Änderung deinen Zugang oder die Nutzbarkeit mehr als nur unerheblich, informieren wir
        dich rechtzeitig vorher per E-Mail über die Merkmale und den Zeitpunkt der Änderung und über deine Rechte. Du
        kannst den Vertrag dann innerhalb von 30 Tagen nach Zugang dieser Information, oder nach der Änderung, falls
        sie später erfolgt, unentgeltlich beenden (§ 327r BGB).
      </p>

      <h2 id="p12">§ 12 Mängelrechte</h2>
      <p>
        Es gelten die gesetzlichen Mängelrechte, für digitale Inhalte und Dienstleistungen insbesondere die §§ 327 ff.
        BGB. Mängel meldest du am einfachsten über den Support der Plattform oder per E-Mail.
      </p>

      <h2 id="p13">§ 13 Haftung</h2>
      <p>
        (1) Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei der Verletzung von Leben, Körper oder
        Gesundheit, nach dem Produkthaftungsgesetz und im Umfang einer von uns übernommenen Garantie.
      </p>
      <p>
        (2) Bei leichter Fahrlässigkeit haften wir nur, wenn wir eine wesentliche Vertragspflicht verletzen — also eine
        Pflicht, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren
        Einhaltung du regelmäßig vertrauen darfst. Die Haftung ist dann auf den bei Vertragsschluss vorhersehbaren,
        vertragstypischen Schaden begrenzt.
      </p>
      <p>(3) Im Übrigen ist unsere Haftung ausgeschlossen. Die Beschränkungen gelten auch zugunsten unserer Erfüllungsgehilfen.</p>

      <h2 id="p14">§ 14 Vertragstext, Sprache, Streitbeilegung</h2>
      <p>(1) Vertragssprache ist Deutsch.</p>
      <p>
        (2) Die Bestätigung deines Vertrags erhältst du per E-Mail, die Rechnung von Stripe. Die jeweils gültigen AGB
        kannst du jederzeit auf dieser Seite abrufen, speichern und ausdrucken. Den bei deinem Kauf geltenden Stand
        (Versionskennung <span className="cc-num">{rechtstexteVersion}</span>) schicken wir dir auf Anfrage zu.
      </p>
      <p>(3) Wir haben uns keinen besonderen Verhaltenskodizes unterworfen.</p>
      <p>
        (4) Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2 id="p15">§ 15 Schlussbestimmungen</h2>
      <p>
        (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bist du Verbraucher,
        gilt diese Rechtswahl nur, soweit dir dadurch nicht der Schutz zwingender Vorschriften des Staates entzogen
        wird, in dem du deinen gewöhnlichen Aufenthalt hast.
      </p>
      <p>
        (2) Bist du Kaufmann, eine juristische Person des öffentlichen Rechts oder ein öffentlich-rechtliches
        Sondervermögen, ist Gerichtsstand für alle Streitigkeiten aus diesem Vertrag unser Geschäftssitz.
      </p>
      <p>
        (3) Ist eine Bestimmung dieser AGB unwirksam, bleibt der Vertrag im Übrigen wirksam. Wie wir mit deinen Daten
        umgehen, steht in der <Link href={rechtsPfade.datenschutz}>Datenschutzerklärung</Link>.
      </p>
    </RechtstextSeite>
  );
}
