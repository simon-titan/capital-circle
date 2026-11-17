"use client";

import { useState } from "react";
import { CrmAuswertung } from "@/components/crm/CrmAuswertung";
import { CrmHeute } from "@/components/crm/CrmHeute";
import { CrmKontakt } from "@/components/crm/CrmKontakt";
import { CrmListe } from "@/components/crm/CrmListe";
import { CrmPipeline } from "@/components/crm/CrmPipeline";
import { CrmRahmen } from "@/components/crm/CrmRahmen";
import { TEAM, beispielAuswertung, beispielDetail, beispielHeute, beispielKontakte } from "./beispiel";

const BASIS = "/vorschau/mentoring/crm";

/** Leitet `/api/crm/*` im Browser auf die Beispieldaten um (nur in dieser Vorschau). */
function installiereAttrappe() {
  const w = window as Window & { __crmAttrappe?: boolean };
  if (w.__crmAttrappe) return;
  w.__crmAttrappe = true;
  const echt = window.fetch.bind(window);
  const antwort = (daten: unknown) => new Response(JSON.stringify(daten), { status: 200, headers: { "Content-Type": "application/json" } });
  window.fetch = async (eingabe, init) => {
    const url = typeof eingabe === "string" ? eingabe : eingabe instanceof URL ? eingabe.href : eingabe.url;
    const pfad = new URL(url, window.location.origin).pathname;
    if (!pfad.startsWith("/api/crm/")) return echt(eingabe, init);
    const methode = (init?.method ?? "GET").toUpperCase();
    const jetzt = Date.now();
    await new Promise((r) => setTimeout(r, 250));
    if (methode !== "GET") return antwort({ ok: true, id: "k-01", url: "https://capitalcircle.de/kasse/beispiel" });
    if (pfad === "/api/crm/kontakte") return antwort({ ok: true, kontakte: beispielKontakte(jetzt), team: TEAM, migrationFehlt: false });
    if (pfad === "/api/crm/heute") return antwort({ ok: true, ...beispielHeute(jetzt) });
    if (pfad === "/api/crm/auswertung") return antwort({ ok: true, ...beispielAuswertung() });
    const m = pfad.match(/^\/api\/crm\/kontakte\/([^/]+)$/);
    if (m) {
      const d = beispielDetail(m[1]!, jetzt);
      return antwort(d ? { ok: true, ...d } : { ok: false, error: "nicht_gefunden" });
    }
    return antwort({ ok: false, error: "vorschau" });
  };
}

export function CrmVorschau({ pfad }: { pfad: string[] }) {
  // Vor dem ersten Effekt der Kinder installieren — useState-Initialisierer läuft beim ersten Rendern.
  useState(() => {
    if (typeof window !== "undefined") installiereAttrappe();
    return true;
  });
  const [a, b] = pfad;
  return (
    <CrmRahmen basis={BASIS} ichId="u-simon" istAdmin name="Simon">
      {a === "pipeline" ? <CrmPipeline /> : a === "auswertung" ? <CrmAuswertung /> : a === "kontakte" && b ? <CrmKontakt id={b} /> : a === "kontakte" ? <CrmListe /> : <CrmHeute />}
    </CrmRahmen>
  );
}
