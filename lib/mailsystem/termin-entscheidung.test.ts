/**
 * Abnahmetests des E-Mail-Playbooks (Kapitel 13, Tests 13–24) für Kalender,
 * Termine und No-Show — gegen die reinen Entscheidungsfunktionen.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entscheideAnfrage, entscheideTermin, type AnfrageZustand, type TerminZustand } from "./termin-entscheidung";

const H = 3_600_000;
const MIN = 60_000;
const START = new Date("2026-11-20T15:00:00Z");

function termin(t: Partial<TerminZustand> = {}): TerminZustand {
  return {
    jetzt: START,
    gesperrt: false,
    abgemeldet: false,
    pause: false,
    gekauft: false,
    letzteMarketingAm: null,
    start: START,
    bestaetigtAm: new Date(START.getTime() - 72 * H),
    status: "gebucht",
    noShowAm: null,
    noShowNummer: 0,
    neuGebucht: false,
    t02Vorgang: false,
    video5Da: true,
    protokoll: {},
    ...t,
  };
}
const vor = (ms: number) => new Date(START.getTime() - ms);
const nach = (ms: number) => new Date(START.getTime() + ms);

function anfrage(a: Partial<AnfrageZustand> = {}): AnfrageZustand {
  const ab = new Date("2026-11-10T10:00:00Z");
  return {
    jetzt: ab,
    gesperrt: false,
    abgemeldet: false,
    pause: false,
    gekauft: false,
    letzteMarketingAm: null,
    kalenderAb: ab,
    terminGebucht: false,
    abgeschlossen: false,
    protokoll: {},
    ...a,
  };
}

describe("B — Kalender offen, kein Termin", () => {
  const ab = new Date("2026-11-10T10:00:00Z");
  it("13 · Buchung nach 5 Minuten: keine B-Mail", () => {
    const r = entscheideAnfrage(anfrage({ jetzt: new Date(ab.getTime() + 16 * MIN), terminGebucht: true }));
    assert.equal(r.senden, null);
    assert.deepEqual(r.protokoll.map((p) => [p.vorlage, p.grund]), [["B01", "termin"]]);
  });
  it("14 · Nicht gebucht: B01 +15 min, B02 frühestens 24 h nach B01, B03 ab +72 h", () => {
    assert.equal(entscheideAnfrage(anfrage({ jetzt: new Date(ab.getTime() + 16 * MIN) })).senden?.vorlage, "B01");
    const b01 = new Date(ab.getTime() + 16 * MIN);
    const zuFrueh = entscheideAnfrage(
      anfrage({ jetzt: new Date(ab.getTime() + 24 * H + 5 * MIN), protokoll: { B01: { status: "gesendet" } }, letzteMarketingAm: b01 }),
    );
    assert.equal(zuFrueh.senden, null);
    const b02 = entscheideAnfrage(
      anfrage({ jetzt: new Date(ab.getTime() + 24 * H + 20 * MIN), protokoll: { B01: { status: "gesendet" } }, letzteMarketingAm: b01 }),
    );
    assert.equal(b02.senden?.vorlage, "B02");
    const b03 = entscheideAnfrage(
      anfrage({
        jetzt: new Date(ab.getTime() + 72 * H + 5 * MIN),
        protokoll: { B01: { status: "gesendet" }, B02: { status: "gesendet" } },
        letzteMarketingAm: new Date(ab.getTime() + 24 * H + 20 * MIN),
      }),
    );
    assert.equal(b03.senden?.vorlage, "B03");
  });
});

describe("T — gebuchter Termin", () => {
  it("Mindestens 60 h Vorlauf: T02 −48 h, T03 −24 h, T04 −30 min", () => {
    assert.equal(entscheideTermin(termin({ jetzt: vor(48 * H - MIN) })).senden?.vorlage, "T02");
    assert.equal(entscheideTermin(termin({ jetzt: vor(24 * H - MIN), protokoll: { T02: { status: "gesendet" } } })).senden?.vorlage, "T03");
    assert.equal(
      entscheideTermin(termin({ jetzt: vor(30 * MIN - MIN), protokoll: { T02: { status: "gesendet" }, T03: { status: "gesendet" } } })).senden?.vorlage,
      "T04",
    );
  });
  it("15 · Buchung 49 h vorher: T02 entfällt, T03/T04 korrekt", () => {
    const b = vor(49 * H);
    const r = entscheideTermin(termin({ bestaetigtAm: b, jetzt: vor(48 * H - MIN) }));
    assert.deepEqual(r.protokoll.map((p) => [p.vorlage, p.grund]), [["T02", "zu_kurzfristig"]]);
    assert.equal(entscheideTermin(termin({ bestaetigtAm: b, jetzt: vor(24 * H - MIN), protokoll: { T02: { status: "uebersprungen" } } })).senden?.vorlage, "T03");
  });
  it("16 · Buchung 8 h vorher: nur T04, keine nachgeholte T02/T03", () => {
    const b = vor(8 * H);
    const r = entscheideTermin(termin({ bestaetigtAm: b, jetzt: vor(29 * MIN) }));
    assert.equal(r.senden?.vorlage, "T04");
    assert.deepEqual(r.protokoll.map((p) => p.vorlage).sort(), ["T02", "T03"]);
  });
  it("17 · Buchung 90 min vorher: kein T04", () => {
    const r = entscheideTermin(termin({ bestaetigtAm: vor(90 * MIN), jetzt: vor(29 * MIN) }));
    assert.equal(r.senden, null);
    assert.ok(r.protokoll.some((p) => p.vorlage === "T04" && p.grund === "zu_kurzfristig"));
  });
  it("18 · Video 5 schon gesehen ist kein Stopp — T02 geht trotzdem", () => {
    assert.equal(entscheideTermin(termin({ jetzt: vor(47 * H) })).senden?.vorlage, "T02");
  });
  it("19 · Umbuchung nach gesendeter T02: keine zweite T02, T03 neu", () => {
    const r = entscheideTermin(termin({ t02Vorgang: true, jetzt: vor(24 * H - MIN) }));
    assert.equal(r.senden?.vorlage, "T03");
  });
  it("Marketing abgemeldet: keine T02, Terminorganisation bleibt", () => {
    const r = entscheideTermin(termin({ abgemeldet: true, jetzt: vor(24 * H - MIN) }));
    assert.equal(r.senden?.vorlage, "T03");
    assert.ok(r.protokoll.some((p) => p.vorlage === "T02" && p.grund === "abgemeldet"));
  });
  it("Pause unterdrückt T02, nicht T03/T04", () => {
    const r = entscheideTermin(termin({ pause: true, jetzt: vor(47 * H) }));
    assert.equal(r.senden, null);
    assert.deepEqual(r.wartet.map((w) => w.vorlage), ["T02"]);
  });
});

describe("N — bestätigter No-Show", () => {
  it("22 · Keine Sofortmail; N01 +24 h, N02 +72 h ab Terminstart", () => {
    const ns = nach(20 * MIN);
    assert.equal(entscheideTermin(termin({ status: "no_show", noShowAm: ns, noShowNummer: 1, jetzt: nach(2 * H) })).senden, null);
    assert.equal(entscheideTermin(termin({ status: "no_show", noShowAm: ns, noShowNummer: 1, jetzt: nach(24 * H + MIN) })).senden?.vorlage, "N01");
    const n02 = entscheideTermin(
      termin({ status: "no_show", noShowAm: ns, noShowNummer: 1, jetzt: nach(72 * H + MIN), protokoll: { N01: { status: "gesendet" } }, letzteMarketingAm: nach(24 * H) }),
    );
    assert.equal(n02.senden?.vorlage, "N02");
  });
  it("23 · Am Telefon neuer Termin vereinbart: N01/N02 stoppen", () => {
    const r = entscheideTermin(termin({ status: "no_show", noShowAm: nach(MIN), noShowNummer: 1, neuGebucht: true, jetzt: nach(25 * H) }));
    assert.deepEqual(r.protokoll.map((p) => [p.vorlage, p.grund]), [["N01", "neu_gebucht"]]);
  });
  it("24 · Zweiter bestätigter No-Show: manuell statt automatischem Kalender", () => {
    const r = entscheideTermin(termin({ status: "no_show", noShowAm: nach(MIN), noShowNummer: 2, jetzt: nach(25 * H) }));
    assert.equal(r.senden, null);
    assert.equal(r.protokoll[0]?.grund, "zweiter_no_show");
  });
  it("Gespräch geführt: keine T-/N-Mail mehr", () => {
    const r = entscheideTermin(termin({ status: "gefuehrt", jetzt: vor(20 * MIN) }));
    assert.equal(r.senden, null);
    assert.equal(r.protokoll.length, 0);
  });
});
