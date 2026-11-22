"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { ChevronDown, ChevronUp, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  AdminCount,
  StatusPill,
  adminCardPadding,
  adminChipProps,
  adminEmptyProps,
  adminInputProps,
  adminOptionStyle,
  adminTableSx,
  type AdminTone,
} from "@/components/admin/adminUi";
import { ALLE_FRAGEN } from "@/config/discord-funnel-questions";
import {
  bewerbung as bewerbungTexte,
  KANAELE,
  LEAD_STATUS,
  TRAINING_VIDEO_ANZAHL,
  kanalLabel,
  leadStatusLabel,
  stelleLabel,
  type GespraechStelle,
  type Kanal,
  type LeadStatus,
} from "@/config/training";
import type { BoardBewerbung, BoardTermin, BoardVersand, TrainingLeadZeile, TrainingRegistrierung } from "@/lib/training/board";
import { TermineTabelle, VersandTabelle, ZugangAktionen } from "@/components/admin/AdminTrainingBewerbungen";
import { TrainingBewerbungen } from "@/components/admin/TrainingBewerbungen";

/**
 * CRM-Board des Free Trainings (`/admin/training`) — getrennt vom
 * Discord-/Call-Funnel-Board: Registrierungen mit Videostand und die
 * Analysegespräch-Anfragen samt Herkunftsstelle und Pipeline.
 */

const TON: Record<LeadStatus, AdminTone> = {
  neu: "attention",
  termin: "neutral",
  no_show: "danger",
  nachfassen: "attention",
  gewonnen: "success",
  verloren: "neutral",
};

function datum(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function euro(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

type Ansicht = "bewerbungen" | "leads" | "termine" | "registrierungen" | "versand" | "uebersicht";

type Props = {
  registrierungen: TrainingRegistrierung[];
  leads: TrainingLeadZeile[];
  videoAnzahl: number;
  bewerbungen: BoardBewerbung[];
  versand: BoardVersand[];
  termine: BoardTermin[];
  startAnsicht?: Ansicht;
};

export function AdminTrainingBoard({
  registrierungen,
  leads: initialLeads,
  videoAnzahl,
  bewerbungen: initialBewerbungen,
  versand,
  termine,
  startAnsicht,
}: Props) {
  const [bewerbungen, setBewerbungen] = useState(initialBewerbungen);
  const zuPruefen = bewerbungen.filter((b) => b.status === "offen").length;
  const [ansicht, setAnsicht] = useState<Ansicht>(startAnsicht ?? (zuPruefen > 0 ? "bewerbungen" : "uebersicht"));
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<LeadStatus | "alle">("alle");
  const [suche, setSuche] = useState("");
  const [kanal, setKanal] = useState<Kanal | "alle">("alle");

  /*
    Herkunft je Kanal (Board, Spalte 1): wie viele kamen, wie viele haben alle
    Videos gesehen, wie viele angefragt, wie viele gekauft. So steht nebeneinander,
    welcher Kanal Leute bringt und welcher Kunden.
  */
  const proKanal = useMemo(
    () =>
      KANAELE.map((k) => {
        const regs = registrierungen.filter((r) => r.kanal === k);
        const ls = leads.filter((l) => (l.kanal ?? "direkt") === k);
        return {
          kanal: k,
          registriert: regs.length,
          alleVideos: regs.filter((r) => r.gesehen >= TRAINING_VIDEO_ANZAHL).length,
          anfragen: ls.length,
          // Zahlend gewordene Registrierungen — ob über das Gespräch oder per Selbstkauf.
          gekauft: regs.filter((r) => r.isPaid).length,
        };
      }).filter((z) => z.registriert > 0 || z.anfragen > 0),
    [registrierungen, leads],
  );

  const kpi = useMemo(() => {
    const regs = registrierungen.length;
    const bestaetigt = registrierungen.filter((r) => r.bestaetigt).length;
    const proVideo = Array.from({ length: TRAINING_VIDEO_ANZAHL }, (_, i) => i + 1).map((n) => registrierungen.filter((r) => r.gesehen >= n).length);
    const termine = leads.filter((l) => l.termin_am).length;
    const gewonnen = leads.filter((l) => l.status === "gewonnen");
    const umsatz = gewonnen.reduce((s, l) => s + (l.revenue_cents ?? 0), 0);
    const zahlend = registrierungen.filter((r) => r.isPaid).length;
    return { regs, bestaetigt, proVideo, anfragen: leads.length, termine, gewonnen: gewonnen.length, umsatz, zahlend };
  }, [registrierungen, leads]);

  const sichtbareLeads = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return leads.filter(
      (l) =>
        (filter === "alle" || l.status === filter) &&
        (kanal === "alle" || (l.kanal ?? "direkt") === kanal) &&
        (!q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.phone ?? "").includes(q)),
    );
  }, [leads, filter, suche, kanal]);

  const sichtbareRegs = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return registrierungen.filter(
      (r) => (kanal === "alle" || r.kanal === kanal) && (!q || r.name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q)),
    );
  }, [registrierungen, suche, kanal]);

  const reiter: { id: Ansicht; label: string; zahl: number | null }[] = [
    { id: "bewerbungen", label: "Bewerbungen", zahl: zuPruefen },
    { id: "leads", label: "Analysegespräche", zahl: leads.length },
    { id: "termine", label: "Termine", zahl: termine.filter((t) => t.status === "gebucht").length },
    { id: "registrierungen", label: "Registrierungen", zahl: registrierungen.length },
    { id: "versand", label: "Versandprotokoll", zahl: null },
    { id: "uebersicht", label: "Übersicht & Herkunft", zahl: null },
  ];

  return (
    <Stack gap={6}>
      <Flex gap={1} borderBottom="1px solid var(--cc-line)" overflowX="auto" className="hide-scrollbar">
        {reiter.map((r) => {
          const aktiv = ansicht === r.id;
          return (
            <Box
              key={r.id}
              as="button"
              type="button"
              onClick={() => setAnsicht(r.id)}
              aria-pressed={aktiv}
              display="inline-flex"
              alignItems="center"
              px={3}
              h="44px"
              flexShrink={0}
              fontSize="14px"
              fontWeight={aktiv ? 500 : 400}
              color={aktiv ? "var(--cc-text)" : "var(--cc-text-2)"}
              borderBottom="2px solid"
              borderColor={aktiv ? "var(--cc-gold)" : "transparent"}
              mb="-1px"
              _hover={{ color: "var(--cc-text)" }}
            >
              {r.label}
              {r.zahl !== null ? <AdminCount active={aktiv || (r.id === "bewerbungen" && r.zahl > 0)}>{r.zahl}</AdminCount> : null}
            </Box>
          );
        })}
      </Flex>

      {ansicht === "bewerbungen" ? (
        <TrainingBewerbungen
          bewerbungen={bewerbungen}
          fragen={bewerbungTexte.fragen}
          onAenderung={(neu) => setBewerbungen((alt) => alt.map((x) => (x.id === neu.id ? neu : x)))}
        />
      ) : ansicht === "uebersicht" ? (
        <Stack gap={5}>
          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)", xl: `repeat(${5 + TRAINING_VIDEO_ANZAHL}, 1fr)` }} gap={3}>
            {[
              { label: "Registriert", wert: kpi.regs },
              { label: "Bestätigt", wert: kpi.bestaetigt },
              ...kpi.proVideo.map((wert, i) => ({ label: `Video ${i + 1}`, wert })),
              { label: "Anfragen", wert: kpi.anfragen },
              { label: "Termine", wert: kpi.termine },
              { label: "Gewonnen", wert: kpi.gewonnen, zusatz: kpi.umsatz ? euro(kpi.umsatz) : undefined },
            ].map((k) => (
              <Box key={k.label} className={ADMIN_CARD_CLASS} p={4}>
                <Text fontSize="xs" color="var(--cc-text-2)">
                  {k.label}
                </Text>
                <Text className="cc-num" fontSize="24px" fontWeight={600} color="var(--cc-text)">
                  {k.wert}
                </Text>
                {k.zusatz ? (
                  <Text className="cc-num" fontSize="xs" color="var(--cc-gold-light)">
                    {k.zusatz}
                  </Text>
                ) : null}
              </Box>
            ))}
          </Grid>
          {videoAnzahl === 0 ? (
            <Text fontSize="xs" color="var(--cc-gold-light)">
              Noch keine Trainingsvideos hochgeladen (Kurse & Module → „Kostenloses Training“). Bis dahin zählen die
              Videospalten 0.
            </Text>
          ) : null}

          <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} overflowX="auto">
            <AdminCardTitle mb={3}>Herkunft</AdminCardTitle>
            {proKanal.length === 0 ? (
              <Text fontSize="sm" color="var(--cc-text-2)">
                Noch keine Registrierungen. Links in Bio und Videobeschreibung mit ?utm_source=youtube, instagram, tiktok
                oder podcast versehen — sonst entscheidet nur der Referrer.
              </Text>
            ) : (
              <Table size="sm" sx={adminTableSx}>
                <Thead>
                  <Tr>
                    <Th>Kanal</Th>
                    <Th isNumeric>Registriert</Th>
                    <Th isNumeric>Alle {TRAINING_VIDEO_ANZAHL} Videos</Th>
                    <Th isNumeric>Anfragen</Th>
                    <Th isNumeric>Gekauft</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {proKanal.map((z) => (
                    <Tr key={z.kanal}>
                      <Td>{kanalLabel[z.kanal]}</Td>
                      <Td isNumeric className="cc-num">{z.registriert}</Td>
                      <Td isNumeric className="cc-num">{z.alleVideos}</Td>
                      <Td isNumeric className="cc-num">{z.anfragen}</Td>
                      <Td isNumeric className="cc-num">{z.gekauft}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>
        </Stack>
      ) : (
        <Stack gap={4}>
          <Flex gap={3} wrap="wrap" align="center">
            <InputGroup maxW="320px">
              <InputLeftElement pointerEvents="none" color="var(--cc-text-3)">
                <Search size={16} />
              </InputLeftElement>
              <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Name, E-Mail, Telefon…" {...adminInputProps} />
            </InputGroup>
            {ansicht === "leads" || ansicht === "registrierungen" ? (
              <HStack gap={2} wrap="wrap">
                {(["alle", ...KANAELE] as const).map((k) => (
                  <Button key={k} {...adminChipProps(kanal === k)} onClick={() => setKanal(k)}>
                    {k === "alle" ? "Alle Kanäle" : kanalLabel[k]}
                  </Button>
                ))}
              </HStack>
            ) : null}
          </Flex>
          {ansicht === "termine" ? (
            <TermineTabelle termine={termine} suche={suche} />
          ) : ansicht === "versand" ? (
            <VersandTabelle zeilen={versand} suche={suche} />
          ) : ansicht === "leads" ? (
            <>
              <HStack gap={2} wrap="wrap">
                {(["alle", ...LEAD_STATUS] as const).map((s) => (
                  <Button key={s} {...adminChipProps(filter === s)} onClick={() => setFilter(s)}>
                    {s === "alle" ? "Alle" : leadStatusLabel[s]}
                    <AdminCount active={filter === s}>{s === "alle" ? leads.length : leads.filter((l) => l.status === s).length}</AdminCount>
                  </Button>
                ))}
              </HStack>
              {sichtbareLeads.length === 0 ? (
                <Box {...adminEmptyProps}>Keine Anfragen in dieser Ansicht.</Box>
              ) : (
                <Stack gap={3}>
                  {sichtbareLeads.map((l) => (
                    <LeadKarte key={l.id} lead={l} onGespeichert={(neu) => setLeads((alt) => alt.map((x) => (x.id === neu.id ? neu : x)))} />
                  ))}
                </Stack>
              )}
            </>
          ) : (
            <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} overflowX="auto">
              <Table size="sm" sx={adminTableSx}>
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>E-Mail</Th>
                    <Th>Kanal</Th>
                    <Th>Registriert</Th>
                    <Th>Bestätigt</Th>
                    <Th>Videos</Th>
                    <Th>Zugang</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sichtbareRegs.map((r) => (
                    <Tr key={r.id}>
                      <Td>{r.name}</Td>
                      <Td>{r.email ?? "—"}</Td>
                      <Td>
                        {kanalLabel[r.kanal as Kanal] ?? r.kanal}
                        {r.utmCampaign ? (
                          <Text as="span" fontSize="xs" color="var(--cc-text-3)">
                            {" "}
                            · {r.utmCampaign}
                          </Text>
                        ) : null}
                      </Td>
                      <Td className="cc-num">{datum(r.registriertAm)}</Td>
                      <Td>{r.bestaetigt ? "Ja" : <Text as="span" color="var(--cc-text-3)">Offen</Text>}</Td>
                      <Td className="cc-num">
                        {r.gesehen}/{Math.max(TRAINING_VIDEO_ANZAHL, videoAnzahl)}
                      </Td>
                      <Td>
                        <ZugangAktionen userId={r.id} zugang={r.zugang} pause={r.pause} />
                      </Td>
                      <Td>
                        {r.isPaid ? <StatusPill tone="success">Zahlend · {r.tier}</StatusPill> : <StatusPill tone="neutral">Free</StatusPill>}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Stack>
      )}
    </Stack>
  );
}

function LeadKarte({ lead, onGespeichert }: { lead: TrainingLeadZeile; onGespeichert: (l: TrainingLeadZeile) => void }) {
  const [offen, setOffen] = useState(false);
  const [status, setStatus] = useState(lead.status);
  const [closer, setCloser] = useState(lead.closer ?? "");
  const [produkt, setProdukt] = useState(lead.produkt ?? "");
  const [umsatz, setUmsatz] = useState(lead.revenue_cents != null ? String(lead.revenue_cents / 100) : "");
  const [notizen, setNotizen] = useState(lead.notizen ?? "");
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const speichern = async () => {
    setSpeichert(true);
    setFehler(null);
    try {
      const euroWert = umsatz.trim() ? Number(umsatz.replace(",", ".")) : null;
      const res = await fetch(`/api/admin/training/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          closer,
          produkt,
          notizen,
          revenue_cents: euroWert != null && Number.isFinite(euroWert) ? Math.round(euroWert * 100) : null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; lead?: TrainingLeadZeile; error?: string };
      if (!res.ok || !json.ok || !json.lead) {
        setFehler(json.error ?? `Fehler ${res.status}`);
        return;
      }
      onGespeichert(json.lead);
    } finally {
      setSpeichert(false);
    }
  };

  const s = lead.status as LeadStatus;
  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <Flex gap={4} align="center" wrap="wrap" cursor="pointer" onClick={() => setOffen((o) => !o)}>
        <Box flex="1" minW="200px">
          <Text fontWeight={600} color="var(--cc-text)">
            {lead.name}
          </Text>
          <Text fontSize="xs" color="var(--cc-text-2)">
            {lead.email} · {lead.phone ?? "—"}
          </Text>
        </Box>
        <Stack gap={0.5} minW="140px">
          <Text fontSize="xs" color="var(--cc-text-3)">
            Herkunft
          </Text>
          <Text fontSize="sm" color="var(--cc-text)">
            {kanalLabel[(lead.kanal ?? "direkt") as Kanal] ?? lead.kanal} → {stelleLabel[lead.stelle as GespraechStelle] ?? lead.stelle}
            {" · "}
            {lead.videos_gesehen}/{TRAINING_VIDEO_ANZAHL} Videos
          </Text>
        </Stack>
        <Stack gap={0.5} minW="130px">
          <Text fontSize="xs" color="var(--cc-text-3)">
            Termin
          </Text>
          <Text className="cc-num" fontSize="sm" color="var(--cc-text)">
            {datum(lead.termin_am)}
          </Text>
        </Stack>
        <StatusPill tone={TON[s] ?? "neutral"}>{leadStatusLabel[s] ?? lead.status}</StatusPill>
        <Box color="var(--cc-text-2)">{offen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Box>
      </Flex>

      {offen ? (
        <Stack gap={4} mt={5} pt={5} borderTop="1px solid var(--cc-line)">
          <Text fontSize="xs" color="var(--cc-text-3)">
            Angefragt {datum(lead.created_at)}
          </Text>
          {Object.keys(lead.answers ?? {}).length ? (
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3}>
              {ALLE_FRAGEN.map((q) =>
                lead.answers?.[q.id] ? (
                  <Box key={q.id}>
                    <Text fontSize="xs" color="var(--cc-text-3)">
                      {q.question}
                    </Text>
                    <Text fontSize="sm" color="var(--cc-text)">
                      {lead.answers[q.id]}
                    </Text>
                  </Box>
                ) : null,
              )}
            </Grid>
          ) : (
            <Text fontSize="sm" color="var(--cc-text-3)">
              Fragebogen noch nicht ausgefüllt.
            </Text>
          )}

          <AdminCardTitle>Pipeline</AdminCardTitle>
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3}>
            <Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)} {...adminInputProps}>
              {LEAD_STATUS.map((x) => (
                <option key={x} value={x} style={adminOptionStyle}>
                  {leadStatusLabel[x]}
                </option>
              ))}
            </Select>
            <Input size="sm" placeholder="Closer" value={closer} onChange={(e) => setCloser(e.target.value)} {...adminInputProps} />
            <Input size="sm" placeholder="Produkt" value={produkt} onChange={(e) => setProdukt(e.target.value)} {...adminInputProps} />
            <Input
              size="sm"
              placeholder="Umsatz in €"
              inputMode="decimal"
              value={umsatz}
              onChange={(e) => setUmsatz(e.target.value)}
              {...adminInputProps}
            />
          </Grid>
          <Textarea size="sm" rows={3} placeholder="Notizen" value={notizen} onChange={(e) => setNotizen(e.target.value)} {...adminInputProps} />
          <Flex justify="flex-end" gap={3} align="center">
            {fehler ? (
              <Text fontSize="xs" color="var(--cc-danger)">
                {fehler}
              </Text>
            ) : null}
            <Button size="sm" variant="gold" leftIcon={<Save size={14} />} isLoading={speichert} onClick={() => void speichern()}>
              Speichern
            </Button>
          </Flex>
        </Stack>
      ) : null}
    </Box>
  );
}
