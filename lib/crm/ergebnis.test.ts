import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OUTCOME_ZU_PHASE, pipelineStatus, verlustgrundAus } from "@/config/crm";
import { pruefeErgebnis } from "./ergebnis";

const JETZT = new Date("2026-11-08T12:00:00Z");
const MORGEN = "2026-11-09T10:00:00Z";

describe("Ergebnis-Maske (Tracking-Playbook 9.2, QA-Karten 9–11)", () => {
  it("offene Entscheidung braucht Grund und Follow-up", () => {
    assert.deepEqual(pruefeErgebnis({ outcome: "open_decision", produkt: "main" }, JETZT), { ok: false, fehler: "grund" });
    assert.deepEqual(pruefeErgebnis({ outcome: "open_decision", produkt: "main", grund: "consideration" }, JETZT), { ok: false, fehler: "follow_up" });
    const r = pruefeErgebnis({ outcome: "open_decision", produkt: "main", grund: "consideration", followUpAm: MORGEN }, JETZT);
    assert.ok(r.ok);
  });
  it("Zusage ohne Zahlung braucht Follow-up und ein Produkt", () => {
    assert.equal(pruefeErgebnis({ outcome: "won_payment_pending", produkt: "none", followUpAm: MORGEN }, JETZT).ok, false);
    assert.equal(pruefeErgebnis({ outcome: "won_payment_pending", produkt: "premium", followUpAm: MORGEN }, JETZT).ok, true);
  });
  it("Verloren braucht einen Grund, kein Follow-up", () => {
    assert.equal(pruefeErgebnis({ outcome: "lost", produkt: "none" }, JETZT).ok, false);
    assert.equal(pruefeErgebnis({ outcome: "lost", produkt: "none", grund: "budget" }, JETZT).ok, true);
  });
  it("No-Show ohne Produkt und Grund", () => {
    const r = pruefeErgebnis({ outcome: "no_show" }, JETZT);
    assert.ok(r.ok && r.wert.produkt === "none");
  });
  it("unbekannte Werte und Follow-up in der Vergangenheit werden abgelehnt", () => {
    assert.equal(pruefeErgebnis({ outcome: "gewonnen", produkt: "main" }, JETZT).ok, false);
    assert.deepEqual(pruefeErgebnis({ outcome: "open_decision", produkt: "main", grund: "timing", followUpAm: "2026-11-01T10:00:00Z" }, JETZT), {
      ok: false,
      fehler: "follow_up_vergangen",
    });
  });
  it("eine Abbildung auf die CRM-Phasen und die Statusbegriffe 4.3", () => {
    assert.equal(OUTCOME_ZU_PHASE.open_decision, "gespraech");
    assert.equal(OUTCOME_ZU_PHASE.unqualified, "verloren");
    assert.equal(verlustgrundAus("unqualified", null), "nicht_geeignet");
    assert.equal(verlustgrundAus("lost", "trust"), "vertrauen");
    assert.equal(pipelineStatus({ phase: "gespraech", verlustGrund: null, letztesOutcome: null }), "held");
    assert.equal(pipelineStatus({ phase: "gespraech", verlustGrund: null, letztesOutcome: "open_decision" }), "open_decision");
    assert.equal(pipelineStatus({ phase: "verloren", verlustGrund: "nicht_geeignet", letztesOutcome: null }), "unqualified");
    assert.equal(pipelineStatus({ phase: "gewonnen", verlustGrund: null, letztesOutcome: "won_payment_pending" }), "customer_paid");
  });
});
