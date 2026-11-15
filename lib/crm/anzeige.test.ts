import assert from "node:assert/strict";
import { test } from "node:test";
import { berlinZuIso, fehlerText, gruss, initialen, naechsteAktivitaet, naechsterSchritt, passtZurSuche, pfadStelle, relativ, stauTage, wann, wiedervorlageVorschlaege, type SchrittEingabe } from "./anzeige";

// Freitag, 14.11.2026, 12:00 Berlin (MEZ, UTC+1)
const JETZT = Date.parse("2026-11-14T11:00:00Z");
const min = (n: number) => new Date(JETZT + n * 60_000).toISOString();
const basis: SchrittEingabe = { phase: "kontaktiert", wiedervorlage_am: null, telefon: "+49 151 2345678", termine: [] };
const termin = (start: string, status = "gebucht", hatErgebnis = false) => ({ id: `t-${start}`, start_am: start, status, join_url: "https://zoom.example/x", hatErgebnis });

test("Zeit: relativ und wann in Berliner Zeit", () => {
  assert.equal(relativ(min(-12), JETZT), "vor 12 Min.");
  assert.equal(relativ(min(90), JETZT), "in 1 Std.");
  assert.equal(relativ(min(-3 * 1440), JETZT), "vor 3 Tagen");
  assert.equal(relativ(min(0.5), JETZT), "gerade eben");
  assert.equal(wann("2026-11-14T14:00:00Z", JETZT), "heute 15:00");
  assert.equal(wann("2026-11-15T09:30:00Z", JETZT), "morgen 10:30");
});

test("berlinZuIso: Winter- und Sommerzeit", () => {
  assert.equal(berlinZuIso("2026-11-15", "10:00"), "2026-11-15T09:00:00.000Z");
  assert.equal(berlinZuIso("2026-07-01", "10:00"), "2026-07-01T08:00:00.000Z");
  // Tag der Umstellung (29.03.2026, 02:00 → 03:00)
  assert.equal(berlinZuIso("2026-03-29", "10:00"), "2026-03-29T08:00:00.000Z");
});

test("Wiedervorlage-Vorschläge: morgen 10:00 und nächster Montag", () => {
  const v = wiedervorlageVorschlaege(JETZT);
  assert.equal(v[1]!.iso, "2026-11-15T09:00:00.000Z");
  assert.equal(v[3]!.iso, "2026-11-16T09:00:00.000Z"); // Fr → Mo
  assert.ok(Date.parse(v[0]!.iso) >= JETZT + 2 * 3_600_000);
});

test("Nächster Schritt: laufender Termin vor allem anderen", () => {
  const s = naechsterSchritt({ ...basis, phase: "neu", termine: [termin(min(-5))] }, JETZT);
  assert.equal(s.art, "termin_laeuft");
  assert.equal(s.joinUrl, "https://zoom.example/x");
});

test("Nächster Schritt: Termin vorbei ohne Status → danger", () => {
  const s = naechsterSchritt({ ...basis, termine: [termin(min(-20))] }, JETZT);
  assert.equal(s.art, "termin_vorbei");
  assert.equal(s.ton, "danger");
});

test("Nächster Schritt: Termin in 90 Minuten, Termin in 3 Tagen", () => {
  assert.equal(naechsterSchritt({ ...basis, termine: [termin(min(90))] }, JETZT).art, "termin_bald");
  assert.equal(naechsterSchritt({ ...basis, phase: "termin", termine: [termin(min(3 * 1440))] }, JETZT).art, "termin_spaeter");
});

test("Nächster Schritt: Ergebnis fehlt vor fälliger Wiedervorlage", () => {
  const s = naechsterSchritt({ ...basis, wiedervorlage_am: min(-60), termine: [termin(min(-1440), "gefuehrt")] }, JETZT);
  assert.equal(s.art, "ergebnis_fehlt");
  const mitErgebnis = naechsterSchritt({ ...basis, wiedervorlage_am: min(-60), termine: [termin(min(-1440), "gefuehrt", true)] }, JETZT);
  assert.equal(mitErgebnis.art, "wiedervorlage");
});

test("Nächster Schritt: Phasen ohne Termin", () => {
  assert.equal(naechsterSchritt({ ...basis, phase: "neu" }, JETZT).art, "erstkontakt");
  assert.equal(naechsterSchritt({ ...basis, phase: "angebot" }, JETZT).art, "angebot");
  assert.equal(naechsterSchritt({ ...basis, phase: "no_show" }, JETZT).art, "no_show");
  assert.equal(naechsterSchritt({ ...basis, phase: "gewonnen", termine: [termin(min(-20))] }, JETZT).art, "gewonnen");
  assert.equal(naechsterSchritt({ ...basis, phase: "verloren" }, JETZT).art, "verloren");
  assert.equal(naechsterSchritt({ ...basis, wiedervorlage_am: min(600) }, JETZT).art, "wiedervorlage_geplant");
  assert.equal(naechsterSchritt(basis, JETZT).art, "offen");
});

test("Suche findet Telefonnummern unabhängig vom Format", () => {
  const k = { name: "Max Muster", email: "max@example.com", telefon: "+49 151 2345678" };
  assert.ok(passtZurSuche(k, "0151 2345"));
  assert.ok(passtZurSuche(k, "2345678"));
  assert.ok(passtZurSuche(k, "muster"));
  assert.ok(!passtZurSuche(k, "0170"));
  assert.ok(passtZurSuche(k, ""));
});

test("Fehlertexte sind deutsch, unbekannte Codes bleiben erkennbar", () => {
  assert.match(fehlerText("zuweisung_grund"), /Grund/);
  assert.match(fehlerText("ergebnis_follow_up"), /Follow-up/);
  assert.equal(fehlerText("xyz"), "Fehler: xyz");
});

test("Pipeline-Karte: nächste Aktivität und Stau", () => {
  const k = { phase: "kontaktiert", wiedervorlage_am: null, naechsterTermin: null, letzte_aktivitaet_am: min(-4 * 1440), created_at: min(-10 * 1440) };
  assert.deepEqual(naechsteAktivitaet(k, JETZT), { art: "keine" });
  assert.equal(stauTage(k, JETZT), 4);
  // Geplante Wiedervorlage: kein Stau
  assert.equal(stauTage({ ...k, wiedervorlage_am: min(60) }, JETZT), null);
  assert.equal(naechsteAktivitaet({ ...k, wiedervorlage_am: min(-5) }, JETZT).art, "wv_faellig");
  // Fällige Wiedervorlage staut weiter
  assert.equal(stauTage({ ...k, wiedervorlage_am: min(-5) }, JETZT), 4);
  // Termin hat Vorrang
  assert.equal(naechsteAktivitaet({ ...k, naechsterTermin: min(120), wiedervorlage_am: min(-5) }, JETZT).art, "termin");
  // Neuer Lead ohne Aktivität: ab einem Tag
  assert.equal(stauTage({ ...k, phase: "neu", letzte_aktivitaet_am: null, created_at: min(-20 * 60) }, JETZT), null);
  assert.equal(stauTage({ ...k, phase: "neu", letzte_aktivitaet_am: null, created_at: min(-26 * 60) }, JETZT), 1);
  // Termin-Phase staut nie
  assert.equal(stauTage({ ...k, phase: "termin" }, JETZT), null);
});

test("Pfad, Initialen, Gruß", () => {
  assert.deepEqual(pfadStelle("no_show"), { index: 2, label: "No-Show", ton: "warnung" });
  assert.equal(pfadStelle("gespraech").index, 3);
  assert.equal(pfadStelle("verloren").ton, "verloren");
  assert.equal(initialen("Simon Paweletz"), "SP");
  assert.equal(initialen("kevin.mueller@x.de"), "KM");
  assert.equal(initialen("  "), "?");
  assert.equal(gruss(JETZT), "Guten Tag");
  assert.equal(gruss(Date.parse("2026-11-14T07:00:00Z")), "Guten Morgen");
});
