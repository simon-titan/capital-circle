import type { DashboardFilter } from "./dashboard";
import { zeitraumAus, type ZeitraumWahl } from "./zeit";

const WAHLEN: ZeitraumWahl[] = ["7", "30", "90", "gesamt", "frei"];
const PRODUKTE = ["alle", "main", "premium", "ausbildung", "live"] as const;

/** Filter aus der Adresse (`?zeitraum=30&von=&bis=&funnel=&quelle=&produkt=&closer=`). Standard: 30 Tage, alles. */
export function filterAusParams(sp: URLSearchParams, jetzt = new Date()): DashboardFilter {
  const wahlRoh = sp.get("zeitraum") ?? "30";
  const wahl = (WAHLEN as string[]).includes(wahlRoh) ? (wahlRoh as ZeitraumWahl) : "30";
  let zeitraum = zeitraumAus(wahl, jetzt, sp.get("von"), sp.get("bis"));
  // Unvollständiger freier Zeitraum: zurück auf 30 Tage statt stillschweigend „Gesamt".
  if (wahl === "frei" && !zeitraum) zeitraum = zeitraumAus("30", jetzt);
  const funnel = sp.get("funnel");
  const produkt = sp.get("produkt") ?? "alle";
  return {
    wahl,
    zeitraum,
    funnel: funnel === "free" || funnel === "main" ? funnel : "alle",
    quelle: (sp.get("quelle") ?? "alle").trim().toLowerCase() || "alle",
    produkt: (PRODUKTE as readonly string[]).includes(produkt) ? (produkt as DashboardFilter["produkt"]) : "alle",
    closer: sp.get("closer")?.trim() || "all",
  };
}
