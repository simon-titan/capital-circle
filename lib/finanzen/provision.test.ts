import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { anteilCents, euroDezimal, euroText as euroRoh, steuerFallback19Inkl } from "./geld";
import { provisionCents, provisionFuerZahlung, provisionsKorrektur } from "./provision";

// Intl setzt ein geschütztes Leerzeichen vor „€"; verglichen wird der sichtbare Text.
const euroText = (c: number) => euroRoh(c).replace(/ /g, " ");

describe("Geld in Cent", () => {
  it("3.000 € inkl. 19 % → 2.521,01 € netto, 478,99 € Steuer (Playbook 10.3)", () => {
    const r = steuerFallback19Inkl(300_000);
    assert.equal(r.nettoCents, 252_101);
    assert.equal(r.steuerCents, 47_899);
  });
  it("kaufmännische Rundung mit Ganzzahlen, negativ gespiegelt", () => {
    assert.equal(anteilCents(5, 1, 2), 3);
    assert.equal(anteilCents(-5, 1, 2), -3);
    assert.equal(anteilCents(0, 1500, 10_000), 0);
  });
  it("Anzeige mit zwei Nachkommastellen, Export mit Dezimalpunkt", () => {
    assert.equal(euroText(37_815), "378,15 €");
    assert.equal(euroDezimal(37_815), "378.15");
    assert.equal(euroDezimal(-5), "-0.05");
    assert.equal(euroDezimal(250_100), "2501.00");
  });
});

describe("Provision 15 % vom tatsächlichen Netto (Playbook 10.3/10.4)", () => {
  it("Main voll bezahlt: 378,15 € (QA 4)", () => {
    assert.equal(provisionCents(252_101), 37_815);
  });

  it("6 Raten: Rundungsrest in der letzten Rate, Summe = Provision auf das Gesamtnetto (QA-Karte 12)", () => {
    // 3.000 € / 6 = 500 € je Rate; Stripe rechnet die Steuer je Rechnung: 79,83 € → Netto 420,17 €.
    const netto = Array.from({ length: 6 }, () => 42_017);
    let bisher = 0;
    const betraege: number[] = [];
    netto.forEach((n, i) => {
      const letzte = i === netto.length - 1;
      const r = provisionFuerZahlung({
        nettoCents: n,
        ausgleich: letzte ? { nettoSummeAlleZahlungen: netto.reduce((s, x) => s + x, 0), provisionBisher: bisher } : null,
      });
      betraege.push(r.betragCents);
      bisher += r.betragCents;
    });
    assert.deepEqual(betraege.slice(0, 5), [6303, 6303, 6303, 6303, 6303]);
    assert.equal(bisher, provisionCents(252_102)); // 378,15 €
    assert.equal(betraege[5], 37_815 - 5 * 6303);
  });

  it("Premium 6 Raten mit Restcent auf Rate 1", () => {
    const netto = [70_029, 70_027, 70_027, 70_027, 70_027, 70_027];
    const vorher = netto.slice(0, 5).reduce((s, n) => s + provisionCents(n), 0);
    const r = provisionFuerZahlung({ nettoCents: netto[5]!, ausgleich: { nettoSummeAlleZahlungen: netto.reduce((s, x) => s + x, 0), provisionBisher: vorher } });
    assert.equal(vorher + r.betragCents, provisionCents(420_164));
  });

  it("Teilerstattung: negative Provision auf das erstattete Netto, Historie bleibt (QA-Karte 14)", () => {
    const erstattet = steuerFallback19Inkl(100_000).nettoCents; // 840,34 €
    assert.equal(provisionsKorrektur(-erstattet), -12_605);
    assert.equal(provisionsKorrektur(erstattet), -12_605);
  });

  it("Vollerstattung hebt die Provision exakt auf", () => {
    assert.equal(provisionCents(252_101) + provisionsKorrektur(-252_101), 0);
  });
});
