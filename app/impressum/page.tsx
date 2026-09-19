import type { Metadata } from "next";
import { RechtstextSeite } from "@/components/legal/RechtstextSeite";
import { anbieter, anbieterAnschriftZeilen } from "@/config/legal";

export const metadata: Metadata = {
  title: "Impressum — Capital Circle",
  description: "Anbieterkennzeichnung von Capital Circle nach § 5 DDG.",
};

/**
 * Impressum (`/impressum`).
 *
 * Grundlage ist § 5 DDG (Digitale-Dienste-Gesetz, seit 14.05.2024 anstelle
 * von § 5 TMG). Alle Angaben kommen aus `config/legal.ts`; was dort `null`
 * ist (Telefon, USt-IdNr), fehlt hier ersatzlos.
 *
 * Bewusst **kein** Hinweis auf die EU-Plattform zur Online-Streitbeilegung:
 * Sie wurde am 20.07.2025 eingestellt, ein Link darauf wäre ein toter Link
 * mit falscher Aussage.
 *
 * Öffentlich und auch im Wartungsmodus erreichbar (`proxy.ts`).
 */
export default function ImpressumPage() {
  return (
    <RechtstextSeite titel="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <address>
        {anbieter.name}
        <br />
        {anbieter.rechtsform}, handelnd unter „{anbieter.marke}“
        <br />
        {anbieterAnschriftZeilen().map((zeile) => (
          <span key={zeile}>
            {zeile}
            <br />
          </span>
        ))}
      </address>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${anbieter.email}`}>{anbieter.email}</a>
        {anbieter.telefon ? (
          <>
            <br />
            Telefon: <a href={`tel:${anbieter.telefon.replace(/[^\d+]/g, "")}`}>{anbieter.telefon}</a>
          </>
        ) : null}
      </p>

      {anbieter.ustIdNr ? (
        <>
          <h2>Umsatzsteuer</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: {anbieter.ustIdNr}</p>
        </>
      ) : null}

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        {anbieter.name}
        <br />
        Anschrift wie oben
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Risikohinweis</h2>
      <p>
        Capital Circle ist ein Ausbildungsangebot rund um den Handel an den Finanzmärkten. Wir erbringen keine
        Anlageberatung, keine Anlage- oder Abschlussvermittlung und keine Vermögensverwaltung. Inhalte, Analysen und
        Live-Trades zeigen unsere eigene Vorgehensweise und sind keine Empfehlung, bestimmte Finanzinstrumente zu
        kaufen oder zu verkaufen.
      </p>
      <p>
        Der Handel mit Finanzinstrumenten, insbesondere mit Futures, CFDs, Devisen und anderen gehebelten Produkten,
        ist mit erheblichen Risiken verbunden und kann zum Verlust des gesamten eingesetzten Kapitals führen.
        Frühere Ergebnisse — auch die auf dieser Website gezeigten Auszahlungen — sind keine Garantie für zukünftige
        Ergebnisse.
      </p>
    </RechtstextSeite>
  );
}
