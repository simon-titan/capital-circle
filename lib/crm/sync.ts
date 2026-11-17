import type { SupabaseClient } from "@supabase/supabase-js";
import { PHASE_RANG, phaseLabel, type Phase, type Quelle } from "@/config/crm";
import { benachrichtigeCloser } from "./benachrichtigung";
import { closerFuerTermin, type TeamMitglied } from "./zuweisung";
import { ladeTeam } from "./zugang";

/**
 * Hält `crm_kontakte` mit den Lead-Quellen in Deckung (Cron `crm-sync` alle
 * 5 Minuten und der Knopf „Aktualisieren"). Idempotent.
 *
 * - **Anlegen:** ein Kontakt je E-Mail aus discord_leads (/call, /termin,
 *   Discord), training_leads (Analysegespräch), training_bewerbungen mit
 *   Kontaktwunsch (nicht abgelehnt) und high_ticket_applications (/apply).
 * - **Phase nur vorwärts** aus Belegen: Termin gebucht → „Termin", No-Show →
 *   „No-Show", geführt → „Gespräch geführt", offener Kassenlink → „Angebot",
 *   Kauf → „Gewonnen". Was der Closer gesetzt hat, überschreibt der Abgleich
 *   nicht rückwärts; „Verloren" hebt nur ein Kauf oder eine neue Buchung auf.
 * - **Zuweisung** beim ersten Termin nach Call-Block bzw. Calendly-Gastgeber,
 *   nur wenn noch niemand zugewiesen ist.
 * - **Zeitstrahl:** Termine, Kassenlinks und Käufe je einmal (`ref`).
 */

type Roh = Record<string, unknown>;
const PRODUKT_NAME: Record<string, string> = { main: "Main Mentoring", premium: "Premium Mentoring", ausbildung: "Ausbildung" };
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const norm = (e: string) => e.trim().toLowerCase();

type Beleg = {
  quelle: Quelle;
  am: string;
  name: string | null;
  telefon: string | null;
  kanal: string | null;
  userId: string | null;
};

export type SyncErgebnis = { kontakte: number; neu: number; geaendert: number; aktivitaeten: number; zugewiesen: number };

async function alle(service: SupabaseClient, tabelle: string, spalten: string): Promise<Roh[]> {
  const { data, error } = await service.from(tabelle).select(spalten).order("created_at", { ascending: false }).limit(10000);
  if (error) {
    if (!/does not exist|schema cache/i.test(error.message)) console.error(`[crm/sync] ${tabelle}:`, error.message);
    return [];
  }
  return (data ?? []) as unknown as Roh[];
}

export async function synchronisiereCrm(service: SupabaseClient): Promise<SyncErgebnis> {
  const team = await ladeTeam(service);
  const [discord, training, bewerbungen, ht, termine, kassenlinks, kaeufe, bestehendRoh] = await Promise.all([
    alle(service, "discord_leads", "id, name, email, phone, source_origin, utm_source, created_at"),
    alle(service, "training_leads", "id, user_id, name, email, phone, kanal, created_at"),
    alle(service, "training_bewerbungen", "user_id, name, email, telefon, kanal, kontakt_gewuenscht, status, created_at"),
    alle(service, "high_ticket_applications", "email, name, whatsapp_number, created_at"),
    alle(service, "termine", "id, email, start_am, status, berater_email, berater_name, created_at, no_show_am, gefuehrt_am"),
    alle(service, "kassenlink", "id, email, status, produkt, closer, created_at"),
    alle(service, "mentoring_kauf", "id, email, user_id, produkt, soll_cents, status, gekauft_am, closer, created_at"),
    alle(service, "crm_kontakte", "*"),
  ]);

  /* ── Belege je Adresse ── */
  const belege = new Map<string, Beleg[]>();
  const merke = (email: unknown, b: Beleg) => {
    const e = str(email);
    if (!e || !e.includes("@")) return;
    const k = norm(e);
    belege.set(k, [...(belege.get(k) ?? []), b]);
  };
  for (const d of discord) {
    const herkunft = str(d.source_origin);
    const quelle: Quelle = herkunft === "call_funnel" ? "call_funnel" : herkunft === "termin_direct" ? "termin_direct" : "discord_funnel";
    merke(d.email, { quelle, am: String(d.created_at), name: str(d.name), telefon: str(d.phone), kanal: str(d.utm_source), userId: null });
  }
  for (const t of training)
    merke(t.email, { quelle: "training", am: String(t.created_at), name: str(t.name), telefon: str(t.phone), kanal: str(t.kanal), userId: str(t.user_id) });
  for (const b of bewerbungen)
    if (b.kontakt_gewuenscht === true && b.status !== "abgelehnt")
      merke(b.email, { quelle: "bewerbung", am: String(b.created_at), name: str(b.name), telefon: str(b.telefon), kanal: str(b.kanal), userId: str(b.user_id) });
  for (const h of ht) merke(h.email, { quelle: "ht_apply", am: String(h.created_at), name: str(h.name), telefon: str(h.whatsapp_number), kanal: null, userId: null });

  const nachMail = <T extends Roh>(liste: T[]) => {
    const m = new Map<string, T[]>();
    for (const z of liste) {
      const e = str(z.email);
      if (!e) continue;
      m.set(norm(e), [...(m.get(norm(e)) ?? []), z]);
    }
    return m;
  };
  const termineJe = nachMail(termine);
  const linksJe = nachMail(kassenlinks);
  const kaeufeJe = nachMail(kaeufe.filter((k) => k.produkt !== "live" && k.status !== "erstattet"));
  const bestehend = new Map(bestehendRoh.map((k) => [String(k.email), k]));

  const ergebnis: SyncErgebnis = { kontakte: 0, neu: 0, geaendert: 0, aktivitaeten: 0, zugewiesen: 0 };
  const aktivitaeten: Roh[] = [];
  const benachrichtigen: { closer: TeamMitglied; email: string; name: string | null; start: string }[] = [];

  const alleMails = new Set([...belege.keys(), ...bestehend.keys()]);
  for (const email of alleMails) {
    const bs = (belege.get(email) ?? []).sort((a, b) => a.am.localeCompare(b.am));
    const alt = bestehend.get(email);
    if (!alt && bs.length === 0) continue;
    ergebnis.kontakte++;

    const ts = (termineJe.get(email) ?? []).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const letzter = ts[ts.length - 1];
    const links = linksJe.get(email) ?? [];
    const kauf = (kaeufeJe.get(email) ?? []).sort((a, b) => String(b.gekauft_am).localeCompare(String(a.gekauft_am)))[0];

    /* Beleg-Phase und wann der Beleg entstand */
    let beleg: Phase | null = null;
    let belegAm = "";
    const offenerLink = links.find((l) => l.status === "offen");
    const gefuehrt = ts.filter((t) => t.status === "gefuehrt").pop();
    if (kauf) [beleg, belegAm] = ["gewonnen", String(kauf.gekauft_am)];
    else if (offenerLink) [beleg, belegAm] = ["angebot", String(offenerLink.created_at)];
    else if (gefuehrt) [beleg, belegAm] = ["gespraech", String(gefuehrt.gefuehrt_am ?? gefuehrt.created_at)];
    else if (letzter?.status === "no_show") [beleg, belegAm] = ["no_show", String(letzter.no_show_am ?? letzter.created_at)];
    else if (letzter && (letzter.status === "gebucht" || letzter.status === "umgebucht")) [beleg, belegAm] = ["termin", String(letzter.created_at)];
    // Hat der Closer die Phase nach dem Beleg selbst gesetzt (z. B. „Später"), gilt seine Wahl.
    const manuellAm = String(alt?.phase_gesetzt_am ?? "");
    if (beleg && beleg !== "gewonnen" && manuellAm && belegAm <= manuellAm) beleg = null;

    const aktuell = (alt?.phase as Phase | undefined) ?? "neu";
    let phase: Phase = aktuell;
    if (beleg === "gewonnen") phase = "gewonnen";
    else if (aktuell === "gewonnen") phase = "gewonnen";
    else if (aktuell === "verloren") {
      // Eine neue Buchung nach dem Verlust öffnet den Kontakt wieder.
      const verlorenAm = String(alt?.verloren_am ?? "");
      if (letzter?.status === "gebucht" && String(letzter.created_at) > verlorenAm) phase = "termin";
    } else if (beleg) {
      // Termin → No-Show ist ein Schritt „zurück" im Rang, aber ein echter Beleg.
      if (beleg === "no_show" && aktuell === "termin") phase = "no_show";
      else if (PHASE_RANG[beleg] > PHASE_RANG[aktuell]) phase = beleg;
    }

    /* Zuweisung beim ersten Termin */
    let closerId = (alt?.closer_id as string | null | undefined) ?? null;
    if (!closerId && letzter && letzter.status === "gebucht") {
      const c = closerFuerTermin(team, new Date(String(letzter.start_am)), str(letzter.berater_email));
      if (c) {
        closerId = c.user_id;
        ergebnis.zugewiesen++;
        aktivitaeten.push({ art: "zuweisung", text: `Automatisch zugewiesen: ${c.name} (Call-Block/Gastgeber)`, ref: `zuweisung:${letzter.id}`, email });
        benachrichtigen.push({ closer: c, email, name: bs[bs.length - 1]?.name ?? (alt?.name as string | null) ?? null, start: String(letzter.start_am) });
      }
    }
    if (!closerId && kauf && str(kauf.closer)) closerId = team.find((t) => t.kuerzel === kauf.closer)?.user_id ?? null;

    const quellen = [...new Set([...(((alt?.quellen as string[] | undefined) ?? [])), ...bs.map((b) => b.quelle)])];
    const name = (alt?.name as string | null) ?? [...bs].reverse().find((b) => b.name)?.name ?? null;
    const telefon = (alt?.telefon as string | null) ?? [...bs].reverse().find((b) => b.telefon)?.telefon ?? null;
    const zeile: Roh = {
      email,
      name,
      telefon,
      user_id: (alt?.user_id as string | null) ?? bs.find((b) => b.userId)?.userId ?? (kauf ? str(kauf.user_id) : null),
      quelle: (alt?.quelle as string | undefined) ?? bs[0]?.quelle ?? "manuell",
      quellen,
      kanal: (alt?.kanal as string | null) ?? bs.find((b) => b.kanal)?.kanal ?? null,
      closer_id: closerId,
      phase,
    };
    if (phase === "gewonnen" && kauf) {
      zeile.produkt = kauf.produkt;
      zeile.wert_cents = kauf.soll_cents;
      zeile.gewonnen_am = (alt?.gewonnen_am as string | null) ?? kauf.gekauft_am;
    }
    if (phase !== aktuell) {
      aktivitaeten.push({
        art: "phase",
        text: `Automatisch: ${phaseLabel[aktuell] ?? aktuell} → ${phaseLabel[phase] ?? phase}`,
        ref: `auto:${email}:${phase}:${kauf?.id ?? letzter?.id ?? links[0]?.id ?? "x"}`,
        email,
      });
      if (phase === "spaeter" || phase === "verloren") zeile.wiedervorlage_am = null;
    }

    /* Zeitstrahl-Belege */
    for (const t of ts) {
      const start = new Date(String(t.start_am)).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
      aktivitaeten.push({ art: "termin", text: `Termin gebucht für ${start}${t.berater_name ? ` (${t.berater_name})` : ""}`, ref: `termin:${t.id}:gebucht`, email, am: t.created_at });
      if (t.no_show_am) aktivitaeten.push({ art: "termin", text: "No-Show bestätigt", ref: `termin:${t.id}:no_show`, email, am: t.no_show_am });
      if (t.gefuehrt_am) aktivitaeten.push({ art: "termin", text: "Gespräch geführt", ref: `termin:${t.id}:gefuehrt`, email, am: t.gefuehrt_am });
    }
    // ref ohne Status: Die Zeile entsteht einmal beim Anlegen, der Stand steht am Kassenlink.
    for (const l of links) aktivitaeten.push({ art: "kassenlink", text: `Kassenlink ${PRODUKT_NAME[String(l.produkt)] ?? l.produkt} angelegt`, ref: `kassenlink:${l.id}`, email, am: l.created_at });
    for (const k of kaeufeJe.get(email) ?? [])
      aktivitaeten.push({ art: "kauf", text: `Kauf: ${PRODUKT_NAME[String(k.produkt)] ?? k.produkt}`, ref: `kauf:${k.id}`, email, am: k.gekauft_am, daten: { soll_cents: k.soll_cents } });

    const geaendert =
      !alt ||
      ["name", "telefon", "user_id", "closer_id", "phase", "produkt", "wert_cents", "kanal"].some((f) => zeile[f] !== undefined && zeile[f] !== alt[f]) ||
      quellen.length !== ((alt.quellen as string[] | undefined) ?? []).length;
    if (!geaendert) continue;
    if (!alt) {
      ergebnis.neu++;
      zeile.created_at = bs[0]?.am ?? new Date().toISOString();
    } else ergebnis.geaendert++;
    zeile.updated_at = new Date().toISOString();
    const { error } = await service.from("crm_kontakte").upsert(zeile, { onConflict: "email" });
    if (error) console.error(`[crm/sync] Kontakt ${email}:`, error.message);
  }

  /* Zeitstrahl nachtragen (ref macht es idempotent) */
  if (aktivitaeten.length) {
    const { data: ids } = await service.from("crm_kontakte").select("id, email").in(
      "email",
      [...new Set(aktivitaeten.map((a) => String(a.email)))].slice(0, 5000),
    );
    const idJe = new Map(((ids ?? []) as { id: string; email: string }[]).map((k) => [k.email, k.id]));
    const zeilen = aktivitaeten
      .filter((a) => idJe.has(String(a.email)))
      .map((a) => ({
        kontakt_id: idJe.get(String(a.email)),
        art: a.art,
        text: a.text,
        ref: a.ref,
        ...(a.am ? { am: a.am } : {}),
        ...(a.daten ? { daten: a.daten } : {}),
      }));
    for (let i = 0; i < zeilen.length; i += 500) {
      const { error, count } = await service
        .from("crm_aktivitaeten")
        // defaultToNull: false — sonst setzt supabase-js bei gemischten Zeilen fehlendes `am`/`daten` auf NULL (NOT NULL).
        .upsert(zeilen.slice(i, i + 500), { onConflict: "ref", ignoreDuplicates: true, count: "exact", defaultToNull: false });
      if (error) console.error("[crm/sync] Zeitstrahl:", error.message);
      ergebnis.aktivitaeten += count ?? 0;
    }
  }

  for (const b of benachrichtigen) await benachrichtigeCloser(b.closer, { art: "termin", kontaktEmail: b.email, kontaktName: b.name, start: b.start });
  return ergebnis;
}
