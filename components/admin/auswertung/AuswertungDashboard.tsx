"use client";

import { Box, Button, Checkbox, Flex, Grid, HStack, Input, Select, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { Download, Info, RefreshCw } from "lucide-react";
import NextLink from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  StatusPill,
  adminCardPadding,
  adminChipProps,
  adminInputProps,
  adminOptionStyle,
  adminTableSx,
} from "@/components/admin/adminUi";
import type { Dashboard, Karte as KpiKarteDaten } from "@/lib/finanzen/dashboard";
import { euroText, quoteText } from "@/lib/finanzen/geld";
import type { NachtragErgebnis } from "@/lib/finanzen/backfill";

/**
 * Auswertungs-Dashboard (Tracking-Playbook 12): vier Reiter, Standard 30 Tage,
 * Filter Funnel, Leadquelle, Produkt, Closer. Jede Karte zeigt auf Klick
 * Definition, Population, Zeitlogik und nicht anwendbare Filter. Daten stehen
 * in Text/Datentinte; Gold nur für aktive Auswahl und die Hauptaktion.
 */

type Reiter = "uebersicht" | "funnel" | "vertrieb" | "finanzen";
type Antwort = Dashboard & { ok: boolean; error?: string };

const REITER: { id: Reiter; label: string }[] = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "funnel", label: "Funnel" },
  { id: "vertrieb", label: "Vertrieb" },
  { id: "finanzen", label: "Finanzen" },
];

const QUALITAET: Record<string, { label: string; tone: "neutral" | "attention" | "danger" }> = {
  partial: { label: "teilweise", tone: "attention" },
  unknown: { label: "unbekannt", tone: "danger" },
  delayed: { label: "verzögert", tone: "attention" },
};

function wertText(wert: number | null | undefined, format: "geld" | "quote" | "zahl"): string {
  if (format === "geld") return wert == null ? "No Data" : euroText(wert);
  if (format === "quote") return quoteText(wert);
  return wert == null ? "No Data" : wert.toLocaleString("de-DE");
}

const datum = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }) : "—";

export function AuswertungDashboard() {
  const [reiter, setReiter] = useState<Reiter>("uebersicht");
  const [zeitraum, setZeitraum] = useState("30");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [funnel, setFunnel] = useState("alle");
  const [quelle, setQuelle] = useState("alle");
  const [produkt, setProdukt] = useState("alle");
  const [closer, setCloser] = useState("all");
  const [d, setD] = useState<Antwort | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams({ zeitraum, funnel, quelle, produkt, closer });
    if (zeitraum === "frei") {
      p.set("von", von);
      p.set("bis", bis);
    }
    return p.toString();
  }, [zeitraum, von, bis, funnel, quelle, produkt, closer]);

  const laden = useCallback(async () => {
    if (zeitraum === "frei" && (!von || !bis)) return;
    setLaedt(true);
    try {
      const res = await fetch(`/api/admin/auswertung?${params}`, { cache: "no-store" });
      const json = (await res.json()) as Antwort;
      if (!json.ok) throw new Error(json.error ?? `Fehler ${res.status}`);
      setD(json);
      setFehler(null);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaedt(false);
    }
  }, [params, zeitraum, von, bis]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const exportParams = new URLSearchParams({ zeitraum, ...(zeitraum === "frei" ? { von, bis } : {}) }).toString();

  return (
    <Stack gap={5}>
      {/* Filter */}
      <Box className={ADMIN_CARD_CLASS} p={{ base: 3, md: 4 }}>
        <Flex gap={2} wrap="wrap" align="center" mb={3}>
          {[
            ["7", "7 Tage"],
            ["30", "30 Tage"],
            ["90", "90 Tage"],
            ["gesamt", "Gesamt"],
            ["frei", "Zeitraum …"],
          ].map(([id, label]) => (
            <Box key={id} as="button" type="button" onClick={() => setZeitraum(id!)} {...adminChipProps(zeitraum === id)}>
              {label}
            </Box>
          ))}
          {zeitraum === "frei" ? (
            <HStack>
              <Input type="date" size="sm" maxW="160px" value={von} onChange={(e) => setVon(e.target.value)} {...adminInputProps} />
              <Text color="var(--cc-text-3)">bis</Text>
              <Input type="date" size="sm" maxW="160px" value={bis} onChange={(e) => setBis(e.target.value)} {...adminInputProps} />
            </HStack>
          ) : null}
          <Button size="sm" variant="line" ml="auto" leftIcon={<RefreshCw size={14} />} isLoading={laedt} onClick={() => void laden()}>
            Aktualisieren
          </Button>
        </Flex>
        <Flex gap={2} wrap="wrap" align="center">
          <Auswahl wert={funnel} setze={setFunnel} optionen={[["alle", "Alle Funnel"], ["free", "Free-Kurs (A)"], ["main", "Main-Funnel (B)"]]} />
          <Auswahl wert={quelle} setze={setQuelle} optionen={[["alle", "Alle Leadquellen"], ...(d?.kanaele ?? []).map((k) => [k, k === "unknown" ? "Unbekannt" : k] as [string, string])]} />
          <Auswahl
            wert={produkt}
            setze={setProdukt}
            optionen={[["alle", "Alle Produkte"], ["main", "Main"], ["premium", "Premium"], ["ausbildung", "Ausbildung"], ["live", "Live-Abo"]]}
          />
          <Box w="1px" h="22px" bg="var(--cc-line)" mx={1} />
          {[{ id: "all", name: "Alle Closer" }, ...(d?.team ?? []).map((t) => ({ id: t.id, name: t.name })), { id: "unassigned", name: "Nicht zugewiesen" }].map((c) => (
            <Box key={c.id} as="button" type="button" onClick={() => setCloser(c.id)} {...adminChipProps(closer === c.id)}>
              {c.name}
            </Box>
          ))}
        </Flex>
        <Flex gap={2} mt={3} wrap="wrap" align="center">
          <Text fontSize="xs" color="var(--cc-text-3)" mr="auto">
            {d ? `Stand ${datum(d.stand.erzeugtAm)} · letzte Stripe-Buchung ${datum(d.stand.letzteBuchungAm)}` : ""}
          </Text>
          <Button as="a" href={`/api/admin/auswertung/export/buchhaltung?${exportParams}`} size="sm" variant="line" leftIcon={<Download size={14} />}>
            Buchhaltung (ZIP)
          </Button>
          <Button as="a" href={`/api/admin/auswertung/export/chatgpt?${exportParams}`} size="sm" variant="line" leftIcon={<Download size={14} />}>
            ChatGPT-Export (ZIP)
          </Button>
        </Flex>
      </Box>

      <HStack gap={2} wrap="wrap">
        {REITER.map((r) => (
          <Box key={r.id} as="button" type="button" onClick={() => setReiter(r.id)} {...adminChipProps(reiter === r.id)}>
            {r.label}
          </Box>
        ))}
      </HStack>

      {fehler ? <Text color="var(--cc-danger)">{fehler}</Text> : null}
      {d && !d.stand.migration114 ? (
        <Text fontSize="sm" color="var(--cc-gold-light)">
          Migration 114 ist noch nicht eingespielt — Ledger, Provision und Ergebnis-Maske fehlen (supabase/migrations/_JETZT_EINSPIELEN.sql).
        </Text>
      ) : null}
      {!d ? <Text color="var(--cc-text-2)">Lädt …</Text> : null}

      {d && reiter === "uebersicht" ? <Uebersicht d={d} /> : null}
      {d && reiter === "funnel" ? <FunnelReiter d={d} /> : null}
      {d && reiter === "vertrieb" ? <Vertrieb d={d} /> : null}
      {d && reiter === "finanzen" ? <Finanzen d={d} neuLaden={laden} /> : null}
    </Stack>
  );
}

function Auswahl({ wert, setze, optionen }: { wert: string; setze: (v: string) => void; optionen: [string, string][] }) {
  return (
    <Select size="sm" maxW="200px" value={wert} onChange={(e) => setze(e.target.value)} {...adminInputProps}>
      {optionen.map(([id, label]) => (
        <option key={id} value={id} style={adminOptionStyle}>
          {label}
        </option>
      ))}
    </Select>
  );
}

/* ─── Bausteine ─────────────────────────────────────────────────────────── */

function KpiKarte({ k }: { k: KpiKarteDaten }) {
  const [offen, setOffen] = useState(false);
  const q = QUALITAET[k.qualitaet];
  return (
    <Box className={ADMIN_CARD_CLASS} p={4} display="flex" flexDirection="column" gap={1.5}>
      <Flex align="center" gap={2}>
        <Text fontSize="xs" color="var(--cc-text-2)" flex="1">
          {k.titel}
        </Text>
        {q ? <StatusPill tone={q.tone}>{q.label}</StatusPill> : null}
        <Box as="button" type="button" aria-label={`Definition ${k.titel}`} onClick={() => setOffen(!offen)} color="var(--cc-text-3)" _hover={{ color: "var(--cc-text)" }}>
          <Info size={14} />
        </Box>
      </Flex>
      <Text className="cc-num" fontSize="26px" fontWeight={600} lineHeight={1.15}>
        {wertText(k.wert, k.format)}
      </Text>
      {k.format === "quote" && k.nenner != null ? (
        <Text fontSize="xs" color="var(--cc-text-3)" className="cc-num">
          {k.zaehler} / {k.nenner}
        </Text>
      ) : null}
      {(k.zusatz ?? []).map((z) => (
        <Text key={z.label} fontSize="xs" color="var(--cc-text-2)" className="cc-num">
          {z.label}: {wertText(z.wert, z.format)}
        </Text>
      ))}
      {k.nichtAnwendbar.length ? (
        <Text fontSize="xs" color="var(--cc-text-3)">
          Filter nicht anwendbar: {k.nichtAnwendbar.join(", ")}
        </Text>
      ) : null}
      {offen ? (
        <Box mt={1} pt={2} borderTop="1px solid var(--cc-line)" fontSize="xs" color="var(--cc-text-2)">
          <Text>{k.definition}</Text>
          <Text mt={1}>Population: {k.population}</Text>
          <Text>Zeitlogik: {k.zeitlogik}</Text>
          {k.hinweis ? <Text>Hinweis: {k.hinweis}</Text> : null}
        </Box>
      ) : null}
    </Box>
  );
}

function Kachel({ titel, wert, unter }: { titel: string; wert: string; unter?: ReactNode }) {
  return (
    <Box className={ADMIN_CARD_CLASS} p={4}>
      <Text fontSize="xs" color="var(--cc-text-2)">
        {titel}
      </Text>
      <Text className="cc-num" fontSize="22px" fontWeight={600}>
        {wert}
      </Text>
      {unter ? (
        <Text fontSize="xs" color="var(--cc-text-3)" className="cc-num">
          {unter}
        </Text>
      ) : null}
    </Box>
  );
}

function Karte({ titel, children, rechts }: { titel: string; children: ReactNode; rechts?: ReactNode }) {
  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} overflowX="auto">
      <Flex align="center" mb={3} gap={3}>
        <AdminCardTitle flex="1">{titel}</AdminCardTitle>
        {rechts}
      </Flex>
      {children}
    </Box>
  );
}

function Leer({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="sm" color="var(--cc-text-3)" py={3}>
      {children}
    </Text>
  );
}

/* ─── Reiter ────────────────────────────────────────────────────────────── */

function Uebersicht({ d }: { d: Antwort }) {
  const max = Math.max(1, ...d.uebersicht.trichter.map((t) => t.wert));
  return (
    <Stack gap={4}>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={3}>
        {d.karten.map((k) => (
          <KpiKarte key={k.id} k={k} />
        ))}
      </Grid>
      <Grid templateColumns={{ base: "1fr", lg: "1.2fr 1fr" }} gap={4}>
        <Karte titel="Funnel-Conversion im Zeitraum">
          <Stack gap={2}>
            {d.uebersicht.trichter.map((t, i) => {
              const vor = d.uebersicht.trichter[i - 1];
              return (
                <Box key={t.stufe}>
                  <Flex justify="space-between" fontSize="sm">
                    <Text>{t.stufe}</Text>
                    <Text className="cc-num">
                      {t.wert.toLocaleString("de-DE")}
                      {vor ? <Text as="span" color="var(--cc-text-3)"> · {quoteText(vor.wert ? t.wert / vor.wert : null)}</Text> : null}
                    </Text>
                  </Flex>
                  <Box h="6px" bg="var(--cc-track, #292c32)" borderRadius="3px" mt={1}>
                    <Box h="100%" w={`${(t.wert / max) * 100}%`} bg="var(--cc-ink, #d1d0d4)" borderRadius="3px" />
                  </Box>
                </Box>
              );
            })}
            <Text fontSize="xs" color="var(--cc-text-3)">
              Stufen aus verschiedenen Populationen (Anfrage, Buchungsvorgang, Terminversion, Kontakt) — keine strenge Kohorte.
            </Text>
          </Stack>
        </Karte>
        <Karte titel="Netto-Umsatz nach erster bekannter Quelle">
          {d.uebersicht.umsatzNachQuelle.length === 0 ? (
            <Leer>No Data</Leer>
          ) : (
            <Table size="sm" sx={adminTableSx}>
              <Tbody>
                {d.uebersicht.umsatzNachQuelle.map((u) => (
                  <Tr key={u.quelle}>
                    <Td>{u.quelle === "unknown" ? "Unbekannt" : u.quelle}</Td>
                    <Td isNumeric className="cc-num">
                      {euroText(u.nettoCents)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
            Last-non-direct wird nicht erfasst (Lücke). Fehlende Quelle = Unbekannt, nie „direkt“.
          </Text>
        </Karte>
      </Grid>
      <Karte titel="Datenqualität">
        {d.uebersicht.warnungen.length === 0 ? (
          <Leer>Keine Warnungen.</Leer>
        ) : (
          <Stack gap={1.5}>
            {d.uebersicht.warnungen.map((w) => (
              <Flex key={w.id} gap={3} align="center">
                <StatusPill tone={w.id === "migration" || w.id === "quarantaene" ? "danger" : "attention"}>{w.anzahl}</StatusPill>
                <Text fontSize="sm">{w.text}</Text>
              </Flex>
            ))}
          </Stack>
        )}
      </Karte>
    </Stack>
  );
}

function FunnelReiter({ d }: { d: Antwort }) {
  const f = d.funnel;
  const stufen = (zeilen: [string, number][]) => (
    <Table size="sm" sx={adminTableSx}>
      <Tbody>
        {zeilen.map(([label, wert], i) => (
          <Tr key={label}>
            <Td>{label}</Td>
            <Td isNumeric className="cc-num">
              {wert.toLocaleString("de-DE")}
            </Td>
            <Td isNumeric className="cc-num" color="var(--cc-text-3)">
              {i > 0 ? quoteText(zeilen[i - 1]![1] ? wert / zeilen[i - 1]![1] : null) : ""}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
  return (
    <Stack gap={4}>
      <Flex gap={2} align="center">
        <StatusPill tone="attention">teilweise</StatusPill>
        <Text fontSize="sm" color="var(--cc-text-2)">
          Nur serverbestätigte Stufen und die Kaufweg-Messung der Verkaufsseite. VSL- und Seitentiefe sind Phase P1. Closer-Filter hier nicht anwendbar.
        </Text>
      </Flex>
      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
        <Karte titel="Funnel A · Free-Kurs">
          {stufen([
            ["Bewerbungen eingereicht", f.free.bewerbungen],
            ["Adresse bestätigt", f.free.bestaetigt],
            ["Angenommen", f.free.angenommen],
            ["Zugang freigeschaltet (Kohorte)", f.free.freigeschaltet],
            ["Kurs gestartet", f.free.gestartet],
            ["Gesprächsanfragen", f.free.anfragen],
            ["Calls gebucht", f.free.gebucht],
            ["Calls geführt", f.free.held],
            ["Neue Kunden (Free-Quelle)", f.free.kunden],
          ])}
          <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
            Abgelehnt {f.free.abgelehnt} · offen {f.free.offen} · aus der Freischaltungskohorte gekauft {f.free.freiMitKauf}
          </Text>
        </Karte>
        <Karte titel="Funnel B · Main (/call, /termin, Discord)">
          {stufen([
            ["Gesprächsanfragen (Fragebogen)", f.main.anfragen],
            ["Calls gebucht", f.main.gebucht],
            ["Calls geführt", f.main.held],
            ["Neue Kunden (Main-Quelle)", f.main.kunden],
          ])}
        </Karte>
      </Grid>
      <Karte titel="Verkaufsseite / (Kaufweg-Messung)">
        {f.verkaufsseite ? (
          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }} gap={3}>
            <Kachel titel="Sitzungen" wert={f.verkaufsseite.sitzungen.toLocaleString("de-DE")} />
            <Kachel titel="CTA-Rate" wert={quoteText(f.verkaufsseite.ctaRate)} unter={`${f.verkaufsseite.mitKlick} Sitzungen mit Klick`} />
            <Kachel titel="Kasse geöffnet" wert={quoteText(f.verkaufsseite.kassenRate)} unter={`${f.verkaufsseite.kassen} Sitzungen`} />
            <Kachel titel="Ø sichtbare Zeit" wert={f.verkaufsseite.sichtbarSek == null ? "No Data" : `${f.verkaufsseite.sichtbarSek} s`} />
            <Kachel titel="Scroll ≥ 75 %" wert={quoteText(f.verkaufsseite.sitzungen ? f.verkaufsseite.scroll75 / f.verkaufsseite.sitzungen : null)} />
          </Grid>
        ) : (
          <Leer>No Data — für den Zeitraum liegen keine Tageswerte vor.</Leer>
        )}
      </Karte>
      <Karte titel="Bekannte Lücken">
        <Stack gap={1}>
          {f.luecken.map((l) => (
            <Text key={l} fontSize="sm" color="var(--cc-text-2)">
              · {l}
            </Text>
          ))}
        </Stack>
      </Karte>
    </Stack>
  );
}

function Vertrieb({ d }: { d: Antwort }) {
  const v = d.vertrieb;
  const fragen = [...new Set(v.leadQualitaet.map((z) => z.frage))];
  return (
    <Stack gap={4}>
      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={3}>
        <Kachel titel="Geführte Calls" wert={String(v.showUp.held)} unter={`No-Show ${v.showUp.noShow} · vorab abgesagt ${v.showUp.abgesagt}`} />
        <Kachel titel="Show-up operational" wert={quoteText(v.showUp.operational.wert)} unter={`scheduled ${quoteText(v.showUp.scheduled.wert)}`} />
        <Kachel titel="Close Rate 30 Tage" wert={quoteText(d.karten.find((k) => k.id === "close")?.wert ?? null)} unter={`60 Tage ${quoteText(v.close60.wert)}`} />
        <Kachel titel="Follow-ups überfällig" wert={String(v.ueberfaellig.length)} />
      </Grid>

      <Karte titel="Closer-Vergleich">
        <Table size="sm" sx={adminTableSx}>
          <Thead>
            <Tr>
              <Th>Closer</Th>
              <Th isNumeric>Gebucht</Th>
              <Th isNumeric>Geführt</Th>
              <Th isNumeric>No-Show</Th>
              <Th isNumeric>Show-up</Th>
              <Th isNumeric>Close 30 T.</Th>
              <Th isNumeric>Orders</Th>
              <Th isNumeric>Verkaufssumme</Th>
              <Th isNumeric>Zahlung netto</Th>
              <Th isNumeric>Provision</Th>
            </Tr>
          </Thead>
          <Tbody>
            {v.closer.map((c) => (
              <Tr key={c.closerId ?? "unassigned"}>
                <Td fontWeight={500}>{c.name}</Td>
                <Td isNumeric className="cc-num">{c.gebucht}</Td>
                <Td isNumeric className="cc-num">{c.held}</Td>
                <Td isNumeric className="cc-num">{c.noShow}</Td>
                <Td isNumeric className="cc-num">{quoteText(c.showUp)}</Td>
                <Td isNumeric className="cc-num">
                  {quoteText(c.closeRate)}
                  <Text as="span" color="var(--cc-text-3)"> ({c.closeZaehler}/{c.closeNenner ?? 0})</Text>
                </Td>
                <Td isNumeric className="cc-num">{c.orders}</Td>
                <Td isNumeric className="cc-num">{euroText(c.verkaufBruttoCents)}</Td>
                <Td isNumeric className="cc-num">{euroText(c.zahlungNettoCents)}</Td>
                <Td isNumeric className="cc-num">{euroText(c.provisionCents)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
          Verkaufssumme = Vertragsvolumen der Orders (brutto) nach Verkaufs-Credit; Zahlung netto = tatsächlicher Eingang abzüglich Erstattungen. Calls nach Closer des Calls.
        </Text>
      </Karte>

      <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={4}>
        <Karte titel="Pipeline (aktuell, Playbook 4.3)">
          <Table size="sm" sx={adminTableSx}>
            <Tbody>
              {v.pipeline.map((p) => (
                <Tr key={p.status}>
                  <Td>{p.label}</Td>
                  <Td isNumeric className="cc-num">{p.anzahl}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Karte>
        <Karte titel="Verlustgründe (Ergebnis-Maske)">
          {v.verlustgruende.length === 0 ? (
            <Leer>No Data</Leer>
          ) : (
            <Table size="sm" sx={adminTableSx}>
              <Tbody>
                {v.verlustgruende.map((g) => (
                  <Tr key={g.grund}>
                    <Td>{g.label}</Td>
                    <Td isNumeric className="cc-num">{g.anzahl}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Karte>
        <Karte titel="Verlustgründe (CRM-Phase „Verloren“)">
          {v.crmVerlustgruende.length === 0 ? (
            <Leer>No Data</Leer>
          ) : (
            <Table size="sm" sx={adminTableSx}>
              <Tbody>
                {v.crmVerlustgruende.map((g) => (
                  <Tr key={g.grund}>
                    <Td>{g.label}</Td>
                    <Td isNumeric className="cc-num">{g.anzahl}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Karte>
      </Grid>

      <Karte titel="Leadqualität nach Antwortkategorie">
        {fragen.length === 0 ? (
          <Leer>No Data — keine Fragebogen-Antworten im Zeitraum.</Leer>
        ) : (
          <Stack gap={5}>
            {fragen.map((frage) => (
              <Box key={frage}>
                <Text fontSize="sm" fontWeight={500} mb={2}>
                  {frage}
                </Text>
                <Table size="sm" sx={adminTableSx}>
                  <Thead>
                    <Tr>
                      <Th>Antwort</Th>
                      <Th isNumeric>Leads</Th>
                      <Th isNumeric>Gebucht</Th>
                      <Th isNumeric>Geführt</Th>
                      <Th isNumeric>Show-up</Th>
                      <Th isNumeric>Kunden</Th>
                      <Th isNumeric>Close (Kunden/geführt)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {v.leadQualitaet
                      .filter((z) => z.frage === frage)
                      .map((z) => (
                        <Tr key={z.antwort}>
                          <Td>{z.antwort}</Td>
                          <Td isNumeric className="cc-num">{z.leads}</Td>
                          <Td isNumeric className="cc-num">{z.gebucht}</Td>
                          <Td isNumeric className="cc-num">{z.held}</Td>
                          <Td isNumeric className="cc-num">{quoteText(z.showUp)}</Td>
                          <Td isNumeric className="cc-num">{z.kunden}</Td>
                          <Td isNumeric className="cc-num">{quoteText(z.close)}</Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
              </Box>
            ))}
            <Text fontSize="xs" color="var(--cc-text-3)">
              Lead-Kohorte: Antworten im Zeitraum. Verteilung je Kategorie, kein Einzelscore.
            </Text>
          </Stack>
        )}
      </Karte>

      <Karte titel={`Überfällige Follow-ups (${v.ueberfaellig.length})`}>
        {v.ueberfaellig.length === 0 ? (
          <Leer>Nichts überfällig.</Leer>
        ) : (
          <Table size="sm" sx={adminTableSx}>
            <Thead>
              <Tr>
                <Th>Kontakt</Th>
                <Th>Closer</Th>
                <Th>Phase</Th>
                <Th>Fällig seit</Th>
              </Tr>
            </Thead>
            <Tbody>
              {v.ueberfaellig.slice(0, 100).map((u) => (
                <Tr key={u.kontaktId}>
                  <Td>
                    <Text as={NextLink} href={`/crm/kontakte/${u.kontaktId}`} _hover={{ color: "var(--cc-gold-light)" }}>
                      {u.name}
                    </Text>
                  </Td>
                  <Td>{u.closer}</Td>
                  <Td>{u.phase}</Td>
                  <Td className="cc-num" color="var(--cc-danger)">
                    {datum(u.faelligAm)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Karte>
    </Stack>
  );
}

function Finanzen({ d, neuLaden }: { d: Antwort; neuLaden: () => Promise<void> }) {
  const fz = d.finanzen;
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());
  const [meldung, setMeldung] = useState<string | null>(null);
  const [nachtrag, setNachtrag] = useState<NachtragErgebnis | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const provAktion = async (aktion: "freigeben" | "ausgezahlt") => {
    const ref = aktion === "ausgezahlt" ? window.prompt("Auszahlungsreferenz (z. B. Abrechnung 2026-11), optional:") : null;
    if (aktion === "ausgezahlt" && ref === null) return;
    const res = await fetch("/api/admin/auswertung/provision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...auswahl], aktion, ref }) });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; geaendert?: number; error?: string };
    setMeldung(json.ok ? `${json.geaendert ?? 0} Eintrag/Einträge ${aktion === "freigeben" ? "freigegeben" : "als ausgezahlt markiert"}.` : `Fehler: ${json.error ?? res.status}`);
    setAuswahl(new Set());
    await neuLaden();
  };

  const starteNachtrag = async () => {
    if (!window.confirm("Nachtrag starten? Liest Käufe, Raten, Erstattungen und Chargebacks aus Stripe und bucht Fehlendes nach. Idempotent, kann mehrere Minuten dauern.")) return;
    setLaeuft(true);
    setMeldung(null);
    try {
      const res = await fetch("/api/admin/auswertung/backfill", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; ergebnis?: NachtragErgebnis; error?: string };
      if (!json.ok) setMeldung(`Fehler: ${json.error}`);
      else setNachtrag(json.ergebnis ?? null);
      await neuLaden();
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Stack gap={4}>
      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", xl: "repeat(5, 1fr)" }} gap={3}>
        <Kachel titel="Vertragsvolumen (brutto)" wert={euroText(fz.vertrag.bruttoCents)} unter={`netto ${euroText(fz.vertrag.nettoCents)} · ${fz.vertrag.anzahl} Orders${fz.vertrag.geschaetzt ? ` · ${fz.vertrag.geschaetzt} geschätzt` : ""}`} />
        <Kachel titel="Zahlungen (brutto)" wert={euroText(fz.eingang.zahlungen.bruttoCents)} unter={`${fz.eingang.zahlungen.anzahl} Zahlungen · USt ${euroText(fz.eingang.zahlungen.steuerCents)}`} />
        <Kachel titel="Netto-Zahlungseingang" wert={euroText(fz.eingang.nettoCents)} unter="nach Erstattungen und verlorenen Chargebacks" />
        <Kachel titel="Erstattungen" wert={euroText(fz.eingang.erstattungen.bruttoCents)} unter={`${fz.eingang.erstattungen.anzahl} · netto ${euroText(fz.eingang.erstattungen.nettoCents)}`} />
        <Kachel titel="Chargebacks" wert={`${fz.chargebacks.offen} offen`} unter={`${euroText(fz.chargebacks.offenCents)} offen · ${fz.chargebacks.verloren} verloren (${euroText(fz.chargebacks.verlorenCents)}) · ${fz.chargebacks.gewonnen} gewonnen`} />
        <Kachel titel="Offene Raten" wert={euroText(fz.offeneRaten.offenCents)} unter={`${fz.offeneRaten.anzahl} Raten · überfällig ${fz.offeneRaten.ueberfaellig} (${euroText(fz.offeneRaten.ueberfaelligCents)})`} />
        <Kachel titel="Stripe-Gebühren" wert={euroText(fz.eingang.gebuehrenCents)} unter={`${fz.eingang.ohneGebuehr} Zahlungen ohne Gebührenangabe · Dispute ${euroText(fz.chargebacks.gebuehrenCents)}`} />
        <Kachel titel="Provision offen" wert={euroText(fz.provision.offenCents + fz.provision.freigegebenCents)} unter={`freigegeben ${euroText(fz.provision.freigegebenCents)} · ausgezahlt ${euroText(fz.provision.ausgezahltCents)}`} />
        <Kachel titel="Live-Abo-MRR (netto)" wert={euroText(fz.liveAbo.mrrCents)} unter={`${fz.liveAbo.aktiv} aktiv · ${fz.liveAbo.probe} Probezeit · ${fz.liveAbo.gekuendigt} gekündigt`} />
        <Kachel titel="Live-Abo Churn" wert={quoteText(fz.liveAbo.logoChurn)} unter={`${fz.liveAbo.beendetImZeitraum} beendet im Zeitraum`} />
      </Grid>
      <Text fontSize="xs" color="var(--cc-text-3)">
        Direkte Kosten, Ausfälle und Deckungsbeitrag sind nicht erfasst (kein beschlossenes Kostenmodell, Prüfpunkt T-08). Payouts sind kein Umsatz und stehen nicht im Ledger.
        {fz.quarantaene ? ` ${fz.quarantaene} Buchung(en) in Quarantäne zählen nicht mit.` : ""}
      </Text>

      <Karte
        titel="Provision je Closer"
        rechts={
          <Button size="sm" variant="line" leftIcon={<RefreshCw size={14} />} isLoading={laeuft} onClick={() => void starteNachtrag()}>
            Nachtrag aus Stripe
          </Button>
        }
      >
        <Table size="sm" sx={adminTableSx}>
          <Thead>
            <Tr>
              <Th>Closer</Th>
              <Th isNumeric>Anspruch (accrued)</Th>
              <Th isNumeric>Freigegeben</Th>
              <Th isNumeric>Ausgezahlt</Th>
            </Tr>
          </Thead>
          <Tbody>
            {fz.provision.jeCloser.map((c) => (
              <Tr key={c.closerId ?? "x"}>
                <Td>{c.name}</Td>
                <Td isNumeric className="cc-num">{euroText(c.offenCents)}</Td>
                <Td isNumeric className="cc-num">{euroText(c.freigegebenCents)}</Td>
                <Td isNumeric className="cc-num">{euroText(c.ausgezahltCents)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
          15 % vom tatsächlich eingegangenen Netto je Zahlung, Rundungsrest in der letzten Rate, Erstattung/verlorener Chargeback als negativer Eintrag. Gesamtsalden, unabhängig vom Zeitraum. Credit-Regel (Closer des geführten Calls) und Provisionsvertrag sind noch freizugeben (T-09, T-06).
        </Text>
        {nachtrag ? (
          <Text fontSize="xs" color="var(--cc-text-2)" mt={2}>
            Nachtrag: {nachtrag.kaeufe} Käufe, {nachtrag.credit} Credits gesetzt, {nachtrag.zahlungenGeprueft} Zahlungen geprüft, {nachtrag.erstattungenGeprueft} Erstattungen, {nachtrag.disputesGeprueft} Chargebacks,{" "}
            {nachtrag.quarantaeneVerknuepft} aus Quarantäne verknüpft{nachtrag.fehler.length ? ` · ${nachtrag.fehler.length} Fehler: ${nachtrag.fehler.slice(0, 3).map((f) => `${f.kauf}: ${f.meldung}`).join(" | ")}` : ""}
          </Text>
        ) : null}
      </Karte>

      <Karte
        titel="Provisionseinträge"
        rechts={
          <HStack>
            <Button size="sm" variant="line" isDisabled={!auswahl.size} onClick={() => void provAktion("freigeben")}>
              Freigeben
            </Button>
            <Button size="sm" variant="gold" isDisabled={!auswahl.size} onClick={() => void provAktion("ausgezahlt")}>
              Als ausgezahlt markieren
            </Button>
          </HStack>
        }
      >
        {meldung ? (
          <Text fontSize="sm" mb={2} color={meldung.startsWith("Fehler") ? "var(--cc-danger)" : "var(--cc-text-2)"}>
            {meldung}
          </Text>
        ) : null}
        {fz.provision.eintraege.length === 0 ? (
          <Leer>Keine Einträge im Zeitraum.</Leer>
        ) : (
          <Table size="sm" sx={adminTableSx}>
            <Thead>
              <Tr>
                <Th w="32px" />
                <Th>Entstanden</Th>
                <Th>Closer</Th>
                <Th>Art</Th>
                <Th>Produkt</Th>
                <Th isNumeric>Basis netto</Th>
                <Th isNumeric>Provision</Th>
                <Th>Status</Th>
                <Th>Periode</Th>
              </Tr>
            </Thead>
            <Tbody>
              {fz.provision.eintraege.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <Checkbox
                      isChecked={auswahl.has(p.id)}
                      isDisabled={p.status === "paid" || p.status === "reversed"}
                      onChange={(e) =>
                        setAuswahl((s) => {
                          const n = new Set(s);
                          if (e.target.checked) n.add(p.id);
                          else n.delete(p.id);
                          return n;
                        })
                      }
                    />
                  </Td>
                  <Td className="cc-num">{datum(p.entstandenAm)}</Td>
                  <Td>{p.closer}</Td>
                  <Td>{p.art === "anspruch" ? "Anspruch" : p.art === "korrektur_erstattung" ? "Korrektur Erstattung" : "Korrektur Chargeback"}</Td>
                  <Td>{p.produkt ?? "—"}</Td>
                  <Td isNumeric className="cc-num">{euroText(p.basisNettoCents)}</Td>
                  <Td isNumeric className="cc-num" color={p.betragCents < 0 ? "var(--cc-danger)" : undefined}>
                    {euroText(p.betragCents)}
                  </Td>
                  <Td>
                    <StatusPill tone={p.status === "paid" ? "success" : p.status === "approved" ? "attention" : "neutral"}>{p.status}</StatusPill>
                  </Td>
                  <Td className="cc-num">{p.periode}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Karte>
    </Stack>
  );
}
