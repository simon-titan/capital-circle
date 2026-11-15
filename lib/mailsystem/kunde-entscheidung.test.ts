/** Abnahmetests des E-Mail-Playbooks (Kapitel 13, Tests 32–36) für Kundenmails. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entscheideKunde, type KundeZustand } from "./kunde-entscheidung";

const H = 3_600_000;
const T = 24 * H;
const KAUF = new Date("2026-11-10T12:00:00Z");

function z(t: Partial<KundeZustand> = {}): KundeZustand {
  return {
    jetzt: KAUF,
    gesperrt: false,
    abgemeldet: false,
    pause: false,
    letzteMarketingAm: null,
    ausbildung: { freigeschaltetAm: KAUF, beendet: null, upgradeAnfrage: false, protokoll: {} },
    live: null,
    ...t,
  };
}
const um = (ms: number) => new Date(KAUF.getTime() + ms);

describe("U — nur 799-€-Käufer", () => {
  it("U01 an Tag 14, U02 an Tag 30", () => {
    assert.equal(entscheideKunde(z({ jetzt: um(14 * T + H) })).senden?.vorlage, "U01");
    const r = entscheideKunde(
      z({ jetzt: um(30 * T + H), ausbildung: { freigeschaltetAm: KAUF, beendet: null, upgradeAnfrage: false, protokoll: { U01: { status: "gesendet" } } } }),
    );
    assert.equal(r.senden?.vorlage, "U02");
  });
  it("32 · Main/Premium: keine U-Mails (ohne Ausbildungskauf keine Kandidaten)", () => {
    assert.equal(entscheideKunde(z({ ausbildung: null, jetzt: um(14 * T + H) })).senden, null);
  });
  it("32 · Upgrade zu Main/Premium beendet die Folge", () => {
    const r = entscheideKunde(z({ jetzt: um(14 * T + H), ausbildung: { freigeschaltetAm: KAUF, beendet: "upgrade", upgradeAnfrage: false, protokoll: {} } }));
    assert.deepEqual(r.protokoll.map((p) => [p.vorlage, p.grund]), [["U01", "upgrade"]]);
  });
  it("33 · Upgrade-Anfrage vor Tag 14: U01/U02 stoppen", () => {
    const r = entscheideKunde(z({ jetzt: um(14 * T + H), ausbildung: { freigeschaltetAm: KAUF, beendet: null, upgradeAnfrage: true, protokoll: {} } }));
    assert.equal(r.senden, null);
    assert.equal(r.protokoll[0]?.grund, "upgrade_anfrage");
  });
});

describe("V — enthaltener Live-Zugang", () => {
  const ende = new Date("2027-02-10T12:00:00Z");
  const live = (t: Partial<NonNullable<KundeZustand["live"]>> = {}) => ({ endeAm: ende, aboGebucht: false, erstattet: false, protokoll: {}, ...t });
  it("V01 drei Tage vor dem Ende, V02 am Ende", () => {
    assert.equal(entscheideKunde(z({ ausbildung: null, live: live(), jetzt: new Date(ende.getTime() - 3 * T + H) })).senden?.vorlage, "V01");
    assert.equal(
      entscheideKunde(z({ ausbildung: null, live: live({ protokoll: { V01: { status: "gesendet" } } }), jetzt: new Date(ende.getTime() + H) })).senden?.vorlage,
      "V02",
    );
  });
  it("34 · Frühe Live-Abo-Buchung: V01/V02 stoppen", () => {
    const r = entscheideKunde(z({ ausbildung: null, live: live({ aboGebucht: true }), jetzt: new Date(ende.getTime() - 3 * T + H) }));
    assert.equal(r.senden, null);
    assert.equal(r.protokoll[0]?.grund, "live_abo");
  });
  it("V01 nicht nach dem Ende", () => {
    const r = entscheideKunde(z({ ausbildung: null, live: live(), jetzt: new Date(ende.getTime() + H) }));
    assert.ok(r.protokoll.some((p) => p.vorlage === "V01" && p.grund === "verpasst"));
    assert.equal(r.senden?.vorlage, "V02");
  });
  it("Priorität: V01 vor einer gleichzeitig fälligen U-Mail", () => {
    const r = entscheideKunde(
      z({ jetzt: um(14 * T + H), live: { endeAm: um(17 * T), aboGebucht: false, erstattet: false, protokoll: {} } }),
    );
    assert.equal(r.senden?.vorlage, "V01");
  });
});
