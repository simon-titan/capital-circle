"use client";

import { Box, Button, Flex, Grid, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { ChevronDown, ChevronUp, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminLabel,
  adminCardPadding,
  adminChipProps,
  adminEmptyProps,
  adminInputProps,
} from "@/components/admin/adminUi";
import { Balken, Karte, prozent } from "@/components/admin/IcpAuswertung";

type Person = {
  id: string;
  name: string | null;
  email: string | null;
  am: string | null;
  crmId: string | null;
  stufe: string;
  antworten: { feld: string; text: string }[];
};

type Daten = {
  ok: boolean;
  error?: string;
  segment: "free" | "kaeufer";
  fragen: { feld: string; frage: string }[];
  beantwortet: number;
  ausstehend: number;
  verteilungen: { feld: string; frage: string; mehrfach: boolean; werte: { wert: string; label: string; anzahl: number }[] }[];
  sonstiges: string[];
  personen: Person[];
};

const SEGMENTE = [
  { wert: "free", label: "Free-Mitglieder", detail: "Fragen 1–7" },
  { wert: "kaeufer", label: "Mentoring-Käufer", detail: "Fragen 1–10" },
] as const;

const ZEITRAEUME = [
  { tage: 7, label: "7 Tage" },
  { tage: 30, label: "30 Tage" },
  { tage: 90, label: "90 Tage" },
  { tage: 0, label: "Gesamt" },
];

const STUFE_LABEL: Record<string, string> = {
  free: "Free",
  mentoring: "Mentoring",
  monthly: "Abo",
  quarterly: "Abo",
  yearly: "Abo",
  lifetime: "Lifetime",
  ht_1on1: "1:1",
};

function datum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });
}

/**
 * `/admin/icp/fragen` — die ICP-Fragen nach Emre (Migration 113): Free-Mitglieder
 * (Fragen 1–7) und Mentoring-Käufer (1–10) getrennt, mit Verteilung je Frage,
 * den Freitexten zu „Sonstiges" und den Antworten jeder Person. Daten aus
 * `/api/admin/icp/fragen`.
 */
export function IcpFragen() {
  const [segment, setSegment] = useState<"free" | "kaeufer">("free");
  const [tage, setTage] = useState(0);
  const [daten, setDaten] = useState<Daten | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [suche, setSuche] = useState("");
  const [offen, setOffen] = useState<string | null>(null);

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const res = await fetch(`/api/admin/icp/fragen?segment=${segment}&tage=${tage}`, { cache: "no-store" });
      setDaten((await res.json()) as Daten);
    } catch {
      setDaten({ ok: false, error: "Keine Verbindung." } as Daten);
    } finally {
      setLaedt(false);
    }
  }, [segment, tage]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const personen = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const liste = daten?.ok ? daten.personen : [];
    if (!q) return liste;
    return liste.filter((p) =>
      [p.name, p.email, ...p.antworten.map((a) => a.text)].some((t) => t?.toLowerCase().includes(q)),
    );
  }, [daten, suche]);

  const quote =
    daten?.ok && daten.beantwortet + daten.ausstehend > 0
      ? prozent(daten.beantwortet, daten.beantwortet + daten.ausstehend)
      : "—";

  return (
    <Stack spacing={5}>
      <Flex gap={3} wrap="wrap" align="center" justify="space-between">
        <Flex gap={4} wrap="wrap">
          <HStack spacing={2}>
            {SEGMENTE.map((s) => (
              <Button key={s.wert} {...adminChipProps(segment === s.wert)} onClick={() => setSegment(s.wert)}>
                {s.label}
                <Box as="span" ml={2} color="var(--cc-text-3)" fontWeight={400}>
                  {s.detail}
                </Box>
              </Button>
            ))}
          </HStack>
          <HStack spacing={2}>
            {ZEITRAEUME.map((z) => (
              <Button key={z.tage} {...adminChipProps(tage === z.tage)} onClick={() => setTage(z.tage)}>
                {z.label}
              </Button>
            ))}
          </HStack>
        </Flex>
        <Button
          as="a"
          href={`/api/admin/icp/fragen?segment=${segment}&tage=${tage}&format=csv`}
          size="sm"
          variant="line"
          leftIcon={<Download size={14} />}
        >
          Als CSV
        </Button>
      </Flex>

      {laedt && !daten ? (
        <Text fontSize="14px" color="var(--cc-text-2)">
          Wird geladen …
        </Text>
      ) : !daten?.ok ? (
        <Box {...adminEmptyProps}>{daten?.error ?? "Auswertung nicht verfügbar."}</Box>
      ) : (
        <Stack spacing={5} opacity={laedt ? 0.6 : 1} transition="opacity 200ms">
          <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap={4}>
            {[
              { label: "Beantwortet", wert: String(daten.beantwortet), hinweis: tage ? `in ${tage} Tagen` : "gesamt" },
              {
                label: "Ausstehend",
                wert: String(daten.ausstehend),
                hinweis: segment === "free" ? "laufender Zugang, Fragen offen" : "Mentoring, Fragen offen",
              },
              { label: "Quote", wert: quote, hinweis: "beantwortet von allen, die sie sehen" },
            ].map((k) => (
              <Box key={k.label} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
                <AdminLabel>{k.label}</AdminLabel>
                <Text className="cc-num" fontSize={{ base: "24px", md: "30px" }} fontWeight={600} color="var(--cc-text)" mt={1}>
                  {k.wert}
                </Text>
                <Text fontSize="12px" color="var(--cc-text-3)" mt={1}>
                  {k.hinweis}
                </Text>
              </Box>
            ))}
          </Grid>

          <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }} gap={5}>
            {daten.verteilungen.map((v, i) => {
              const max = Math.max(0, ...v.werte.map((w) => w.anzahl));
              const summe = v.werte.reduce((a, w) => a + w.anzahl, 0);
              return (
                <Karte
                  key={v.feld}
                  titel={`${i + 1}. ${v.frage}`}
                  untertitel={v.mehrfach ? "Mehrfachauswahl: Anteile beziehen sich auf alle Personen." : undefined}
                >
                  {summe === 0 ? (
                    <Box {...adminEmptyProps}>Noch keine Antworten.</Box>
                  ) : (
                    <Stack spacing={3}>
                      {v.werte.map((w) => (
                        <Balken
                          key={w.wert}
                          label={w.label}
                          anzahl={w.anzahl}
                          max={max}
                          gesamt={v.mehrfach ? daten.beantwortet : summe}
                        />
                      ))}
                    </Stack>
                  )}
                </Karte>
              );
            })}
          </Grid>

          {daten.sonstiges.length ? (
            <Karte titel="Herkunft „Sonstiges“" untertitel="Was unter Frage 7 frei eingetragen wurde.">
              <Flex gap={2} wrap="wrap">
                {daten.sonstiges.map((t, i) => (
                  <Box
                    key={`${t}-${i}`}
                    px={3}
                    py={1.5}
                    borderRadius="8px"
                    border="1px solid var(--cc-line)"
                    fontSize="13px"
                    color="var(--cc-text-soft)"
                  >
                    {t}
                  </Box>
                ))}
              </Flex>
            </Karte>
          ) : null}

          <Karte titel="Antworten je Person" untertitel="Neueste zuerst. Klick auf eine Zeile zeigt alle Antworten.">
            <Stack spacing={3}>
              <Input
                size="sm"
                {...adminInputProps}
                maxW="360px"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Name, E-Mail oder Antwort suchen"
              />
              {personen.length === 0 ? (
                <Box {...adminEmptyProps}>Keine Antworten gefunden.</Box>
              ) : (
                <Stack spacing={2}>
                  {personen.map((p) => {
                    const auf = offen === p.id;
                    return (
                      <Box key={p.id} borderRadius="10px" border="1px solid var(--cc-line)" bg="rgba(255, 255, 255, 0.02)">
                        <Flex
                          as="button"
                          type="button"
                          w="full"
                          textAlign="left"
                          px={4}
                          py={3}
                          gap={3}
                          align="center"
                          onClick={() => setOffen(auf ? null : p.id)}
                          aria-expanded={auf}
                        >
                          <Box flex="1" minW={0}>
                            <Text fontSize="14px" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
                              {p.name || p.email || "Ohne Namen"}
                            </Text>
                            <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
                              {[p.name ? p.email : null, datum(p.am)].filter(Boolean).join(" · ")}
                            </Text>
                          </Box>
                          <Text
                            display={{ base: "none", md: "block" }}
                            fontSize="13px"
                            color="var(--cc-text-2)"
                            maxW="360px"
                            noOfLines={1}
                            title="Größte Hürde (Frage 3)"
                          >
                            {p.antworten.find((a) => a.feld === "main_problem")?.text}
                          </Text>
                          <Box
                            px={2}
                            py={0.5}
                            borderRadius="6px"
                            border="1px solid var(--cc-line-strong)"
                            fontSize="11px"
                            color="var(--cc-text-2)"
                            flexShrink={0}
                          >
                            {STUFE_LABEL[p.stufe] ?? p.stufe}
                          </Box>
                          <Box color="var(--cc-text-3)" flexShrink={0}>
                            {auf ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </Box>
                        </Flex>
                        {auf ? (
                          <Stack spacing={3} px={4} pb={4} pt={1} borderTop="1px solid var(--cc-line)">
                            <Grid templateColumns={{ base: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr)" }} gap={3} pt={3}>
                              {p.antworten.map((a, i) => (
                                <Box key={a.feld}>
                                  <Text fontSize="12px" color="var(--cc-text-3)">
                                    {i + 1}. {daten.fragen.find((f) => f.feld === a.feld)?.frage}
                                  </Text>
                                  <Text fontSize="14px" color="var(--cc-text)" mt={0.5}>
                                    {a.text}
                                  </Text>
                                </Box>
                              ))}
                            </Grid>
                            {p.crmId ? (
                              <Box>
                                <Link href={`/crm/kontakte/${p.crmId}`} target="_blank" style={{ textDecoration: "none" }}>
                                  <Button as="span" size="sm" variant="line" rightIcon={<ExternalLink size={14} />}>
                                    Im CRM öffnen
                                  </Button>
                                </Link>
                              </Box>
                            ) : null}
                          </Stack>
                        ) : null}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Karte>
        </Stack>
      )}
    </Stack>
  );
}
