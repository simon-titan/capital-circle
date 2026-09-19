import type { Metadata } from "next";
import Link from "next/link";
import { RechtstextSeite } from "@/components/legal/RechtstextSeite";
import { anbieter, anbieterAnschriftEinzeilig, rechtsPfade, widerrufsfunktionPfad } from "@/config/legal";
import { getAppUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung — Capital Circle",
  description: "Widerrufsbelehrung und Muster-Widerrufsformular für die Mitgliedschaft bei Capital Circle.",
};

/**
 * Widerrufsbelehrung (`/widerruf`).
 *
 * ── Wortlaut ───────────────────────────────────────────────────────────────
 * Belehrung und Formular sind die **gesetzlichen Muster** — Anlage 1 zu
 * Art. 246a § 1 Abs. 2 Satz 2 EGBGB in der Fassung seit 19.06.2026 und
 * Anlage 2 (Muster-Widerrufsformular). Ausgefüllt sind nur die Stellen, die
 * die Gestaltungshinweise dafür vorsehen:
 *   [1] a) Dienstleistungen / digitale Inhalte → „des Vertragsabschlusses."
 *   [2] Name, Anschrift, Telefon, E-Mail aus `config/legal.ts`
 *   [3] Satz zur Widerrufsfunktion — nur, wenn `widerrufsfunktionPfad` gesetzt
 *   [4] und [5] entfallen (keine Waren)
 *   [6] Wertersatz bei Dienstleistungen, „Unzutreffendes" gestrichen
 * Den Text bitte **nicht** umformulieren, auch nicht „verbessern" oder duzen:
 * Nur das unveränderte Muster trägt die gesetzliche Vermutung, richtig belehrt
 * zu haben (Art. 246a § 1 Abs. 2 Satz 2 EGBGB). Deshalb siezt diese Seite als
 * einzige.
 *
 * ── Zwei offene Punkte (siehe Bericht / `config/legal.ts`) ────────────────
 * - Gestaltungshinweis 2 verlangt eine Telefonnummer; solange `telefon`
 *   `null` ist, fehlt sie.
 * - Seit 19.06.2026 muss es für online geschlossene Verträge eine
 *   Widerrufsfunktion geben (§ 356a BGB). Solange sie fehlt, fehlt auch der
 *   Satz nach Gestaltungshinweis 3.
 *
 * Die Hinweise zum vorzeitigen Erlöschen stehen bewusst **außerhalb** des
 * Musterkastens — sie sind nicht Teil des Musters, sondern ergänzende
 * Information nach § 356 Abs. 5 und 6 BGB (Nummerierung seit 19.06.2026).
 */
export default function WiderrufPage() {
  const anschrift = anbieterAnschriftEinzeilig();
  const kontakt = [anbieter.telefon ? `Telefon: ${anbieter.telefon}` : null, `E-Mail: ${anbieter.email}`]
    .filter(Boolean)
    .join(", ");
  const widerrufsfunktionUrl = widerrufsfunktionPfad ? `${getAppUrl()}${widerrufsfunktionPfad}` : null;

  return (
    <RechtstextSeite
      titel="Widerrufsbelehrung"
      einleitung="Die Belehrung und das Formular folgen wortgleich den gesetzlichen Mustern. Deshalb sprechen wir Sie hier — anders als sonst — mit „Sie“ an."
    >
      <div className="rt-kasten">
        <h2>Widerrufsbelehrung</h2>

        <h3>Widerrufsrecht</h3>
        <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>
        <p>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.</p>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({anbieter.name}, {anbieter.marke}, {anschrift}, {kontakt})
          mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren
          Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
          Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
          {widerrufsfunktionUrl ? (
            <>
              {" "}
              Sie können Ihr Widerrufsrecht auch online unter{" "}
              <Link href={widerrufsfunktionPfad ?? "/"}>{widerrufsfunktionUrl}</Link> ausüben. Wenn Sie diese
              Online-Funktion nutzen, übermitteln wir Ihnen auf einem dauerhaften Datenträger (z. B. durch eine
              E-Mail) unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie
              dem Datum und der Uhrzeit ihres Eingangs.
            </>
          ) : null}
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts
          vor Ablauf der Widerrufsfrist absenden.
        </p>

        <h3>Folgen des Widerrufs</h3>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben,
          einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine
          andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben),
          unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren
          Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe
          Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde
          ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte
          berechnet.
        </p>
        <p>
          Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen soll, so haben Sie uns
          einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der
          Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen
          im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
        </p>
        <p className="rt-klein">Ende der Widerrufsbelehrung</p>
      </div>

      <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
      <p>
        Die Mitgliedschaft umfasst digitale Inhalte, die nicht auf einem körperlichen Datenträger geliefert werden
        (etwa die Lernvideos im Institut), und Dienstleistungen (etwa Live-Sessions und die Betreuung in der
        Community). Für beide kann Ihr Widerrufsrecht vor Ablauf der vierzehn Tage erlöschen:
      </p>
      <ul>
        <li>
          <strong>Digitale Inhalte:</strong> Das Widerrufsrecht erlischt, wenn wir mit der Vertragserfüllung begonnen
          haben, nachdem Sie ausdrücklich zugestimmt haben, dass wir vor Ablauf der Widerrufsfrist beginnen, Sie Ihre
          Kenntnis davon bestätigt haben, dass Sie durch diese Zustimmung mit Beginn der Vertragserfüllung Ihr
          Widerrufsrecht verlieren, und wir Ihnen eine Bestätigung nach § 312f BGB zur Verfügung gestellt haben (§ 356
          Abs. 6 BGB).
        </li>
        <li>
          <strong>Dienstleistungen:</strong> Das Widerrufsrecht erlischt mit der vollständigen Erbringung der
          Dienstleistung, wenn Sie vor deren Beginn ausdrücklich zugestimmt haben, dass wir vor Ablauf der
          Widerrufsfrist beginnen, und Ihre Kenntnis davon bestätigt haben, dass Ihr Widerrufsrecht mit vollständiger
          Vertragserfüllung erlischt (§ 356 Abs. 5 BGB). Bis dahin gilt bei einem Widerruf die oben beschriebene
          Pflicht zum Wertersatz.
        </li>
      </ul>
      <p>
        Die Zustimmung und die Bestätigung geben Sie in der Kasse über das Pflicht-Häkchen ab, die Bestätigung nach §
        312f BGB erhalten Sie anschließend per E-Mail. Setzen Sie das Häkchen nicht, kommt kein Vertrag zustande.
      </p>

      <div className="rt-kasten">
        <h2>Muster-Widerrufsformular</h2>
        <p>
          (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es
          zurück.)
        </p>
        <ul className="rt-inhalt">
          <li>
            – An {anbieter.name}, {anbieter.marke}, {anschrift}, E-Mail: {anbieter.email}:
          </li>
          <li>
            – Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden
            Waren (*)/die Erbringung der folgenden Dienstleistung (*)
          </li>
          <li>– Bestellt am (*)/erhalten am (*)</li>
          <li>– Name des/der Verbraucher(s)</li>
          <li>– Anschrift des/der Verbraucher(s)</li>
          <li>– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</li>
          <li>– Datum</li>
        </ul>
        <p className="rt-klein">(*) Unzutreffendes streichen.</p>
      </div>

      <p className="rt-klein">
        Kündigen statt widerrufen? Das geht jederzeit über{" "}
        <Link href={rechtsPfade.kuendigen}>„Verträge hier kündigen“</Link>; wann eine Kündigung wirkt, steht in{" "}
        <Link href={`${rechtsPfade.agb}#p6`}>§ 6 der AGB</Link>.
      </p>
    </RechtstextSeite>
  );
}
