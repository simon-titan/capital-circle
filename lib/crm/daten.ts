import { FRAGEN, antwortText } from "@/config/onboarding";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ALLE_FRAGEN } from "@/config/discord-funnel-questions";
import { bewerbung as bewerbungTexte } from "@/config/training";
import { ladeErgebnisse, type ErgebnisZeile } from "./ergebnis";
import { ladeTeam } from "./zugang";
import type { TeamMitglied } from "./zuweisung";

/** Lesemodelle des CRM (`/crm`). Nur mit Service-Client nach `requireCrm`. */

export type KontaktZeile = {
  id: string;
  email: string;
  name: string | null;
  telefon: string | null;
  quelle: string;
  quellen: string[];
  kanal: string | null;
  closer_id: string | null;
  phase: string;
  wiedervorlage_am: string | null;
  verlust_grund: string | null;
  produkt: string | null;
  wert_cents: number | null;
  letzte_aktivitaet_am: string | null;
  created_at: string;
  updated_at: string;
  /** Nächster gebuchter Termin (aus `termine`). */
  naechsterTermin: string | null;
};

export type TerminKurz = {
  id: string;
  email: string;
  name: string | null;
  start_am: string;
  status: string;
  berater_name: string | null;
  join_url: string | null;
  kontaktId: string | null;
  closerId: string | null;
  /** Telefon aus dem CRM-Kontakt — für „Anrufen" direkt aus „Heute". */
  telefon: string | null;
};

function tabelleFehlt(msg: string) {
  return /does not exist|schema cache/i.test(msg);
}

export async function ladeKontaktListe(service: SupabaseClient): Promise<{ kontakte: KontaktZeile[]; team: TeamMitglied[]; migrationFehlt: boolean }> {
  const [team, { data, error }, { data: termine }] = await Promise.all([
    ladeTeam(service, true),
    service.from("crm_kontakte").select("*").order("updated_at", { ascending: false }).limit(5000),
    service.from("termine").select("email, start_am").eq("status", "gebucht").gte("start_am", new Date(Date.now() - 2 * 3_600_000).toISOString()),
  ]);
  if (error) {
    if (tabelleFehlt(error.message)) return { kontakte: [], team, migrationFehlt: true };
    throw new Error(error.message);
  }
  const naechster = new Map<string, string>();
  for (const t of (termine ?? []) as { email: string; start_am: string }[]) {
    const alt = naechster.get(t.email);
    if (!alt || t.start_am < alt) naechster.set(t.email, t.start_am);
  }
  return {
    kontakte: ((data ?? []) as Omit<KontaktZeile, "naechsterTermin">[]).map((k) => ({ ...k, naechsterTermin: naechster.get(k.email) ?? null })),
    team,
    migrationFehlt: false,
  };
}

/** „Heute": Termine von heute bis in drei Tagen (Berlin) und geführte Calls ohne Ergebnis. */
export async function ladeHeute(service: SupabaseClient): Promise<{ termine: TerminKurz[]; ohneErgebnis: TerminKurz[] }> {
  const jetzt = new Date();
  const tag = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(jetzt);
  // Berliner Tag großzügig in UTC abdecken (±2 h); heute plus drei Tage, aufgeteilt wird im Client.
  const von = new Date(`${tag}T00:00:00Z`).getTime() - 2 * 3_600_000;
  const bis = von + 4 * 24 * 3_600_000 + 4 * 3_600_000;
  const { data } = await service
    .from("termine")
    .select("id, email, name, start_am, status, berater_name, join_url")
    .gte("start_am", new Date(von).toISOString())
    .lte("start_am", new Date(bis).toISOString())
    .in("status", ["gebucht", "no_show", "gefuehrt"])
    .order("start_am");
  const zeilen = (data ?? []) as Omit<TerminKurz, "kontaktId" | "closerId" | "telefon">[];
  const emails = [...new Set(zeilen.map((z) => z.email))];
  const { data: k } = emails.length
    ? await service.from("crm_kontakte").select("id, email, closer_id, telefon").in("email", emails)
    : { data: [] };
  type KurzKontakt = { id: string; email: string; closer_id: string | null; telefon: string | null };
  const je = new Map(((k ?? []) as KurzKontakt[]).map((x) => [x.email, x]));
  /*
    Datenqualität (Tracking-Playbook 13): geführte Calls der letzten 30 Tage ohne
    Ergebnis-Maske — offene Closer-Aufgabe und Warnung in der Auswertung.
  */
  const { data: gefuehrt } = await service
    .from("termine")
    .select("id, email, name, start_am, status, berater_name, join_url")
    .eq("status", "gefuehrt")
    .gte("start_am", new Date(jetzt.getTime() - 30 * 86_400_000).toISOString())
    .order("start_am", { ascending: false })
    .limit(200);
  const gZeilen = (gefuehrt ?? []) as Omit<TerminKurz, "kontaktId" | "closerId" | "telefon">[];
  const mitErgebnis = await ladeErgebnisse(service, gZeilen.map((g) => g.id));
  const offen = gZeilen.filter((g) => !mitErgebnis.has(g.id));
  const fehlend = [...new Set(offen.map((o) => o.email))].filter((e) => !je.has(e));
  if (fehlend.length) {
    const { data: k2 } = await service.from("crm_kontakte").select("id, email, closer_id, telefon").in("email", fehlend);
    for (const x of (k2 ?? []) as KurzKontakt[]) je.set(x.email, x);
  }
  const mit = (z: Omit<TerminKurz, "kontaktId" | "closerId" | "telefon">): TerminKurz => ({
    ...z,
    kontaktId: je.get(z.email)?.id ?? null,
    closerId: je.get(z.email)?.closer_id ?? null,
    telefon: je.get(z.email)?.telefon ?? null,
  });
  return {
    termine: zeilen.map(mit),
    // Ohne Migration 114 gibt es keine Ergebnisse — dann keine Warnung statt einer falschen.
    ohneErgebnis: (await ergebnisTabelleDa(service)) ? offen.map(mit) : [],
  };
}

async function ergebnisTabelleDa(service: SupabaseClient): Promise<boolean> {
  const { error } = await service.from("crm_call_ergebnis").select("id", { head: true, count: "exact" }).limit(1);
  return !error;
}

export type KontaktDetail = {
  kontakt: Omit<KontaktZeile, "naechsterTermin"> & { verlust_notiz: string | null; user_id: string | null; gewonnen_am: string | null };
  aktivitaeten: { id: string; art: string; ergebnis: string | null; text: string | null; von: string | null; am: string }[];
  antworten: { quelle: string; am: string; eintraege: { frage: string; antwort: string }[] }[];
  termine: {
    id: string;
    start_am: string;
    status: string;
    berater_name: string | null;
    join_url: string | null;
    umbuchen_url: string | null;
    no_show_am: string | null;
    vorgaenger_id: string | null;
    /** Letzte Version der Ergebnis-Maske (Migration 114), sonst null. */
    ergebnis: ErgebnisZeile | null;
  }[];
  mails: { vorlage: string; status: string; grund: string | null; gesendet_am: string | null; created_at: string }[];
  kaeufe: { id: string; produkt: string; soll_cents: number | null; status: string; gekauft_am: string; zahlweise: string; raten_gesamt: number | null }[];
  kassenlinks: { id: string; token: string; produkt: string; raten: number; status: string; created_at: string; closer: string | null }[];
  training: { gestartetAm: string | null; endeAm: string | null; bewerbungStatus: string | null } | null;
  pause: boolean;
  team: TeamMitglied[];
};

export async function ladeKontaktDetail(service: SupabaseClient, id: string): Promise<KontaktDetail | null> {
  const { data: k } = await service.from("crm_kontakte").select("*").eq("id", id).maybeSingle();
  if (!k) return null;
  const kontakt = k as KontaktDetail["kontakt"];
  const email = kontakt.email;
  const ilike = email.replace(/[\\%_]/g, (c) => `\\${c}`);

  const [akt, dLeads, tLeads, bew, termine, mails, kaeufe, links, pause, team] = await Promise.all([
    service.from("crm_aktivitaeten").select("id, art, ergebnis, text, von, am").eq("kontakt_id", id).order("am", { ascending: false }).limit(300),
    service.from("discord_leads").select("answers, questions_completed_at, created_at, source_origin").ilike("email", ilike),
    service.from("training_leads").select("answers, fragen_am, created_at, stelle").ilike("email", ilike),
    kontakt.user_id
      ? service.from("training_bewerbungen").select("antworten, status, eingereicht_am").eq("user_id", kontakt.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
    service.from("termine").select("id, start_am, status, berater_name, join_url, umbuchen_url, no_show_am, vorgaenger_id").eq("email", email).order("start_am", { ascending: false }),
    service.from("mail_versand").select("vorlage, status, grund, gesendet_am, created_at").eq("email", email).order("created_at", { ascending: false }).limit(100),
    service.from("mentoring_kauf").select("id, produkt, soll_cents, status, gekauft_am, zahlweise, raten_gesamt").ilike("email", ilike).order("gekauft_am", { ascending: false }),
    service.from("kassenlink").select("id, token, produkt, raten, status, created_at, closer").ilike("email", ilike).order("created_at", { ascending: false }),
    service.from("kontakt_pause").select("id").eq("email", email).is("aufgehoben_am", null).maybeSingle(),
    ladeTeam(service, true),
  ]);

  const antworten: KontaktDetail["antworten"] = [];
  const frage = (id: string) => ALLE_FRAGEN.find((q) => q.id === id)?.question ?? id;
  for (const l of (dLeads.data ?? []) as { answers: Record<string, string> | null; questions_completed_at: string | null; created_at: string; source_origin: string | null }[]) {
    if (l.answers && Object.keys(l.answers).length)
      antworten.push({
        quelle: l.source_origin ?? "discord_funnel",
        am: l.questions_completed_at ?? l.created_at,
        eintraege: Object.entries(l.answers).map(([id, a]) => ({ frage: frage(id), antwort: String(a) })),
      });
  }
  for (const l of (tLeads.data ?? []) as { answers: Record<string, string> | null; fragen_am: string | null; created_at: string }[]) {
    if (l.answers && Object.keys(l.answers).length)
      antworten.push({
        quelle: "training",
        am: l.fragen_am ?? l.created_at,
        eintraege: Object.entries(l.answers).map(([id, a]) => ({ frage: frage(id), antwort: String(a) })),
      });
  }
  const b = bew.data as { antworten: Record<string, string>; status: string; eingereicht_am: string } | null;
  if (b)
    antworten.push({
      quelle: "bewerbung",
      am: b.eingereicht_am,
      eintraege: bewerbungTexte.fragen.map((f) => ({ frage: f.frage, antwort: b.antworten?.[f.id] ?? "—" })),
    });

  // ICP-Antworten aus dem Onboarding (Migration 107/113) — Closer dürfen sie sehen (Emres ICP-Hinweis).
  if (kontakt.user_id) {
    const { data: icp } = await service
      .from("onboarding_antworten")
      // `*`: liest `main_problem_alle` (Migration 115) mit, falls vorhanden.
      .select("*")
      .eq("user_id", kontakt.user_id)
      .maybeSingle();
    const z = icp as Record<string, string | null> | null;
    const eintraege = z
      ? FRAGEN.filter((f) => z[f.feld]).map((f) => ({
          frage: f.frage,
          antwort:
            antwortText(f.feld, z) +
            (f.feld === "discovery_source" && z.discovery_source_other ? ` (${z.discovery_source_other})` : ""),
        }))
      : [];
    if (z && eintraege.length) antworten.push({ quelle: "icp", am: z.updated_at ?? kontakt.created_at, eintraege });
  }

  let training: KontaktDetail["training"] = null;
  if (kontakt.user_id) {
    const { data: z } = await service.from("training_zugang").select("gestartet_am, original_ende_am, verlaengerung_ende_am, verlaengerung_status").eq("user_id", kontakt.user_id).maybeSingle();
    const zz = z as { gestartet_am: string | null; original_ende_am: string; verlaengerung_ende_am: string | null; verlaengerung_status: string } | null;
    if (zz || b)
      training = {
        gestartetAm: zz?.gestartet_am ?? null,
        endeAm: zz ? (zz.verlaengerung_status === "aktiv" && zz.verlaengerung_ende_am ? zz.verlaengerung_ende_am : zz.original_ende_am) : null,
        bewerbungStatus: b?.status ?? null,
      };
  }

  const terminZeilen = (termine.data ?? []) as Omit<KontaktDetail["termine"][number], "ergebnis">[];
  const ergebnisse = await ladeErgebnisse(service, terminZeilen.map((t) => t.id));

  return {
    kontakt,
    aktivitaeten: (akt.data ?? []) as KontaktDetail["aktivitaeten"],
    antworten: antworten.sort((x, y) => y.am.localeCompare(x.am)),
    termine: terminZeilen.map((t) => ({ ...t, ergebnis: ergebnisse.get(t.id) ?? null })),
    mails: (mails.data ?? []) as KontaktDetail["mails"],
    kaeufe: (kaeufe.data ?? []) as KontaktDetail["kaeufe"],
    kassenlinks: (links.data ?? []) as KontaktDetail["kassenlinks"],
    training,
    pause: Boolean(pause.data),
    team,
  };
}

/* ─── Auswertung je Closer ──────────────────────────────────────────────── */

export type CloserStat = {
  closerId: string | null;
  name: string;
  kontakte: number;
  termine: number;
  gefuehrt: number;
  noShow: number;
  gewonnen: number;
  verloren: number;
  /** Vertragswert je Produkt (main, premium, ausbildung) und gesamt. */
  wertJeProdukt: Record<string, { anzahl: number; cents: number }>;
  wertCents: number;
  bezahltCents: number;
};

export async function ladeAuswertung(service: SupabaseClient, von: Date, bis: Date): Promise<{ stats: CloserStat[] }> {
  const vonIso = von.toISOString();
  const bisIso = bis.toISOString();
  const [team, { data: kontakte }, { data: termine }, { data: kaeufe }] = await Promise.all([
    ladeTeam(service, true),
    service.from("crm_kontakte").select("email, closer_id, phase, created_at, verloren_am").limit(10000),
    service.from("termine").select("email, start_am, status").gte("start_am", vonIso).lt("start_am", bisIso),
    service.from("mentoring_kauf").select("*").gte("gekauft_am", vonIso).lt("gekauft_am", bisIso).neq("produkt", "live"),
  ]);
  const kontaktJe = new Map(((kontakte ?? []) as { email: string; closer_id: string | null }[]).map((k) => [k.email, k]));
  const stats = new Map<string, CloserStat>();
  const stat = (id: string | null): CloserStat => {
    const key = id ?? "pool";
    if (!stats.has(key))
      stats.set(key, {
        closerId: id,
        name: id ? (team.find((t) => t.user_id === id)?.name ?? "Unbekannt") : "Nicht zugewiesen",
        kontakte: 0,
        termine: 0,
        gefuehrt: 0,
        noShow: 0,
        gewonnen: 0,
        verloren: 0,
        wertJeProdukt: {},
        wertCents: 0,
        bezahltCents: 0,
      });
    return stats.get(key)!;
  };
  for (const t of team) stat(t.user_id);

  for (const k of (kontakte ?? []) as { closer_id: string | null; phase: string; created_at: string; verloren_am: string | null }[]) {
    if (k.created_at >= vonIso && k.created_at < bisIso) stat(k.closer_id).kontakte++;
    if (k.phase === "verloren" && k.verloren_am && k.verloren_am >= vonIso && k.verloren_am < bisIso) stat(k.closer_id).verloren++;
  }
  for (const t of (termine ?? []) as { email: string; status: string }[]) {
    const s = stat(kontaktJe.get(t.email)?.closer_id ?? null);
    if (t.status === "umgebucht") continue;
    s.termine++;
    if (t.status === "gefuehrt") s.gefuehrt++;
    if (t.status === "no_show") s.noShow++;
  }

  const kaufListe = (kaeufe ?? []) as {
    id: string;
    email: string | null;
    produkt: string;
    soll_cents: number | null;
    status: string;
    zahlweise: string;
    closer: string | null;
    credit_regel?: string | null;
    credit_closer_id?: string | null;
  }[];
  const raten = kaufListe.length
    ? (await service.from("mentoring_rate").select("kauf_id, betrag_cents").in("kauf_id", kaufListe.map((k) => k.id))).data ?? []
    : [];
  const bezahltJe = new Map<string, number>();
  for (const r of raten as { kauf_id: string; betrag_cents: number }[]) bezahltJe.set(r.kauf_id, (bezahltJe.get(r.kauf_id) ?? 0) + r.betrag_cents);

  for (const k of kaufListe) {
    if (k.status === "erstattet") continue;
    /*
      Zuordnung: der beim Kauf eingefrorene Verkaufs-Credit (Migration 114,
      Closer des geführten Calls). Ohne Credit wie bisher: Closer am Kassenlink,
      sonst der zugewiesene Closer des Kontakts.
    */
    const perKuerzel = k.closer ? team.find((t) => t.kuerzel === k.closer)?.user_id : null;
    const s = k.credit_regel
      ? stat(k.credit_closer_id ?? null)
      : stat(perKuerzel ?? (k.email ? (kontaktJe.get(k.email.toLowerCase())?.closer_id ?? null) : null));
    s.gewonnen++;
    const wert = k.soll_cents ?? 0;
    s.wertCents += wert;
    const p = (s.wertJeProdukt[k.produkt] ??= { anzahl: 0, cents: 0 });
    p.anzahl++;
    p.cents += wert;
    s.bezahltCents += k.zahlweise === "raten" ? (bezahltJe.get(k.id) ?? 0) : wert;
  }
  return { stats: [...stats.values()] };
}
