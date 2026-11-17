/**
 * Abnahmetests des E-Mail-Playbooks (Kapitel 13) für den Free-Kurs —
 * gegen die reine Entscheidungsfunktion. Start: `npm run test:mails`.
 * Nummern in den Testnamen = Testnummern im Playbook.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entscheideFree, type FreeZustand } from "./free-entscheidung";
import { plusKalendertageBerlin } from "./zeit";

const H = 3_600_000;
const T = 24 * H;
const START = new Date("2026-11-10T09:00:00Z");

function zustand(teil: Partial<Omit<FreeZustand, "zugang" | "kurs">> & {
  zugang?: Partial<FreeZustand["zugang"]>;
  kurs?: Partial<FreeZustand["kurs"]>;
} = {}): FreeZustand {
  const { zugang, kurs, ...rest } = teil;
  return {
    jetzt: START,
    gesperrt: false,
    abgemeldet: false,
    pause: false,
    gekauft: false,
    anfrage: false,
    termin: false,
    protokoll: {},
    letzteMarketingAm: START, // A02 ging bei der Freischaltung raus
    ...rest,
    zugang: {
      freigeschaltetAm: START,
      originalEndeAm: plusKalendertageBerlin(START, 30),
      verlaengerungStatus: "keine",
      verlaengertAm: null,
      verlaengerungEndeAm: null,
      gestartetAm: null,
      ausBestand: false,
      ...zugang,
    },
    kurs: { videosDa: 5, fertig: {}, abgeschlossen: false, ...kurs },
  };
}
const um = (ms: number) => new Date(START.getTime() + ms);

describe("Zeit", () => {
  it("30 Kalendertage behalten die Berliner Uhrzeit über die Zeitumstellung", () => {
    const vorher = new Date("2026-10-10T08:00:00Z"); // 10:00 Sommerzeit
    const nachher = plusKalendertageBerlin(vorher, 30); // 09.11., 10:00 Winterzeit
    assert.equal(nachher.toISOString(), "2026-11-09T09:00:00.000Z");
  });
});

describe("S — noch kein Lernstart", () => {
  it("04 · S01 nach 24 h, solange kein Start", () => {
    const r = entscheideFree(zustand({ jetzt: um(24 * H + 60_000) }));
    assert.equal(r.senden?.vorlage, "S01");
  });
  it("04 · S02 nach 72 h", () => {
    const r = entscheideFree(
      zustand({ jetzt: um(72 * H + 60_000), protokoll: { S01: { status: "gesendet", gesendetAm: um(24 * H) } }, letzteMarketingAm: um(24 * H) }),
    );
    assert.equal(r.senden?.vorlage, "S02");
  });
  it("05 · Start 5 Minuten vor S02 — S02 fällt aus", () => {
    const r = entscheideFree(
      zustand({
        jetzt: um(72 * H + 60_000),
        zugang: { gestartetAm: um(72 * H - 5 * 60_000) },
        protokoll: { S01: { status: "gesendet", gesendetAm: um(24 * H) } },
        letzteMarketingAm: um(24 * H),
      }),
    );
    assert.equal(r.senden, null);
    assert.deepEqual(r.protokoll.map((p) => [p.vorlage, p.grund]), [["S02", "lernstart"]]);
  });
});

describe("L — Lernfortschritt", () => {
  it("06 · Alle Videos an einem Tag: L04 erst 24 h nach A02, kein Stapel", () => {
    const g = um(2 * H);
    const fertig = { 1: true, 2: true, 3: true, 4: true, 5: true };
    const frueh = entscheideFree(zustand({ jetzt: um(10 * H), zugang: { gestartetAm: g }, kurs: { fertig, abgeschlossen: true } }));
    assert.equal(frueh.senden, null);
    const spaeter = entscheideFree(zustand({ jetzt: um(24 * H + 60_000), zugang: { gestartetAm: g }, kurs: { fertig, abgeschlossen: true } }));
    assert.equal(spaeter.senden?.vorlage, "L04");
    // Tag 3: L01 wird übersprungen, nicht nachgeschickt
    const tag3 = entscheideFree(
      zustand({
        jetzt: um(2 * T + 3 * H),
        zugang: { gestartetAm: g },
        kurs: { fertig, abgeschlossen: true },
        protokoll: { L04: { status: "gesendet", gesendetAm: um(24 * H) } },
        letzteMarketingAm: um(24 * H),
      }),
    );
    assert.deepEqual(tag3.protokoll.filter((p) => p.vorlage.startsWith("L")).map((p) => [p.vorlage, p.grund]), [["L01", "video5_fertig"]]);
  });
  it("07 · Nur AMT abgeschlossen: L01 entfällt, L02 bleibt", () => {
    const g = START;
    const r = entscheideFree(zustand({ jetzt: um(2 * T + H), zugang: { gestartetAm: g }, kurs: { fertig: { 1: true, 3: true } }, letzteMarketingAm: null }));
    assert.deepEqual(r.protokoll.filter((p) => p.vorlage.startsWith("L")).map((p) => [p.vorlage, p.grund]), [["L01", "video3_fertig"]]);
    const r2 = entscheideFree(
      zustand({
        jetzt: um(5 * T + H),
        zugang: { gestartetAm: g },
        kurs: { fertig: { 1: true, 3: true } },
        protokoll: { L01: { status: "uebersprungen", gesendetAm: null } },
        letzteMarketingAm: null,
      }),
    );
    assert.equal(r2.senden?.vorlage, "L02");
  });
  it("08 · Anfrage direkt nach Video 1 stoppt S/L/I", () => {
    const r = entscheideFree(zustand({ jetzt: um(2 * T + H), zugang: { gestartetAm: START }, anfrage: true, letzteMarketingAm: null }));
    assert.equal(r.senden, null);
    assert.ok(r.protokoll.every((p) => p.status === "gestoppt" && p.grund === "anfrage"));
  });
  it("10 · Persönliche Pause hält zurück, nach 24 h Verzug wird übersprungen", () => {
    const halt = entscheideFree(zustand({ jetzt: um(24 * H + H), pause: true, letzteMarketingAm: null }));
    assert.equal(halt.senden, null);
    assert.deepEqual(halt.wartet.map((w) => w.grund), ["pause"]);
    const spaet = entscheideFree(zustand({ jetzt: um(50 * H), pause: true, letzteMarketingAm: null }));
    assert.deepEqual(spaet.protokoll.map((p) => [p.vorlage, p.grund]), [["S01", "verpasst"]]);
  });
  it("11 · Marketing abgemeldet: keine M-Mail, auch keine E05", () => {
    const ende = um(30 * T);
    const r = entscheideFree(
      zustand({
        jetzt: um(40 * T),
        abgemeldet: true,
        zugang: { verlaengerungStatus: "aktiv", verlaengertAm: ende, verlaengerungEndeAm: um(37 * T) },
        protokoll: { E01: { status: "gesendet", gesendetAm: null }, E02: { status: "gesendet", gesendetAm: null } },
      }),
    );
    assert.equal(r.senden, null);
    assert.ok(r.protokoll.some((p) => p.vorlage === "E05" && p.grund === "abgemeldet"));
  });
  it("Mindestabstand: zwei fällige Mails gehen nicht am selben Tag", () => {
    const r = entscheideFree(zustand({ jetzt: um(73 * H), letzteMarketingAm: um(60 * H) }));
    assert.equal(r.senden, null);
    assert.ok(r.wartet.every((w) => w.grund === "abstand"));
  });
});

describe("I — Einladung ohne Anfrage", () => {
  it("I01 zwei Tage nach dem tatsächlichen L04-Versand", () => {
    const l04 = um(10 * T);
    const r = entscheideFree(
      zustand({
        jetzt: um(12 * T + H),
        zugang: { gestartetAm: START },
        kurs: { fertig: { 1: true, 3: true, 4: true, 5: true }, abgeschlossen: true },
        protokoll: {
          L01: { status: "uebersprungen", gesendetAm: null },
          L02: { status: "uebersprungen", gesendetAm: null },
          L03: { status: "uebersprungen", gesendetAm: null },
          L04: { status: "gesendet", gesendetAm: l04 },
        },
        letzteMarketingAm: l04,
      }),
    );
    assert.equal(r.senden?.vorlage, "I01");
  });
});

describe("E — Ende und Verlängerung", () => {
  const ende = plusKalendertageBerlin(START, 30);
  const alleLS = {
    S01: { status: "gestoppt", gesendetAm: null },
    S02: { status: "gestoppt", gesendetAm: null },
  } as const;
  it("26 · Sieben Tage vor Ende: keine Mail", () => {
    const r = entscheideFree(zustand({ jetzt: new Date(ende.getTime() - 7 * T), protokoll: { ...alleLS }, letzteMarketingAm: null }));
    assert.equal(r.senden, null);
  });
  it("E01 24 h vor dem Ende bei offenem Kurs", () => {
    const r = entscheideFree(zustand({ jetzt: new Date(ende.getTime() - 20 * H), protokoll: { ...alleLS }, letzteMarketingAm: null }));
    assert.equal(r.senden?.vorlage, "E01");
  });
  it("27 · Kurs fertig: E01 entfällt", () => {
    const r = entscheideFree(
      zustand({ jetzt: new Date(ende.getTime() - 20 * H), protokoll: { ...alleLS }, kurs: { abgeschlossen: true }, letzteMarketingAm: null }),
    );
    assert.deepEqual(r.protokoll.map((p) => [p.vorlage, p.grund]), [["E01", "kurs_fertig"]]);
  });
  it("E01 wird nach dem Ende nicht mehr geschickt", () => {
    const r = entscheideFree(zustand({ jetzt: new Date(ende.getTime() + H), protokoll: { ...alleLS }, letzteMarketingAm: null }));
    assert.ok(r.protokoll.some((p) => p.vorlage === "E01" && p.grund === "verpasst"));
    assert.equal(r.senden?.vorlage, "E02");
  });
  it("29 · Verlängerung an Tag 34: E02 überholt, E04/E05 hängen am neuen Ende", () => {
    const verl = new Date(ende.getTime() + 4 * T);
    const verlEnde = plusKalendertageBerlin(verl, 7);
    const r = entscheideFree(
      zustand({
        jetzt: new Date(verlEnde.getTime() - 10 * H),
        protokoll: { ...alleLS, E01: { status: "gesendet", gesendetAm: null }, E02: { status: "gesendet", gesendetAm: null } },
        zugang: { verlaengerungStatus: "aktiv", verlaengertAm: verl, verlaengerungEndeAm: verlEnde },
        letzteMarketingAm: null,
      }),
    );
    assert.equal(r.senden?.vorlage, "E04");
  });
  it("30 · Verlängerung endet, Gespräch schon geführt: E05 trotzdem einmal", () => {
    const verlEnde = new Date(ende.getTime() + 7 * T);
    const r = entscheideFree(
      zustand({
        jetzt: new Date(verlEnde.getTime() + H),
        termin: true,
        pause: true,
        protokoll: { ...alleLS, E01: { status: "gesendet", gesendetAm: null }, E02: { status: "gesendet", gesendetAm: null }, E04: { status: "gesendet", gesendetAm: null } },
        zugang: { verlaengerungStatus: "aktiv", verlaengertAm: ende, verlaengerungEndeAm: verlEnde },
        letzteMarketingAm: null,
      }),
    );
    assert.equal(r.senden?.vorlage, "E05");
  });
  it("31 · Kauf kurz vor Free-Ende: keine Sperr-/Ablaufmail", () => {
    const r = entscheideFree(zustand({ jetzt: new Date(ende.getTime() - 20 * H), gekauft: true, protokoll: { ...alleLS }, letzteMarketingAm: null }));
    assert.equal(r.senden, null);
    assert.ok(r.protokoll.every((p) => p.grund === "kauf"));
  });
  it("12 · Bestandskonto: keine Start-/Lernfolge, aber Ablaufhinweis", () => {
    const s = entscheideFree(zustand({ jetzt: um(25 * H), zugang: { ausBestand: true }, letzteMarketingAm: null }));
    assert.deepEqual(s.protokoll.map((p) => [p.vorlage, p.grund]), [["S01", "bestand"]]);
    const e = entscheideFree(
      zustand({ jetzt: new Date(ende.getTime() - 20 * H), zugang: { ausBestand: true }, protokoll: { ...alleLS }, letzteMarketingAm: null }),
    );
    assert.equal(e.senden?.vorlage, "E01");
  });
  it("Priorität: E01 vor einer gleichzeitig fälligen Lernmail", () => {
    const r = entscheideFree(
      zustand({
        jetzt: new Date(ende.getTime() - 20 * H),
        zugang: { gestartetAm: new Date(ende.getTime() - 8 * T - 2 * H) },
        protokoll: { ...alleLS, L01: { status: "gesendet", gesendetAm: null }, L02: { status: "gesendet", gesendetAm: null } },
        letzteMarketingAm: null,
      }),
    );
    assert.equal(r.senden?.vorlage, "E01");
  });
});
