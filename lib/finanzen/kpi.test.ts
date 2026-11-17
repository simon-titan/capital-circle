import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { euroText as euroRoh, quoteText as quoteRoh, steuerFallback19Inkl } from "./geld";
import {
  closeRate,
  freeZuPaid,
  gebuchteCalls,
  leadQualitaet,
  liveAboMrr,
  neueKunden,
  showUp,
  vertragsvolumen,
  zahlungseingang,
  type CallZeile,
  type GeldZeile,
  type OrderZeile,
} from "./kpi";

// Intl setzt geschützte Leerzeichen vor „€" und „%"; verglichen wird der sichtbare Text.
const euroText = (c: number | null) => euroRoh(c).replace(/ /g, " ");
const quoteText = (w: number | null) => quoteRoh(w).replace(/ /g, " ");

/**
 * KPI-Rechentests aus „Tracking Ablaufkarten & QA", Kapitel 4 (Mock-Beispiele,
 * keine echten Zahlen). Die erwarteten Anzeigewerte stehen wörtlich dort.
 */

const JETZT = new Date("2026-12-31T12:00:00Z");
const OKT = { von: new Date("2026-10-01T00:00:00Z"), bis: new Date("2026-11-01T00:00:00Z") };

function call(i: number, status: string, start = "2026-10-10T14:00:00Z", email = `k${i}@test.de`): CallZeile {
  return { id: `t${i}`, vorgang: `v${i}`, email, startAm: start, erstelltAm: "2026-10-01T10:00:00Z", status, closerId: null };
}

function zahlung(i: number, email: string, am: string, brutto = 300_000, produkt = "main"): GeldZeile {
  const { nettoCents, steuerCents } = steuerFallback19Inkl(brutto);
  return { id: `p${i}`, art: "zahlung", email, kaufId: `k${i}`, produkt, bruttoCents: brutto, steuerCents, nettoCents, gebuehrCents: null, gebuchtAm: am, closerId: null, steuerQuelle: "stripe" };
}

describe("Show-up (QA 4: 8 held, 2 no_show, 3 cancelled_pre_call)", () => {
  const calls = [
    ...Array.from({ length: 8 }, (_, i) => call(i, "gefuehrt")),
    ...Array.from({ length: 2 }, (_, i) => call(10 + i, "no_show")),
    call(20, "abgesagt_kunde"),
    call(21, "abgesagt_kunde"),
    call(22, "abgesagt_team"),
    call(23, "umgebucht"),
    call(24, "gebucht"),
  ];
  const s = showUp(calls, OKT);
  it("operational 8/(8+2) = 80,0 %, Absagen separat", () => {
    assert.equal(s.operational.zaehler, 8);
    assert.equal(s.operational.nenner, 10);
    assert.equal(quoteText(s.operational.wert), "80,0 %");
    assert.equal(s.abgesagt, 3);
  });
  it("scheduled 8/(8+2+3) = 61,5 %", () => {
    assert.equal(s.scheduled.nenner, 13);
    assert.equal(quoteText(s.scheduled.wert), "61,5 %");
  });
  it("ohne Population No Data statt 0 %", () => {
    assert.equal(quoteText(showUp([], OKT).operational.wert), "No Data");
  });
});

describe("Gebuchte Calls: Umbuchung zählt einmal (QA-Karte 7)", () => {
  it("zwei Versionen desselben Vorgangs = 1", () => {
    const a = { ...call(1, "umgebucht"), vorgang: "v-x", erstelltAm: "2026-10-02T10:00:00Z" };
    const b = { ...call(2, "gebucht"), vorgang: "v-x", erstelltAm: "2026-10-05T10:00:00Z" };
    assert.equal(gebuchteCalls([a, b, call(3, "gebucht")], OKT).wert, 2);
  });
});

describe("Close Rate 30 Tage (QA 4: 10 held Erstgespräche, 3 erste Zahlungen binnen 30 d)", () => {
  const calls = Array.from({ length: 10 }, (_, i) => call(i, "gefuehrt", "2026-10-20T14:00:00Z"));
  const geld = [
    zahlung(0, "k0@test.de", "2026-10-21T10:00:00Z"),
    zahlung(1, "k1@test.de", "2026-11-05T10:00:00Z"), // Monat 2, im 30-Tage-Fenster (QA-Karte 23)
    zahlung(2, "k2@test.de", "2026-11-19T10:00:00Z"),
    zahlung(3, "k3@test.de", "2026-12-10T10:00:00Z"), // nach 30, vor 60 Tagen
  ];
  it("30,0 %", () => {
    const r = closeRate(calls, geld, OKT, 30, JETZT);
    assert.equal(r.zaehler, 3);
    assert.equal(r.nenner, 10);
    assert.equal(quoteText(r.wert), "30,0 %");
    assert.equal(r.qualitaet, "complete");
  });
  it("60-Tage-Zusatzsicht zieht den späteren Kauf nach", () => {
    assert.equal(closeRate(calls, geld, OKT, 60, JETZT).zaehler, 4);
  });
  it("laufendes Fenster = partial", () => {
    assert.equal(closeRate(calls, geld, OKT, 30, new Date("2026-10-25T00:00:00Z")).qualitaet, "partial");
  });
});

describe("Free → Paid (QA 4: 100 Freischaltungen, 7 zahlende Mentoringkunden)", () => {
  it("7,0 %", () => {
    const frei = Array.from({ length: 100 }, (_, i) => ({ userId: `u${i}`, email: `f${i}@test.de`, freigeschaltetAm: "2026-10-05T10:00:00Z" }));
    const geld = Array.from({ length: 7 }, (_, i) => zahlung(i, `f${i}@test.de`, "2026-10-20T10:00:00Z", 79_900, "ausbildung"));
    geld.push({ ...zahlung(99, "f50@test.de", "2026-10-20T10:00:00Z", 9_900, "live") }); // Live-Abo ist kein Mentoringkunde
    const r = freeZuPaid(frei, geld, OKT, 30, JETZT);
    assert.equal(quoteText(r.wert), "7,0 %");
  });
});

describe("Netto-Zahlungseingang (QA 4: 3.000 € inkl. 19 % voll bezahlt, kein Refund)", () => {
  it("2.521,01 €", () => {
    const r = zahlungseingang([zahlung(1, "a@test.de", "2026-10-10T10:00:00Z")], OKT);
    assert.equal(r.nettoCents, 252_101);
    assert.equal(euroText(r.nettoCents), "2.521,01 €");
  });
  it("Teilerstattung reduziert das Netto, Zahlung bleibt", () => {
    const erst: GeldZeile = { ...zahlung(2, "a@test.de", "2026-10-12T10:00:00Z", -50_000), art: "erstattung" };
    const r = zahlungseingang([zahlung(1, "a@test.de", "2026-10-10T10:00:00Z"), erst], OKT);
    assert.equal(r.zahlungen.nettoCents, 252_101);
    assert.equal(r.nettoCents, 252_101 + erst.nettoCents);
  });
});

describe("Neue Kunden: distinct, erste Zahlung im Zeitraum", () => {
  it("zwei Raten desselben Kunden = 1, Kunde mit erster Zahlung vorher = 0", () => {
    const geld = [
      zahlung(1, "a@test.de", "2026-10-10T10:00:00Z", 50_000),
      zahlung(2, "A@test.de", "2026-10-25T10:00:00Z", 50_000),
      zahlung(3, "b@test.de", "2026-09-10T10:00:00Z"),
      zahlung(4, "b@test.de", "2026-10-10T10:00:00Z"),
    ];
    assert.equal(neueKunden(geld, OKT).wert, 1);
  });
});

describe("Upgrade-Volumen (QA 4: 799 Ausbildung vorhanden, Main-Upgrade 2.501)", () => {
  it("neues Volumen 2.501 €, nicht 3.300 €", () => {
    const orders: OrderZeile[] = [
      { id: "aus", email: "a@test.de", produkt: "ausbildung", bruttoCents: 79_900, nettoCents: null, gekauftAm: "2026-08-01T10:00:00Z", upgradeVon: null, closerId: null, status: "vollstaendig" },
      { id: "up", email: "a@test.de", produkt: "main", bruttoCents: 250_100, nettoCents: null, gekauftAm: "2026-10-10T10:00:00Z", upgradeVon: "aus", closerId: null, status: "aktiv" },
    ];
    const r = vertragsvolumen(orders, OKT);
    assert.equal(r.bruttoCents, 250_100);
    assert.equal(euroText(r.bruttoCents), "2.501,00 €");
    assert.equal(r.qualitaet, "partial"); // Netto ohne Zahlung nur geschätzt
  });
});

describe("Live-Abo-MRR (QA 4: 10 aktive 99-€-Abos bei 19 %, 20 Inklusivzugänge)", () => {
  it("nur 10 echte Abos, Netto 831,90 €; Inklusivzugänge stehen nicht in der Liste", () => {
    const abos = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, status: "active", bruttoMonatCents: 9_900, nettoMonatCents: 8_319 }));
    abos.push({ id: "probe", status: "trialing", bruttoMonatCents: 9_900, nettoMonatCents: 8_319 });
    abos.push({ id: "mahn", status: "past_due", bruttoMonatCents: 9_900, nettoMonatCents: 8_319 });
    const r = liveAboMrr(abos);
    assert.equal(r.aktiv, 10);
    assert.equal(r.wert, 83_190);
    assert.equal(euroText(r.wert), "831,90 €");
  });
  it("ohne Abos 0 € — MRR ist ein Bestand, keine Quote", () => {
    assert.equal(liveAboMrr([]).wert, 0);
  });
});

describe("Leadqualität je Antwortkategorie", () => {
  it("zählt Leads, Termine, held und Kunden je Antwort", () => {
    const leads = [
      { email: "a@test.de", kategorien: { investition: "5.000 € oder mehr" } },
      { email: "b@test.de", kategorien: { investition: "5.000 € oder mehr" } },
      { email: "c@test.de", kategorien: { investition: "Unter 1.500 €" } },
    ];
    const calls = [call(1, "gefuehrt", undefined, "a@test.de"), call(2, "no_show", undefined, "b@test.de")];
    const r = leadQualitaet(leads, calls, [zahlung(1, "a@test.de", "2026-10-11T10:00:00Z")]);
    const hoch = r.find((z) => z.antwort === "5.000 € oder mehr")!;
    assert.deepEqual([hoch.leads, hoch.gebucht, hoch.held, hoch.noShow, hoch.kunden], [2, 2, 1, 1, 1]);
    assert.equal(hoch.showUp, 0.5);
    assert.equal(r.find((z) => z.antwort === "Unter 1.500 €")!.close, null);
  });
});
