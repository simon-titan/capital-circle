import { closerFuerTermin, type TeamMitglied } from "@/lib/crm/zuweisung";

/**
 * Verkaufs-Credit eines Kaufs (Tracking-Playbook 9.4) — rein (Tests: `credit.test.ts`).
 *
 * **Regel (Entscheidung Simon 08.11.2026, Freigabe Emre offen — Prüfpunkt T-09):**
 * Verkauf und Provision gehen an den Closer des **tatsächlich geführten** Calls:
 * der letzte Termin mit Status `gefuehrt` vor dem Kauf zur selben E-Mail. Wer
 * diesen Call geführt hat, steht in dieser Reihenfolge fest:
 *   1. wer den Termin im CRM/Board auf „geführt" gesetzt hat (`gesetzt_von`),
 *      sofern im Vertriebsteam,
 *   2. sonst die Zuweisungsregel für Termine (Call-Block, dann Calendly-Gastgeber).
 * Fallbacks ohne geführten Call: Closer am Kassenlink, dann der zugewiesene
 * CRM-Closer, sonst `unassigned`.
 *
 * Der Credit wird beim Kauf eingefroren (`mentoring_kauf.credit_*`): Ein
 * späterer Closer-Wechsel im CRM verschiebt die operative Verantwortung, nicht
 * den Credit (QA-Karte 18).
 */

export type CreditRegel = "gefuehrter_call" | "kassenlink" | "crm_zuweisung" | "unassigned";

export type CreditTermin = {
  id: string;
  start_am: string;
  status: string;
  gefuehrt_am: string | null;
  berater_email: string | null;
  gesetzt_von: string | null;
};

export type Credit = {
  closerId: string | null;
  kuerzel: string | null;
  regel: CreditRegel;
  terminId: string | null;
};

export function ermittleCredit(p: {
  kaufAm: string;
  termine: CreditTermin[];
  team: TeamMitglied[];
  kassenlinkKuerzel: string | null;
  crmCloserId: string | null;
}): Credit {
  const kauf = new Date(p.kaufAm).getTime();
  const gefuehrt = p.termine
    .filter((t) => t.status === "gefuehrt" && new Date(t.start_am).getTime() <= kauf)
    .sort((a, b) => a.start_am.localeCompare(b.start_am));
  const letzter = gefuehrt[gefuehrt.length - 1];
  if (letzter) {
    // Wer den Termin auf „geführt" gesetzt hat, zählt auch, wenn er inzwischen inaktiv ist.
    // Die Blockregel nimmt wie im CRM nur aktive Closer.
    const setzer = letzter.gesetzt_von ? p.team.find((t) => t.user_id === letzter.gesetzt_von) : undefined;
    const closer = setzer ?? closerFuerTermin(p.team, new Date(letzter.start_am), letzter.berater_email);
    if (closer) return { closerId: closer.user_id, kuerzel: closer.kuerzel, regel: "gefuehrter_call", terminId: letzter.id };
  }
  if (p.kassenlinkKuerzel) {
    const c = p.team.find((t) => t.kuerzel === p.kassenlinkKuerzel);
    if (c) return { closerId: c.user_id, kuerzel: c.kuerzel, regel: "kassenlink", terminId: letzter?.id ?? null };
  }
  if (p.crmCloserId) {
    const c = p.team.find((t) => t.user_id === p.crmCloserId);
    if (c) return { closerId: c.user_id, kuerzel: c.kuerzel, regel: "crm_zuweisung", terminId: letzter?.id ?? null };
  }
  return { closerId: null, kuerzel: null, regel: "unassigned", terminId: letzter?.id ?? null };
}
