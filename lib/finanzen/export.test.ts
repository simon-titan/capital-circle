import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ermittleCredit, type CreditTermin } from "./credit";
import { csv, csvZelle } from "./csv";
import { berlinMitternacht, berlinPeriode, zeitraumAus } from "./zeit";
import { crc32, leseZipStored, zipStored } from "./zip";
import type { TeamMitglied } from "@/lib/crm/zuweisung";

describe("CSV nach RFC 4180 mit Formel-Escaping", () => {
  it("quotet Komma, Anführungszeichen und Zeilenumbruch", () => {
    assert.equal(csvZelle('a,b'), '"a,b"');
    assert.equal(csvZelle('sagt "hallo"'), '"sagt ""hallo"""');
    assert.equal(csvZelle("zwei\nzeilen"), '"zwei\nzeilen"');
  });
  it("entschärft Formeln, lässt negative Zahlen stehen", () => {
    assert.equal(csvZelle("=HYPERLINK(1)"), "'=HYPERLINK(1)");
    assert.equal(csvZelle("+49 170"), "'+49 170");
    assert.equal(csvZelle("@sum"), "'@sum");
    assert.equal(csvZelle("-12.50"), "-12.50");
    assert.equal(csvZelle(-1250), "-1250");
  });
  it("ISO-UTC für Zeitpunkte, CRLF, feste Spaltenzahl", () => {
    const out = csv(["a", "b"], [[new Date("2026-11-08T10:00:00Z"), null]]);
    assert.equal(out, "a,b\r\n2026-11-08T10:00:00.000Z,\r\n");
    assert.throws(() => csv(["a"], [[1, 2]]));
  });
});

describe("ZIP (stored)", () => {
  it("schreibt und liest Dateien samt CRC und UTF-8-Namen", () => {
    const enc = new TextEncoder();
    const zip = zipStored([
      { name: "README.md", daten: enc.encode("# Größe\n") },
      { name: "leer.csv", daten: new Uint8Array() },
    ]);
    const dateien = leseZipStored(zip);
    assert.deepEqual(dateien.map((d) => d.name), ["README.md", "leer.csv"]);
    assert.equal(new TextDecoder().decode(dateien[0]!.daten), "# Größe\n");
  });
  it("CRC-32 nach Standard", () => {
    assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  });
});

describe("Europe/Berlin und Sommerzeit", () => {
  it("Mitternacht am Umstellungstag", () => {
    assert.equal(berlinMitternacht("2026-03-29").toISOString(), "2026-03-28T23:00:00.000Z");
    assert.equal(berlinMitternacht("2026-03-30").toISOString(), "2026-03-29T22:00:00.000Z");
    assert.equal(berlinMitternacht("2026-10-25").toISOString(), "2026-10-24T22:00:00.000Z");
    assert.equal(berlinMitternacht("2026-10-26").toISOString(), "2026-10-25T23:00:00.000Z");
  });
  it("Abrechnungsperiode nach Berliner Datum", () => {
    assert.equal(berlinPeriode("2026-10-31T23:30:00Z"), "2026-11");
  });
  it("30 Tage = 30 Berliner Kalendertage inklusive heute", () => {
    const z = zeitraumAus("30", new Date("2026-11-08T12:00:00Z"))!;
    assert.equal(z.von.toISOString(), "2026-10-09T22:00:00.000Z");
    assert.equal(z.bis.toISOString(), "2026-11-08T23:00:00.000Z");
    assert.equal(zeitraumAus("gesamt", new Date()), null);
  });
});

describe("Verkaufs-Credit (Regel Simon 08.11.2026, QA-Karte 18)", () => {
  const team: TeamMitglied[] = [
    { user_id: "d", name: "Daniel", kuerzel: "daniel", calendly_email: null, block_von: "13:00", block_bis: "14:00", aktiv: true },
    { user_id: "k", name: "Kevin", kuerzel: "kevin", calendly_email: null, block_von: "15:00", block_bis: "17:00", aktiv: true },
    { user_id: "s", name: "Simon", kuerzel: "simon", calendly_email: null, block_von: "17:00", block_bis: "19:00", aktiv: true },
  ];
  const t = (id: string, start: string, status = "gefuehrt", gesetztVon: string | null = null): CreditTermin => ({
    id,
    start_am: start,
    status,
    gefuehrt_am: start,
    berater_email: null,
    gesetzt_von: gesetztVon,
  });

  it("geht an den Closer des letzten geführten Calls vor dem Kauf, nicht an den aktuellen CRM-Closer", () => {
    const c = ermittleCredit({
      kaufAm: "2026-11-05T10:00:00Z",
      termine: [t("alt", "2026-11-01T12:30:00Z"), t("neu", "2026-11-03T14:30:00Z"), t("danach", "2026-11-06T16:00:00Z")],
      team,
      kassenlinkKuerzel: "simon",
      crmCloserId: "k",
    });
    assert.deepEqual(c, { closerId: "k", kuerzel: "kevin", regel: "gefuehrter_call", terminId: "neu" });
  });
  it("wer den Call auf geführt gesetzt hat, schlägt die Blockregel", () => {
    const c = ermittleCredit({ kaufAm: "2026-11-05T10:00:00Z", termine: [t("x", "2026-11-03T12:30:00Z", "gefuehrt", "s")], team, kassenlinkKuerzel: null, crmCloserId: null });
    assert.equal(c.closerId, "s");
  });
  it("No-Show zählt nicht; Fallback Kassenlink, dann CRM, dann unassigned", () => {
    const ns = [t("x", "2026-11-03T12:30:00Z", "no_show")];
    assert.equal(ermittleCredit({ kaufAm: "2026-11-05T10:00:00Z", termine: ns, team, kassenlinkKuerzel: "simon", crmCloserId: "k" }).regel, "kassenlink");
    assert.equal(ermittleCredit({ kaufAm: "2026-11-05T10:00:00Z", termine: ns, team, kassenlinkKuerzel: null, crmCloserId: "k" }).closerId, "k");
    assert.equal(ermittleCredit({ kaufAm: "2026-11-05T10:00:00Z", termine: [], team, kassenlinkKuerzel: null, crmCloserId: null }).regel, "unassigned");
  });
});
