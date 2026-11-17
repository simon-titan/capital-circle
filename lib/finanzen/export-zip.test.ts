import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { berechneDashboard, type Rohdaten } from "./dashboard";
import { baueBuchhaltungsExport, baueChatGptExport } from "./export";
import { leseZipStored } from "./zip";

/**
 * Exporte und Dashboard gegen einen kontrollierten Mini-Datensatz (QA-Karte 19,
 * 26): alle Pflichtdateien, Manifest mit Zeilen und SHA-256, keine E-Mails,
 * Upgrade nur mit Zusatzauftrag, Closer-Filter ohne Doppelzählung.
 */

const t = (zeilen: Record<string, unknown>[]) => ({ zeilen, fehlt: false });
const DANIEL = "u-daniel";
const KEVIN = "u-kevin";

const roh: Rohdaten = {
  team: t([
    { user_id: DANIEL, name: "Daniel", kuerzel: "daniel", calendly_email: null, block_von: "13:00", block_bis: "14:00", aktiv: true, created_at: "2026-11-01T00:00:00Z" },
    { user_id: KEVIN, name: "Kevin", kuerzel: "kevin", calendly_email: null, block_von: "15:00", block_bis: "17:00", aktiv: true, created_at: "2026-11-01T00:00:00Z" },
  ]),
  kontakte: t([
    { id: "k1", email: "anna@test.de", name: "Anna", quelle: "call_funnel", quellen: ["call_funnel"], kanal: "instagram", closer_id: KEVIN, phase: "gewonnen", verlust_grund: null, wiedervorlage_am: null, verloren_am: null, created_at: "2026-11-02T10:00:00Z", user_id: "u-anna" },
    { id: "k2", email: "ben@test.de", name: "Ben", quelle: "training", quellen: ["training"], kanal: null, closer_id: DANIEL, phase: "gespraech", verlust_grund: null, wiedervorlage_am: "2026-11-03T10:00:00Z", verloren_am: null, created_at: "2026-11-02T11:00:00Z", user_id: null },
  ]),
  termine: t([
    { id: "t1", vorgang: "discord:1", lead_art: "discord", email: "anna@test.de", start_am: "2026-11-03T12:30:00Z", created_at: "2026-11-02T10:05:00Z", status: "gefuehrt", berater_email: null, gesetzt_von: DANIEL, gefuehrt_am: "2026-11-03T13:30:00Z", vorgaenger_id: null, abgesagt_am: null, no_show_am: null },
    { id: "t2", vorgang: "training:2", lead_art: "training", email: "ben@test.de", start_am: "2026-11-04T14:30:00Z", created_at: "2026-11-02T11:05:00Z", status: "no_show", berater_email: null, gesetzt_von: null, gefuehrt_am: null, vorgaenger_id: null, abgesagt_am: null, no_show_am: "2026-11-04T15:00:00Z" },
  ]),
  ergebnisse: t([{ id: "e1", termin_id: "t1", version: 1, outcome: "won_payment_pending", produkt: "main", grund: null, notiz: "privat", follow_up_am: "2026-11-05T10:00:00Z", am: "2026-11-03T13:31:00Z" }]),
  kaeufe: t([
    { id: "cs_aus", user_id: "u-anna", email: "anna@test.de", produkt: "ausbildung", zahlweise: "einmal", raten_gesamt: null, raten_betrag_cents: null, soll_cents: 79_900, status: "vollstaendig", gekauft_am: "2026-08-01T10:00:00Z", anrechnung_cents: 0, upgrade_von_kauf_id: null, credit_regel: "unassigned", credit_closer_id: null, closer: null },
    { id: "cs_main", user_id: "u-anna", email: "anna@test.de", produkt: "main", zahlweise: "einmal", raten_gesamt: null, raten_betrag_cents: null, soll_cents: 250_100, status: "aktiv", gekauft_am: "2026-11-04T10:00:00Z", anrechnung_cents: 49_900, upgrade_von_kauf_id: "cs_aus", credit_regel: "gefuehrter_call", credit_closer_id: DANIEL, closer: "kevin" },
  ]),
  buchungen: t([
    { id: "b1", art: "zahlung", status: "gebucht", stripe_objekt_id: "pi_1", kauf_id: "cs_main", produkt: "main", rate_nr: 1, email: "anna@test.de", brutto_cents: 250_100, steuer_cents: 39_932, netto_cents: 210_168, steuer_quelle: "stripe", gebuehr_cents: 3_800, gebucht_am: "2026-11-04T10:01:00Z", eingegangen_am: "2026-11-04T10:01:05Z", waehrung: "eur" },
    { id: "b2", art: "erstattung", status: "gebucht", stripe_objekt_id: "re_1", kauf_id: "cs_main", produkt: "main", rate_nr: 1, email: "anna@test.de", bezug_buchung_id: "b1", brutto_cents: -10_000, steuer_cents: -1_597, netto_cents: -8_403, steuer_quelle: "stripe_anteilig", gebuehr_cents: 0, gebucht_am: "2026-11-06T10:00:00Z", eingegangen_am: "2026-11-06T10:00:01Z", waehrung: "eur" },
  ]),
  provisionen: t([
    { id: "p1", buchung_id: "b1", kauf_id: "cs_main", closer_id: DANIEL, art: "anspruch", basis_netto_cents: 210_168, satz_bp: 1500, betrag_cents: 31_525, rundungsausgleich_cents: 0, status: "accrued", periode: "2026-11", entstanden_am: "2026-11-04T10:01:00Z" },
    { id: "p2", buchung_id: "b2", kauf_id: "cs_main", closer_id: DANIEL, art: "korrektur_erstattung", basis_netto_cents: -8_403, satz_bp: 1500, betrag_cents: -1_260, rundungsausgleich_cents: 0, status: "accrued", periode: "2026-11", entstanden_am: "2026-11-06T10:00:00Z" },
  ]),
  disputes: t([]),
  liveAbos: t([]),
  raten: t([]),
  zugang: t([]),
  bewerbungen: t([]),
  tLeads: t([{ id: "tl1", email: "ben@test.de", answers: { investition: "Unter 1.500 €", schwierigkeit: "Ich verliere immer, ben@test.de" }, fragen_am: "2026-11-02T11:00:00Z", created_at: "2026-11-02T11:00:00Z", kanal: null }]),
  dLeads: t([{ id: "dl1", email: "anna@test.de", answers: { investition: "3.000 € bis unter 5.000 €" }, questions_completed_at: "2026-11-02T10:00:00Z", created_at: "2026-11-02T10:00:00Z", source_origin: "call_funnel", utm_source: "instagram" }]),
  funnelTage: t([]),
};

const NOV = { von: new Date("2026-11-01T00:00:00Z"), bis: new Date("2026-12-01T00:00:00Z") };
const JETZT = new Date("2026-11-08T12:00:00Z");
const filter = { wahl: "frei" as const, zeitraum: NOV, funnel: "alle" as const, quelle: "alle", produkt: "alle" as const, closer: "all" };

describe("Dashboard gegen Mini-Datensatz", () => {
  const d = berechneDashboard(roh, filter, JETZT);
  const karte = (id: string) => d.karten.find((k) => k.id === id)!;
  it("Upgrade zählt nur den Zusatzauftrag (2.501 €), Ausbildung aus August nicht", () => {
    assert.equal(karte("vertrag").wert, 250_100);
  });
  it("Netto-Zahlungseingang = Zahlung minus Erstattung (netto)", () => {
    assert.equal(karte("netto").wert, 210_168 - 8_403);
  });
  it("Credit folgt dem geführten Call (Daniel), nicht dem Kassenlink (Kevin)", () => {
    const k = berechneDashboard(roh, { ...filter, closer: KEVIN }, JETZT);
    const dn = berechneDashboard(roh, { ...filter, closer: DANIEL }, JETZT);
    assert.equal(k.karten.find((x) => x.id === "netto")!.wert, 0);
    assert.equal(dn.karten.find((x) => x.id === "netto")!.wert, 210_168 - 8_403);
  });
  it("All = Summe der disjunkten Closer-Gruppen (QA-Karte 26)", () => {
    const summe = [DANIEL, KEVIN, "unassigned"].reduce((s, c) => s + (berechneDashboard(roh, { ...filter, closer: c }, JETZT).karten.find((x) => x.id === "netto")!.wert ?? 0), 0);
    assert.equal(summe, karte("netto").wert);
  });
  it("Show-up 1/(1+1); ein Neukunde (erste Ledger-Zahlung im November)", () => {
    assert.equal(karte("showup").wert, 0.5);
    assert.equal(karte("kunden").wert, 1);
  });
  it("Free→Paid ohne Freischaltungen = No Data", () => {
    assert.equal(karte("free").wert, null);
  });
});

describe("ChatGPT-Export (Playbook 15)", () => {
  const { zip } = baueChatGptExport(roh, [], NOV, "x".repeat(40), JETZT);
  const dateien = leseZipStored(zip);
  const text = (n: string) => new TextDecoder().decode(dateien.find((d) => d.name === n)!.daten);

  it("enthält alle Pflichtdateien", () => {
    const namen = dateien.map((d) => d.name).sort();
    for (const n of [
      "funnel_events.csv",
      "sessions_pages.csv",
      "video_retention_5s.csv",
      "video_paths_pseudonymous.csv",
      "leads.csv",
      "applications.csv",
      "calls.csv",
      "closers.csv",
      "orders.csv",
      "installments.csv",
      "payments_refunds.csv",
      "subscriptions.csv",
      "costs.csv",
      "data_dictionary.csv",
      "kpi_definitions.csv",
      "README.md",
      "manifest.csv",
    ])
      assert.ok(namen.includes(n), n);
  });
  it("keine E-Mails, Namen oder Freitexte", () => {
    for (const d of dateien) {
      if (d.name === "README.md") continue;
      const s = new TextDecoder().decode(d.daten);
      assert.ok(!/@test\.de/.test(s), `E-Mail in ${d.name}`);
      assert.ok(!/Anna|Ben\b|privat|verliere/.test(s), `Name/Freitext in ${d.name}`);
    }
  });
  it("Manifest: Zeilen und SHA-256 stimmen", () => {
    const zeilen = text("manifest.csv").trim().split("\r\n").slice(1);
    for (const z of zeilen) {
      const [name, rows, sha] = z.split(",");
      const d = dateien.find((x) => x.name === name)!;
      assert.equal(createHash("sha256").update(d.daten).digest("hex"), sha, name);
      if (name!.endsWith(".csv") && name !== "data_dictionary.csv" && name !== "kpi_definitions.csv") {
        assert.equal(new TextDecoder().decode(d.daten).split("\r\n").length - 2, Number(rows), name);
      }
    }
  });
  it("stabile Pseudonyme: gleicher Schlüssel, gleiche Daten → gleiche Prüfsummen", () => {
    const zwei = leseZipStored(baueChatGptExport(roh, [], NOV, "x".repeat(40), JETZT).zip);
    assert.equal(createHash("sha256").update(zwei.find((d) => d.name === "orders.csv")!.daten).digest("hex"), createHash("sha256").update(dateien.find((d) => d.name === "orders.csv")!.daten).digest("hex"));
  });
  it("Upgrade-Order mit Bezug und 2501.00 brutto", () => {
    const orders = text("orders.csv");
    assert.match(orders, /upgrade,ord_[0-9a-f]+,499\.00,2501\.00/);
  });
});

describe("Buchhaltungs-Export (Playbook 14)", () => {
  const dateien = leseZipStored(baueBuchhaltungsExport(roh, NOV, JETZT).zip);
  it("sieben Dateien, Abstimmung ok", () => {
    assert.deepEqual(
      dateien.map((d) => d.name),
      ["orders.csv", "payments.csv", "refunds_chargebacks.csv", "subscriptions.csv", "commissions.csv", "fees_costs.csv", "reconciliation.csv"],
    );
    const recon = new TextDecoder().decode(dateien.at(-1)!.daten);
    assert.match(recon, /netto_zahlungseingang,2017\.65,EUR/);
    assert.match(recon, /pruefung_brutto_gleich_netto_plus_steuer,ok/);
    assert.match(recon, /status,ok/);
  });
});
