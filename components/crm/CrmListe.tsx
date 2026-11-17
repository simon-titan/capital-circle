"use client";

import { Box, Button, Checkbox, Flex, HStack, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { ArrowDown, ArrowUp, MessageCircle, Phone, Users, X } from "lucide-react";
import NextLink from "next/link";
import { useMemo, useState } from "react";
import { QUELLEN, type Quelle } from "@/config/crm";
import { fehlerText, naechsteAktivitaet, relativ } from "@/lib/crm/anzeige";
import { SeitenKopf } from "./CrmRahmen";
import { CloserDialog } from "./Dialoge";
import {
  AktivitaetHinweis,
  AktualisierenKnopf,
  FILTER_STANDARD,
  FilterLeiste,
  Hinweis,
  PhasePill,
  closerName,
  datum,
  filtere,
  useFilter,
  useGefiltert,
  useJetzt,
  useKontakte,
  whatsappLink,
  type Filter,
  type KontaktZeile,
} from "./gemeinsam";
import { AuswahlMenu, Avatar, IconKnopf, Laden, LeerZustand, useCrm, useMeldung } from "./ui";

type Sortierung = "naechster" | "neu" | "aktivitaet" | "name";
const SORT_LABEL: Record<Sortierung, string> = {
  naechster: "Nächster Schritt",
  neu: "Neueste",
  aktivitaet: "Letzte Aktivität",
  name: "Name",
};
const SEITE = 200;

/** Gespeicherte Ansichten wie in HubSpot: ein Klick setzt die passenden Filter. */
type Ansicht = { id: string; label: string; filter: Partial<Filter> };
function ansichten(ichId: string | null): Ansicht[] {
  return [
    { id: "offen", label: "Offen", filter: { phase: "offen", closer: "alle", nurFaellig: false } },
    ...(ichId ? [{ id: "meine", label: "Meine", filter: { phase: "offen", closer: "meine", nurFaellig: false } } as Ansicht] : []),
    { id: "pool", label: "Pool", filter: { phase: "offen", closer: "pool", nurFaellig: false } },
    { id: "faellig", label: "Fällig", filter: { phase: "offen", closer: "alle", nurFaellig: true } },
    { id: "gewonnen", label: "Gewonnen", filter: { phase: "gewonnen", closer: "alle", nurFaellig: false } },
    { id: "alle", label: "Alle", filter: { phase: "alle", closer: "alle", nurFaellig: false } },
  ];
}

/**
 * Alle Kontakte als Liste nach dem Vorbild HubSpot: Ansichten als Reiter mit
 * Anzahl, Filterleiste, sortierbare Tabelle mit festem Kopf, nächstem Schritt
 * und Schnellaktionen in der Zeile, Mehrfachauswahl zum Umverteilen. Auf dem
 * Handy als Karten.
 */
export function CrmListe() {
  const { ichId, pfad } = useCrm();
  const { daten, fehler, laedt, abgleichen, setDaten } = useKontakte();
  const { filter, setze } = useFilter("liste");
  const gefiltert = useGefiltert(daten?.kontakte, filter, ichId);
  const team = daten?.team ?? [];
  const jetzt = useJetzt();
  const meldung = useMeldung();
  const [sort, setSort] = useState<{ nach: Sortierung; auf: boolean }>({ nach: "naechster", auf: true });
  const [wechsel, setWechsel] = useState<KontaktZeile[] | null>(null);
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());
  const [anzahl, setAnzahl] = useState(SEITE);

  const reiter = ansichten(ichId);
  const zaehler = useMemo(() => {
    const alle = daten?.kontakte ?? [];
    return Object.fromEntries(reiter.map((a) => [a.id, filtere(alle, { ...filter, ...a.filter, suche: filter.suche }, ichId, jetzt).length]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reiter hängt nur an ichId
  }, [daten, filter, ichId, jetzt]);
  const aktiveAnsicht = reiter.find((a) => Object.entries(a.filter).every(([k, v]) => filter[k as keyof Filter] === v))?.id;

  const sortiert = useMemo(() => {
    const zeit = (v: string | null) => (v ? new Date(v).getTime() : null);
    const naechst = (k: KontaktZeile) => {
      const n = naechsteAktivitaet(k, jetzt);
      return n.art === "keine" ? null : new Date(n.iso).getTime();
    };
    const leerHinten = (a: number | null, b: number | null) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : a - b);
    const r = sort.auf ? 1 : -1;
    return [...gefiltert].sort((a, b) => {
      switch (sort.nach) {
        case "name":
          return (a.name ?? a.email).localeCompare(b.name ?? b.email, "de") * r;
        case "naechster":
          return leerHinten(naechst(a), naechst(b)) * r;
        case "aktivitaet":
          return ((zeit(a.letzte_aktivitaet_am) ?? 0) - (zeit(b.letzte_aktivitaet_am) ?? 0)) * r;
        default:
          return a.created_at.localeCompare(b.created_at) * r;
      }
    });
  }, [gefiltert, sort, jetzt]);
  const sichtbar = sortiert.slice(0, anzahl);

  const sortiere = (nach: Sortierung) => setSort((s) => (s.nach === nach ? { nach, auf: !s.auf } : { nach, auf: nach === "naechster" || nach === "name" }));

  const zuweisen = async (liste: KontaktZeile[], closerId: string | null, grund: string) => {
    const alt = new Map(liste.map((k) => [k.id, k.closer_id]));
    const ids = new Set(liste.map((k) => k.id));
    setDaten((d) => (d ? { ...d, kontakte: d.kontakte.map((x) => (ids.has(x.id) ? { ...x, closer_id: closerId } : x)) } : d));
    let fehlgeschlagen = 0;
    let letzterFehler: string | undefined;
    for (const k of liste) {
      const res = await fetch(`/api/crm/kontakte/${k.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closer_id: closerId, zuweisung_grund: grund }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!json.ok) {
        fehlgeschlagen++;
        letzterFehler = json.error;
        setDaten((d) => (d ? { ...d, kontakte: d.kontakte.map((x) => (x.id === k.id ? { ...x, closer_id: alt.get(k.id) ?? null } : x)) } : d));
      }
    }
    if (fehlgeschlagen) meldung.fehler(`${fehlgeschlagen} von ${liste.length} nicht umverteilt: ${fehlerText(letzterFehler)}`);
    else meldung.ok(liste.length === 1 ? `${liste[0]!.name ?? liste[0]!.email} ist jetzt bei ${closerName(team, closerId)}.` : `${liste.length} Kontakte sind jetzt bei ${closerName(team, closerId)}.`);
    setWechsel(null);
    setAuswahl(new Set());
  };

  const umschalten = (id: string) =>
    setAuswahl((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const alleGewaehlt = sichtbar.length > 0 && sichtbar.every((k) => auswahl.has(k.id));

  const kopf = (nach: Sortierung | null, children: React.ReactNode, props: Record<string, unknown> = {}) => (
    <Th {...props}>
      {nach ? (
        <Box as="button" type="button" onClick={() => sortiere(nach)} display="inline-flex" alignItems="center" gap={1} textTransform="inherit" letterSpacing="inherit" fontSize="inherit" fontWeight="inherit" _hover={{ color: "var(--cc-text)" }} color={sort.nach === nach ? "var(--cc-gold-light)" : undefined}>
          {children}
          {sort.nach === nach ? sort.auf ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : null}
        </Box>
      ) : (
        children
      )}
    </Th>
  );

  return (
    <Stack gap={4}>
      <SeitenKopf
        titel="Kontakte"
        unter={daten ? `${gefiltert.length} von ${daten.kontakte.length} Kontakten in dieser Ansicht` : "Lädt …"}
        rechts={<AktualisierenKnopf laedt={laedt} onClick={() => void abgleichen()} />}
      />

      {/* Ansichten */}
      <Flex gap={1} borderBottom="1px solid var(--cc-line)" overflowX="auto" className="hide-scrollbar" mt={-1}>
        {reiter.map((a) => {
          const an = aktiveAnsicht === a.id;
          return (
            <Box
              key={a.id}
              as="button"
              type="button"
              onClick={() => {
                setze(a.filter);
                setAnzahl(SEITE);
                setAuswahl(new Set());
              }}
              aria-pressed={an}
              display="inline-flex"
              alignItems="center"
              gap={2}
              px={3}
              h="40px"
              flexShrink={0}
              fontSize="14px"
              fontWeight={an ? 500 : 400}
              color={an ? "var(--cc-text)" : "var(--cc-text-2)"}
              borderBottom="2px solid"
              borderColor={an ? "var(--cc-gold)" : "transparent"}
              mb="-1px"
              _hover={{ color: "var(--cc-text)" }}
            >
              {a.label}
              <Text as="span" className="cc-num" fontSize="12px" color={an ? "var(--cc-gold-light)" : "var(--cc-text-3)"}>
                {daten ? zaehler[a.id] : ""}
              </Text>
            </Box>
          );
        })}
      </Flex>

      <FilterLeiste
        filter={filter}
        setze={(f) => {
          setze(f);
          setAnzahl(SEITE);
        }}
        team={team}
        rechts={
          <Box display={{ base: "block", md: "none" }}>
            <AuswahlMenu
              label="Sortieren"
              wert={sort.nach}
              optionen={(Object.keys(SORT_LABEL) as Sortierung[]).map((s) => ({ wert: s, label: SORT_LABEL[s] }))}
              onWahl={(w) => setSort({ nach: w as Sortierung, auf: w === "naechster" || w === "name" })}
            />
          </Box>
        }
      />
      {fehler ? <Hinweis meldung={{ art: "fehler", text: fehler }} /> : null}
      {daten?.migrationFehlt ? <Hinweis meldung={{ art: "fehler", text: "Migration 112 (CRM) ist in der Datenbank noch nicht eingespielt." }} /> : null}

      <Box className="cc-card cc-card--still" p={0} overflow="hidden">
        {!daten ? (
          <Box p={4}>
            <Laden zeilen={6} />
          </Box>
        ) : gefiltert.length === 0 ? (
          <Box p={4}>
            <LeerZustand
              icon={Users}
              titel="Keine Kontakte in dieser Ansicht."
              text="Filter lockern oder oben rechts einen Kontakt anlegen."
              aktion={
                <Button size="sm" variant="line" onClick={() => setze(FILTER_STANDARD)}>
                  Filter zurücksetzen
                </Button>
              }
            />
          </Box>
        ) : (
          <>
            <Box display={{ base: "none", md: "block" }} overflow="auto" maxH="calc(100vh - 330px)" minH="320px">
              <Table
                size="sm"
                sx={{
                  fontVariantNumeric: "tabular-nums",
                  "th, td": { px: 3 },
                  th: {
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    bg: "#1a1f25",
                    color: "var(--cc-text-2)",
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid var(--cc-line-strong)",
                    py: 3,
                  },
                  td: { borderBottom: "1px solid var(--cc-line)", fontSize: "13px", color: "var(--cc-text-soft)", py: 2.5 },
                  "tbody tr": { transition: "background-color 120ms ease" },
                  "tbody tr:hover": { bg: "rgba(255,255,255,0.03)" },
                  "tbody tr:hover .crm-zeilen-aktionen": { opacity: 1 },
                  "tbody tr[data-gewaehlt='1']": { bg: "rgba(212,176,128,0.05)" },
                }}
              >
                <Thead>
                  <Tr>
                    <Th w="40px" pl={4}>
                      <Checkbox
                        isChecked={alleGewaehlt}
                        isIndeterminate={!alleGewaehlt && sichtbar.some((k) => auswahl.has(k.id))}
                        onChange={() => setAuswahl(alleGewaehlt ? new Set() : new Set(sichtbar.map((k) => k.id)))}
                        aria-label="Alle auswählen"
                      />
                    </Th>
                    {kopf("name", "Kontakt")}
                    {kopf(null, "Phase")}
                    {kopf(null, "Closer")}
                    {kopf("naechster", "Nächster Schritt")}
                    {kopf("aktivitaet", "Zuletzt")}
                    {kopf(null, "Quelle")}
                    {kopf("neu", "Angelegt")}
                    <Th w="88px" />
                  </Tr>
                </Thead>
                <Tbody>
                  {sichtbar.map((k) => {
                    const wa = whatsappLink(k.telefon);
                    return (
                      <Tr key={k.id} data-gewaehlt={auswahl.has(k.id) ? "1" : "0"}>
                        <Td pl={4}>
                          <Checkbox isChecked={auswahl.has(k.id)} onChange={() => umschalten(k.id)} aria-label={`${k.name ?? k.email} auswählen`} />
                        </Td>
                        <Td maxW="300px">
                          <Flex align="center" gap={2.5}>
                            <Avatar name={k.name ?? k.email} groesse={30} />
                            <Box minW={0}>
                              <Text as={NextLink} href={pfad(`/kontakte/${k.id}`)} fontSize="14px" fontWeight={500} color="var(--cc-text)" _hover={{ color: "var(--cc-gold-light)" }} noOfLines={1}>
                                {k.name ?? k.email}
                              </Text>
                              <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
                                {k.name ? k.email : ""}
                                {k.telefon ? `${k.name ? " · " : ""}${k.telefon}` : ""}
                              </Text>
                            </Box>
                          </Flex>
                        </Td>
                        <Td>
                          <PhasePill phase={k.phase} />
                        </Td>
                        <Td>
                          <Box
                            as="button"
                            type="button"
                            onClick={() => setWechsel([k])}
                            display="inline-flex"
                            alignItems="center"
                            gap={2}
                            px={1.5}
                            py={1}
                            mx={-1.5}
                            borderRadius="6px"
                            _hover={{ bg: "rgba(255,255,255,0.05)", color: "var(--cc-text)" }}
                            title="Closer wechseln"
                          >
                            <Avatar name={k.closer_id ? closerName(team, k.closer_id) : null} groesse={22} />
                            <Text as="span" fontSize="13px" color={k.closer_id ? "var(--cc-text-soft)" : "var(--cc-text-3)"}>
                              {closerName(team, k.closer_id)}
                            </Text>
                          </Box>
                        </Td>
                        <Td>
                          <AktivitaetHinweis n={naechsteAktivitaet(k, jetzt)} jetzt={jetzt} />
                        </Td>
                        <Td whiteSpace="nowrap" color="var(--cc-text-2)" fontSize="13px">
                          {relativ(k.letzte_aktivitaet_am, jetzt)}
                        </Td>
                        <Td maxW="170px">
                          <Text noOfLines={1} fontSize="12px" color="var(--cc-text-2)">
                            {QUELLEN[k.quelle as Quelle] ?? k.quelle}
                          </Text>
                        </Td>
                        <Td whiteSpace="nowrap" color="var(--cc-text-2)" fontSize="13px" className="cc-num" title={datum(k.created_at)}>
                          {datum(k.created_at, false)}
                        </Td>
                        <Td>
                          <HStack gap={1} className="crm-zeilen-aktionen" opacity={0} transition="opacity 120ms ease" justify="flex-end">
                            {k.telefon ? <IconKnopf icon={Phone} label={`${k.telefon} anrufen`} href={`tel:${k.telefon.replace(/[^\d+]/g, "")}`} groesse="xs" /> : null}
                            {wa ? <IconKnopf icon={MessageCircle} label="WhatsApp" href={wa} extern groesse="xs" /> : null}
                          </HStack>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>

            <Stack display={{ base: "flex", md: "none" }} gap={0}>
              {sichtbar.map((k) => (
                <Flex key={k.id} as={NextLink} href={pfad(`/kontakte/${k.id}`)} gap={3} px={4} py={3} borderTop="1px solid var(--cc-line)" align="center" _first={{ borderTop: "none" }}>
                  <Avatar name={k.name ?? k.email} groesse={36} />
                  <Box flex="1" minW={0}>
                    <Flex align="center" gap={2}>
                      <Text fontSize="14px" fontWeight={500} noOfLines={1} flex="1">
                        {k.name ?? k.email}
                      </Text>
                      <PhasePill phase={k.phase} />
                    </Flex>
                    <Flex align="center" gap={2} mt={0.5}>
                      <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1} flex="1">
                        {closerName(team, k.closer_id)}
                      </Text>
                      <AktivitaetHinweis n={naechsteAktivitaet(k, jetzt)} jetzt={jetzt} />
                    </Flex>
                  </Box>
                </Flex>
              ))}
            </Stack>

            {sortiert.length > anzahl ? (
              <Flex justify="center" py={3} borderTop="1px solid var(--cc-line)">
                <Button size="sm" variant="line" onClick={() => setAnzahl((a) => a + SEITE)}>
                  {Math.min(SEITE, sortiert.length - anzahl)} weitere anzeigen
                </Button>
              </Flex>
            ) : null}
          </>
        )}
      </Box>

      {auswahl.size ? (
        <Flex
          className="crm-ablage"
          position="fixed"
          bottom={{ base: "76px", lg: 6 }}
          left="50%"
          transform="translateX(-50%)"
          zIndex={30}
          align="center"
          gap={3}
          pl={4}
          pr={2}
          h="52px"
          borderRadius="12px"
          bg="var(--cc-panel-solid)"
          border="1px solid rgba(212,176,128,0.3)"
          boxShadow="0 18px 48px rgba(0,0,0,0.55)"
        >
          <Text fontSize="14px" whiteSpace="nowrap">
            <Text as="span" className="cc-num" fontWeight={600} color="var(--cc-gold-light)">
              {auswahl.size}
            </Text>{" "}
            ausgewählt
          </Text>
          <Button size="sm" variant="gold" onClick={() => setWechsel((daten?.kontakte ?? []).filter((k) => auswahl.has(k.id)))}>
            Closer zuweisen
          </Button>
          <IconKnopf icon={X} label="Auswahl aufheben" onClick={() => setAuswahl(new Set())} />
        </Flex>
      ) : null}

      <CloserDialog
        key={wechsel?.map((k) => k.id).join(",") ?? "zu"}
        offen={Boolean(wechsel)}
        team={team}
        aktuell={wechsel?.length === 1 ? wechsel[0]!.closer_id : undefined}
        anzahl={wechsel?.length ?? 1}
        onAbbrechen={() => setWechsel(null)}
        onBestaetigen={async (closerId, grund) => {
          if (wechsel) await zuweisen(wechsel, closerId, grund);
        }}
      />
    </Stack>
  );
}
