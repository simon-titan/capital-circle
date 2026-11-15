import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closerFuerTermin, type TeamMitglied } from "./zuweisung";

const team: TeamMitglied[] = [
  { user_id: "d", name: "Daniel", kuerzel: "daniel", calendly_email: "daniel@cc.de", block_von: "13:00", block_bis: "14:00", aktiv: true },
  { user_id: "k", name: "Kevin", kuerzel: "kevin", calendly_email: "kevin@cc.de", block_von: "15:00", block_bis: "17:00", aktiv: true },
  { user_id: "s", name: "Simon", kuerzel: "simon", calendly_email: "simon@cc.de", block_von: "17:00", block_bis: "19:00", aktiv: true },
];

describe("Zuweisung nach Call-Blöcken (Berliner Zeit)", () => {
  it("13:30 Uhr → Daniel (Winterzeit, UTC+1)", () => {
    assert.equal(closerFuerTermin(team, new Date("2026-11-20T12:30:00Z"), null)?.kuerzel, "daniel");
  });
  it("16:59 Uhr → Kevin, 17:00 Uhr → Simon", () => {
    assert.equal(closerFuerTermin(team, new Date("2026-11-20T15:59:00Z"), null)?.kuerzel, "kevin");
    assert.equal(closerFuerTermin(team, new Date("2026-11-20T16:00:00Z"), null)?.kuerzel, "simon");
  });
  it("Sommerzeit: 15:00 Uhr Berlin = 13:00 UTC → Kevin", () => {
    assert.equal(closerFuerTermin(team, new Date("2027-06-10T13:00:00Z"), null)?.kuerzel, "kevin");
  });
  it("Außerhalb der Blöcke: Calendly-Gastgeber, sonst Pool", () => {
    assert.equal(closerFuerTermin(team, new Date("2026-11-20T09:00:00Z"), "Kevin@CC.de")?.kuerzel, "kevin");
    assert.equal(closerFuerTermin(team, new Date("2026-11-20T09:00:00Z"), null), null);
  });
  it("Inaktive werden übersprungen", () => {
    const ohneDaniel = team.map((t) => (t.kuerzel === "daniel" ? { ...t, aktiv: false } : t));
    assert.equal(closerFuerTermin(ohneDaniel, new Date("2026-11-20T12:30:00Z"), null), null);
  });
});
