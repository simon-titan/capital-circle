import assert from "node:assert/strict";
import { test } from "node:test";
import { FUNNEL_VORGABE, leseFunnelVideos, pruefeFunnelEingabe } from "./funnel-videos";

const UID = "5ab853dc53a70e30b224cce8d45592ae";

test("ohne gespeicherten Wert gilt die Vorgabe aus der Config", () => {
  const r = leseFunnelVideos(null);
  assert.deepEqual(r.videos, FUNNEL_VORGABE);
  assert.deepEqual(r.ausAdmin, { training: false, call: false });
});

test("gespeicherter Platz hat Vorrang, kaputter fällt auf die Vorgabe", () => {
  const r = leseFunnelVideos({ call: { uid: UID.toUpperCase(), posterSekunde: 12.4 }, training: { uid: "kaputt" } });
  assert.deepEqual(r.videos.call, { uid: UID, posterSekunde: 12 });
  assert.deepEqual(r.videos.training, FUNNEL_VORGABE.training);
  assert.deepEqual(r.ausAdmin, { training: false, call: true });
});

test("Eingabe: Platz, UID und Standbild werden geprüft", () => {
  assert.equal(pruefeFunnelEingabe({ platz: "start", uid: UID }).ok, false);
  assert.equal(pruefeFunnelEingabe({ platz: "call", uid: "abc" }).ok, false);
  assert.equal(pruefeFunnelEingabe({ platz: "call", uid: UID, posterSekunde: -1 }).ok, false);
  assert.deepEqual(pruefeFunnelEingabe({ platz: "training", uid: null }), { ok: true, platz: "training", wert: null });
  assert.deepEqual(pruefeFunnelEingabe({ platz: "call", uid: UID, posterSekunde: 10 }), {
    ok: true,
    platz: "call",
    wert: { uid: UID, posterSekunde: 10 },
  });
});
