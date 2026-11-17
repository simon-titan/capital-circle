"use client";

import { Box, Button, Flex, HStack, Input, InputGroup, InputLeftElement, Text, Tooltip } from "@chakra-ui/react";
import { BellRing, CalendarClock, Clock, RefreshCw, Search, TriangleAlert, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusPill, adminInputProps, type AdminTone } from "@/components/admin/adminUi";
import { NEUER_FUNNEL, OFFENE_PHASEN, PHASEN, QUELLEN, phaseLabel, type Phase, type Quelle } from "@/config/crm";
import { NO_SHOW_ANRUF_MINUTEN } from "@/config/crm";
import { passtZurSuche, relativ, wann, type NaechsteAktivitaet } from "@/lib/crm/anzeige";
import type { KontaktZeile } from "@/lib/crm/daten";
import type { TeamMitglied } from "@/lib/crm/zuweisung";
import { AuswahlMenu, Avatar, Chip, useCrm, type Option } from "./ui";

/**
 * Gemeinsame Bausteine des CRM (`/crm`): Laden der Kontakte, Filterleiste
 * (Closer, Phase, Quelle, Zeitraum, Suche — gemerkt im Browser), Formatierer.
 * Alle sehen alle Kontakte; „Meine" ist ein Filter, keine Sperre.
 */

export type { KontaktZeile, TeamMitglied };

export function useKontakte() {
  const [daten, setDaten] = useState<{ kontakte: KontaktZeile[]; team: TeamMitglied[]; migrationFehlt: boolean } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const res = await fetch("/api/crm/kontakte", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; kontakte: KontaktZeile[]; team: TeamMitglied[]; migrationFehlt: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? `Fehler ${res.status}`);
      setDaten({ kontakte: json.kontakte, team: json.team, migrationFehlt: json.migrationFehlt });
      setFehler(null);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaedt(false);
    }
  }, []);

  const abgleichen = useCallback(async () => {
    setLaedt(true);
    await fetch("/api/crm/sync", { method: "POST" }).catch(() => null);
    await laden();
  }, [laden]);

  useEffect(() => {
    void laden();
  }, [laden]);
  useNeuLadenBeiRueckkehr(laden);

  return { daten, fehler, laedt, laden, abgleichen, setDaten };
}

/* ─── Filter ───────────────────────────────────────────────────────────── */

export type Filter = {
  closer: "alle" | "meine" | "pool" | string;
  phase: "offen" | "alle" | Phase;
  quelle: "neu" | "alle" | Quelle;
  zeitraum: "alle" | "7" | "30" | "90";
  suche: string;
  nurFaellig: boolean;
};

export const FILTER_STANDARD: Filter = { closer: "alle", phase: "offen", quelle: "neu", zeitraum: "alle", suche: "", nurFaellig: false };

export function useFilter(schluessel: string) {
  const [filter, setFilter] = useState<Filter>(FILTER_STANDARD);
  useEffect(() => {
    try {
      const roh = window.localStorage.getItem(`crm-filter:${schluessel}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- gespeicherten Filter einmal nach dem Laden übernehmen
      if (roh) setFilter({ ...FILTER_STANDARD, ...(JSON.parse(roh) as Partial<Filter>) });
    } catch {
      /* egal */
    }
  }, [schluessel]);
  const setze = useCallback(
    (teil: Partial<Filter>) =>
      setFilter((f) => {
        const neu = { ...f, ...teil };
        try {
          window.localStorage.setItem(`crm-filter:${schluessel}`, JSON.stringify({ ...neu, suche: "" }));
        } catch {
          /* egal */
        }
        return neu;
      }),
    [schluessel],
  );
  return { filter, setze };
}

export function filtere(kontakte: KontaktZeile[], f: Filter, ichId: string | null, jetzt: number, mitPhase = true): KontaktZeile[] {
  const q = f.suche.trim().toLowerCase();
  const seit = f.zeitraum === "alle" ? 0 : jetzt - Number(f.zeitraum) * 86_400_000;
  return kontakte.filter((k) => {
    if (f.closer === "meine" && k.closer_id !== ichId) return false;
    if (f.closer === "pool" && k.closer_id) return false;
    if (f.closer !== "alle" && f.closer !== "meine" && f.closer !== "pool" && k.closer_id !== f.closer) return false;
    if (mitPhase) {
      if (f.phase === "offen" && !OFFENE_PHASEN.includes(k.phase as Phase)) return false;
      if (f.phase !== "offen" && f.phase !== "alle" && k.phase !== f.phase) return false;
    }
    if (f.quelle === "neu" && !k.quellen.some((x) => NEUER_FUNNEL.includes(x as Quelle))) return false;
    if (f.quelle !== "neu" && f.quelle !== "alle" && !k.quellen.includes(f.quelle)) return false;
    if (seit && new Date(k.created_at).getTime() < seit) return false;
    if (f.nurFaellig && !(k.wiedervorlage_am && new Date(k.wiedervorlage_am).getTime() <= jetzt)) return false;
    if (q && !passtZurSuche(k, q)) return false;
    return true;
  });
}

export function FilterLeiste({
  filter,
  setze,
  team,
  ohnePhase = false,
  rechts,
}: {
  filter: Filter;
  setze: (f: Partial<Filter>) => void;
  team: TeamMitglied[];
  ohnePhase?: boolean;
  rechts?: React.ReactNode;
}) {
  const { ichId } = useCrm();
  const aktivesTeam = team.filter((t) => t.aktiv);
  const closer: Option[] = [
    { wert: "alle", label: "Alle" },
    ...(ichId ? [{ wert: "meine", label: "Meine" }] : []),
    { wert: "pool", label: "Pool (nicht zugewiesen)" },
    ...aktivesTeam.map((t, i) => ({ wert: t.user_id, label: t.name, vor: <Avatar name={t.name} groesse={20} />, trenner: i === 0 })),
  ];
  const veraendert =
    filter.closer !== FILTER_STANDARD.closer ||
    (!ohnePhase && filter.phase !== FILTER_STANDARD.phase) ||
    filter.quelle !== FILTER_STANDARD.quelle ||
    filter.zeitraum !== FILTER_STANDARD.zeitraum ||
    filter.nurFaellig ||
    Boolean(filter.suche);
  return (
    <Flex gap={2} wrap="wrap" align="center">
      <InputGroup size="sm" w={{ base: "100%", md: "260px" }}>
        <InputLeftElement pointerEvents="none" h="32px" color="var(--cc-text-3)">
          <Search size={14} strokeWidth={1.75} />
        </InputLeftElement>
        <Input h="32px" placeholder="Name, E-Mail, Telefon" value={filter.suche} onChange={(e) => setze({ suche: e.target.value })} aria-label="Liste durchsuchen" {...adminInputProps} />
      </InputGroup>
      <AuswahlMenu label="Closer" wert={filter.closer} standard={FILTER_STANDARD.closer} optionen={closer} onWahl={(w) => setze({ closer: w })} />
      {!ohnePhase ? (
        <AuswahlMenu
          label="Phase"
          wert={filter.phase}
          standard={FILTER_STANDARD.phase}
          optionen={[{ wert: "offen", label: "Offene" }, { wert: "alle", label: "Alle" }, ...PHASEN.map((p, i) => ({ wert: p.id, label: p.label, trenner: i === 0 }))]}
          onWahl={(w) => setze({ phase: w as Filter["phase"] })}
        />
      ) : null}
      <AuswahlMenu
        label="Quelle"
        wert={filter.quelle}
        standard={FILTER_STANDARD.quelle}
        optionen={[
          { wert: "neu", label: "Neuer Funnel" },
          { wert: "alle", label: "Alle" },
          ...Object.entries(QUELLEN).map(([id, label], i) => ({ wert: id, label, trenner: i === 0 })),
        ]}
        onWahl={(w) => setze({ quelle: w as Filter["quelle"] })}
      />
      <AuswahlMenu
        label="Angelegt"
        wert={filter.zeitraum}
        standard={FILTER_STANDARD.zeitraum}
        optionen={[
          { wert: "alle", label: "Jederzeit" },
          { wert: "7", label: "Letzte 7 Tage" },
          { wert: "30", label: "Letzte 30 Tage" },
          { wert: "90", label: "Letzte 90 Tage" },
        ]}
        onWahl={(w) => setze({ zeitraum: w as Filter["zeitraum"] })}
      />
      <Chip aktiv={filter.nurFaellig} icon={BellRing} onClick={() => setze({ nurFaellig: !filter.nurFaellig })}>
        Wiedervorlage fällig
      </Chip>
      {veraendert ? (
        <Box
          as="button"
          type="button"
          fontSize="13px"
          color="var(--cc-text-3)"
          px={1}
          _hover={{ color: "var(--cc-text)" }}
          onClick={() => setze({ ...FILTER_STANDARD, ...(ohnePhase ? { phase: filter.phase } : {}) })}
        >
          Zurücksetzen
        </Box>
      ) : null}
      {rechts ? (
        <Flex ml="auto" gap={2} align="center">
          {rechts}
        </Flex>
      ) : null}
    </Flex>
  );
}

export function AktualisierenKnopf({ laedt, onClick }: { laedt: boolean; onClick: () => void }) {
  return (
    <Tooltip label="Mit allen Quellen abgleichen" openDelay={350} hasArrow bg="var(--cc-surface-2)" color="var(--cc-text)" fontSize="12px">
      <Button size="sm" variant="line" px={0} minW="32px" h="32px" onClick={onClick} isDisabled={laedt} aria-label="Aktualisieren">
        <Box as="span" display="inline-flex" className={laedt ? "crm-dreht" : undefined}>
          <RefreshCw size={15} strokeWidth={1.75} />
        </Box>
      </Button>
    </Tooltip>
  );
}

/* ─── Formatierung ─────────────────────────────────────────────────────── */

export const PHASE_TON: Record<string, AdminTone> = {
  neu: "attention",
  kontaktiert: "neutral",
  termin: "attention",
  no_show: "danger",
  gespraech: "attention",
  angebot: "attention",
  spaeter: "neutral",
  gewonnen: "success",
  verloren: "neutral",
};

export function PhasePill({ phase }: { phase: string }) {
  return <StatusPill tone={PHASE_TON[phase] ?? "neutral"}>{phaseLabel[phase as Phase] ?? phase}</StatusPill>;
}

export function datum(iso: string | null | undefined, mitZeit = true): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "short",
    ...(mitZeit ? { timeStyle: "short" } : {}),
    timeZone: "Europe/Berlin",
  });
}

export function euro(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function closerName(team: TeamMitglied[], id: string | null): string {
  if (!id) return "Pool";
  return team.find((t) => t.user_id === id)?.name ?? "—";
}

/** wa.me braucht Ziffern mit Ländervorwahl; deutsche 0… wird zu 49… */
export function whatsappLink(telefon: string | null, text?: string): string | null {
  if (!telefon) return null;
  let ziffern = telefon.replace(/[^\d+]/g, "");
  if (ziffern.startsWith("+")) ziffern = ziffern.slice(1);
  else if (ziffern.startsWith("00")) ziffern = ziffern.slice(2);
  else if (ziffern.startsWith("0")) ziffern = `49${ziffern.slice(1)}`;
  if (ziffern.length < 8) return null;
  return `https://wa.me/${ziffern}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/**
 * Aktuelle Zeit, alle 30 s neu — damit „Termin läuft", „No-Show anrufen" und
 * „vor 12 Min." stimmen, auch wenn die Seite den ganzen Nachmittag offen ist.
 */
export function useJetzt(takt = 30_000): number {
  const [jetzt, setJetzt] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setJetzt(Date.now()), takt);
    return () => window.clearInterval(t);
  }, [takt]);
  return jetzt;
}

/**
 * Lädt neu, wenn der Tab wieder sichtbar wird (Closer kommt vom Telefonat
 * oder aus Zoom zurück) und sonst alle 2 Minuten, solange der Tab offen ist.
 */
export function useNeuLadenBeiRueckkehr(laden: () => unknown, takt = 120_000) {
  useEffect(() => {
    let zuletzt = Date.now();
    const vielleicht = () => {
      if (document.visibilityState !== "visible" || Date.now() - zuletzt < 15_000) return;
      zuletzt = Date.now();
      void laden();
    };
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        zuletzt = Date.now();
        void laden();
      }
    }, takt);
    document.addEventListener("visibilitychange", vielleicht);
    window.addEventListener("focus", vielleicht);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", vielleicht);
      window.removeEventListener("focus", vielleicht);
    };
  }, [laden, takt]);
}

/** Kurze Rückmeldung über der Ansicht (Erfolg in Gold, Fehler in Rot). */
export function Hinweis({ meldung, onSchliessen }: { meldung: { art: "ok" | "fehler"; text: string } | null; onSchliessen?: () => void }) {
  if (!meldung) return null;
  return (
    <HStack
      role={meldung.art === "fehler" ? "alert" : "status"}
      px={3}
      py={2}
      borderRadius="10px"
      border="1px solid"
      borderColor={meldung.art === "fehler" ? "rgba(220, 90, 80, 0.45)" : "var(--cc-gold-line)"}
      bg={meldung.art === "fehler" ? "rgba(220, 90, 80, 0.08)" : "rgba(212, 176, 128, 0.07)"}
      fontSize="sm"
      color={meldung.art === "fehler" ? "var(--cc-danger)" : "var(--cc-gold-light)"}
    >
      <Text flex="1">{meldung.text}</Text>
      {onSchliessen ? (
        <Box as="button" type="button" onClick={onSchliessen} fontSize="xs" color="var(--cc-text-3)" _hover={{ color: "var(--cc-text)" }} aria-label="Hinweis schließen">
          Schließen
        </Box>
      ) : null}
    </HStack>
  );
}

export function Leer({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="sm" color="var(--cc-text-2)" py={6} textAlign="center">
      {children}
    </Text>
  );
}

export function useGefiltert(kontakte: KontaktZeile[] | undefined, filter: Filter, ichId: string | null, mitPhase = true) {
  const jetzt = useJetzt();
  return useMemo(() => filtere(kontakte ?? [], filter, ichId, jetzt, mitPhase), [kontakte, filter, ichId, jetzt, mitPhase]);
}

/**
 * Nächste Aktivität als kleiner Hinweis (Pipeline-Karte, Liste) — wie der
 * Aktivitätsindikator in Pipedrive: Termin in Gold, läuft in Grün, vorbei ohne
 * Status und fällige Wiedervorlage in Rot, geplante Wiedervorlage neutral,
 * „kein Schritt" gedämpft mit Warnzeichen.
 */
export function AktivitaetHinweis({ n, jetzt }: { n: NaechsteAktivitaet; jetzt: number }) {
  let stil: { icon: typeof Clock; farbe: string; text: string; titel: string };
  if (n.art === "termin") {
    const start = new Date(n.iso).getTime();
    if (start > jetzt) stil = { icon: CalendarClock, farbe: "var(--cc-gold-light)", text: wann(n.iso, jetzt), titel: "Nächster Termin" };
    else if (jetzt < start + NO_SHOW_ANRUF_MINUTEN * 60_000) stil = { icon: Video, farbe: "var(--cc-success)", text: "läuft jetzt", titel: "Termin läuft" };
    else stil = { icon: CalendarClock, farbe: "var(--cc-danger)", text: "Status fehlt", titel: `Termin ${wann(n.iso, jetzt)} ohne Status` };
  } else if (n.art === "wv_faellig") stil = { icon: BellRing, farbe: "var(--cc-danger)", text: "fällig", titel: `Wiedervorlage ${relativ(n.iso, jetzt)}` };
  else if (n.art === "wv") stil = { icon: Clock, farbe: "var(--cc-text-2)", text: wann(n.iso, jetzt), titel: "Wiedervorlage" };
  else stil = { icon: TriangleAlert, farbe: "var(--cc-text-3)", text: "kein Schritt", titel: "Kein Termin und keine Wiedervorlage geplant" };
  return (
    <Flex align="center" gap={1} color={stil.farbe} fontSize="11px" flexShrink={0} title={stil.titel} className="cc-num" whiteSpace="nowrap">
      <stil.icon size={12} strokeWidth={1.9} />
      {stil.text}
    </Flex>
  );
}
