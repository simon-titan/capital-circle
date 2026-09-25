"use client";

import { Box, Button, Flex, Grid, HStack, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { Download } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { FRAGEN, antwortLabel, type FrageFeld } from "@/config/onboarding";
import {
  ADMIN_CARD_CLASS,
  ADMIN_CHART,
  AdminCardTitle,
  AdminLabel,
  adminCardPadding,
  adminChipProps,
  adminEmptyProps,
  adminTableSx,
} from "@/components/admin/adminUi";

type Verteilung = {
  feld: FrageFeld;
  frage: string;
  werte: { wert: string; label: string; anzahl: number }[];
};

type Daten = {
  ok: boolean;
  error?: string;
  gesamt: number;
  neu: number;
  bestand: number;
  verteilungen: Verteilung[];
  kreuztabellen: {
    stage_plan: Record<string, Record<string, number>>;
    problem_ziel: Record<string, Record<string, number>>;
    discovery_plan: Record<string, Record<string, number>>;
  };
  bindung: { wert: string; label: string; anzahl: number; aktiv: number; lernzeitMedianStunden: number | null }[];
  trichter: { art: string; label: string; anzahl: number; medianStunden: number | null }[];
};

const ZEITRAEUME = [
  { tage: 30, label: "30 Tage" },
  { tage: 90, label: "90 Tage" },
  { tage: 0, label: "Gesamt" },
];

const GRUPPEN = [
  { wert: "alle", label: "Alle" },
  { wert: "neu", label: "Neukäufer" },
  { wert: "bestand", label: "Bestand" },
];

const PLAN_LABEL: Record<string, string> = {
  monthly: "Monatlich",
  quarterly: "Quartal",
  yearly: "Jährlich",
  lifetime: "Lifetime",
  ht_1on1: "1:1",
  whop: "Whop-Umzug",
  inaktiv: "Nicht mehr zahlend",
};

function prozent(teil: number, ganz: number): string {
  if (!ganz) return "—";
  return `${Math.round((teil / ganz) * 100)} %`;
}

function stunden(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} Min.`;
  if (h < 48) return `${Math.round(h * 10) / 10} Std.`;
  return `${Math.round(h / 24)} Tage`;
}

function Balken({ label, anzahl, max, gesamt }: { label: string; anzahl: number; max: number; gesamt: number }) {
  const anteil = max > 0 ? anzahl / max : 0;
  return (
    <Stack spacing={1.5}>
      <HStack justify="space-between" align="baseline" spacing={3}>
        <Text fontSize="13px" color="var(--cc-text-soft)" lineHeight={1.4}>
          {label}
        </Text>
        <Text className="cc-num" fontSize="13px" color="var(--cc-text)" fontWeight={600} flexShrink={0}>
          {anzahl}
          <Box as="span" color="var(--cc-text-2)" fontWeight={400} ml={2}>
            {prozent(anzahl, gesamt)}
          </Box>
        </Text>
      </HStack>
      <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="6px">
        <Box
          h="full"
          w={`${(anzahl > 0 ? Math.max(0.02, anteil) : 0) * 100}%`}
          bg={ADMIN_CHART.gold}
          borderRadius="full"
          transition="width 600ms var(--cc-ease)"
        />
      </Box>
    </Stack>
  );
}

function Karte({ titel, children, untertitel }: { titel: string; untertitel?: string; children: ReactNode }) {
  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} minW={0}>
      <AdminCardTitle>{titel}</AdminCardTitle>
      {untertitel ? (
        <Text fontSize="13px" color="var(--cc-text-2)" mt={1} lineHeight={1.5}>
          {untertitel}
        </Text>
      ) : null}
      <Box mt={4}>{children}</Box>
    </Box>
  );
}

/** Kreuztabelle: Zeilen = Antworten, Spalten = zweite Größe. Zellfarbe = Anteil an der Zeile (eine Farbe, heller = mehr). */
function Kreuztabelle({
  daten,
  zeilenFeld,
  spaltenFeld,
}: {
  daten: Record<string, Record<string, number>>;
  zeilenFeld: FrageFeld;
  spaltenFeld: FrageFeld | "plan";
}) {
  const zeilen = FRAGEN.find((f) => f.feld === zeilenFeld)!.antworten.filter((a) => daten[a.wert]);
  const spaltenWerte =
    spaltenFeld === "plan"
      ? [...new Set(Object.values(daten).flatMap((r) => Object.keys(r)))].sort()
      : FRAGEN.find((f) => f.feld === spaltenFeld)!.antworten.map((a) => a.wert);
  const spaltenLabel = (w: string) => (spaltenFeld === "plan" ? (PLAN_LABEL[w] ?? w) : antwortLabel(spaltenFeld, w));

  if (zeilen.length === 0) {
    return <Box {...adminEmptyProps}>Noch keine Antworten im gewählten Zeitraum.</Box>;
  }

  return (
    <Box overflowX="auto">
      <Table variant="unstyled" size="sm" sx={adminTableSx}>
        <Thead>
          <Tr>
            <Th />
            {spaltenWerte.map((s) => (
              <Th key={s} isNumeric maxW="120px" whiteSpace="normal" title={spaltenLabel(s)}>
                <Text noOfLines={2}>{spaltenLabel(s)}</Text>
              </Th>
            ))}
            <Th isNumeric>Summe</Th>
          </Tr>
        </Thead>
        <Tbody>
          {zeilen.map((z) => {
            const reihe = daten[z.wert] ?? {};
            const summe = Object.values(reihe).reduce((a, b) => a + b, 0);
            return (
              <Tr key={z.wert}>
                <Td maxW="260px" whiteSpace="normal" fontSize="13px" color="var(--cc-text-soft)">
                  {z.label}
                </Td>
                {spaltenWerte.map((s) => {
                  const n = reihe[s] ?? 0;
                  const anteil = summe ? n / summe : 0;
                  return (
                    <Td
                      key={s}
                      isNumeric
                      className="cc-num"
                      bg={n ? `rgba(212, 176, 128, ${(0.06 + anteil * 0.34).toFixed(3)})` : undefined}
                      color={n ? "var(--cc-text)" : "var(--cc-text-3)"}
                      title={n ? `${n} · ${prozent(n, summe)} der Zeile` : undefined}
                    >
                      {n || "·"}
                    </Td>
                  );
                })}
                <Td isNumeric className="cc-num" fontWeight={600}>
                  {summe}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

export function IcpAuswertung() {
  const [tage, setTage] = useState(0);
  const [gruppe, setGruppe] = useState("alle");
  const [daten, setDaten] = useState<Daten | null>(null);
  const [laedt, setLaedt] = useState(true);

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const res = await fetch(`/api/admin/icp?tage=${tage}&gruppe=${gruppe}`, { cache: "no-store" });
      setDaten((await res.json()) as Daten);
    } catch {
      setDaten({ ok: false, error: "Keine Verbindung." } as Daten);
    } finally {
      setLaedt(false);
    }
  }, [tage, gruppe]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const kaeufer = daten?.trichter?.[0]?.anzahl ?? 0;

  return (
    <Stack spacing={5}>
      <Flex gap={3} wrap="wrap" align="center" justify="space-between">
        <Flex gap={4} wrap="wrap">
          <HStack spacing={2}>
            {ZEITRAEUME.map((z) => (
              <Button key={z.tage} {...adminChipProps(tage === z.tage)} onClick={() => setTage(z.tage)}>
                {z.label}
              </Button>
            ))}
          </HStack>
          <HStack spacing={2}>
            {GRUPPEN.map((g) => (
              <Button key={g.wert} {...adminChipProps(gruppe === g.wert)} onClick={() => setGruppe(g.wert)}>
                {g.label}
              </Button>
            ))}
          </HStack>
        </Flex>
        <Button
          as="a"
          href={`/api/admin/icp?tage=${tage}&gruppe=${gruppe}&format=csv`}
          size="sm"
          variant="line"
          leftIcon={<Download size={14} />}
        >
          Rohdaten als CSV
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
          <Grid templateColumns={{ base: "repeat(3, minmax(0, 1fr))" }} gap={4}>
            {[
              { label: "Antworten", wert: daten.gesamt },
              { label: "Neukäufer", wert: daten.neu },
              { label: "Bestand", wert: daten.bestand },
            ].map((k) => (
              <Box key={k.label} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
                <AdminLabel>{k.label}</AdminLabel>
                <Text className="cc-num" fontSize={{ base: "24px", md: "30px" }} fontWeight={600} color="var(--cc-text)" mt={1}>
                  {k.wert}
                </Text>
              </Box>
            ))}
          </Grid>

          <Karte
            titel="Aktivierung der Neukäufer"
            untertitel="Käufer seit dem Onboarding-Start → Fragen → Discord → Vorstellung → erster Kursstart → vollständig aktiviert. Anteil bezogen auf die Käufer, Dauer als Median ab Kontoanlage."
          >
            <Stack spacing={4}>
              {daten.trichter.map((s) => (
                <Stack key={s.art} spacing={1.5}>
                  <HStack justify="space-between" align="baseline">
                    <Text fontSize="14px" color="var(--cc-text-soft)">
                      {s.label}
                    </Text>
                    <Text className="cc-num" fontSize="14px" fontWeight={600} color="var(--cc-text)">
                      {s.anzahl}
                      <Box as="span" fontWeight={400} color="var(--cc-text-2)" ml={2}>
                        {s.art === "kaeufer" ? "" : prozent(s.anzahl, kaeufer)}
                        {s.medianStunden != null ? ` · nach ${stunden(s.medianStunden)}` : ""}
                      </Box>
                    </Text>
                  </HStack>
                  <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="8px">
                    <Box
                      h="full"
                      w={`${kaeufer ? Math.min(100, (s.anzahl / kaeufer) * 100) : 0}%`}
                      bg={ADMIN_CHART.gold}
                      borderRadius="full"
                      transition="width 600ms var(--cc-ease)"
                    />
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Karte>

          <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }} gap={5}>
            {daten.verteilungen.map((v) => {
              const max = Math.max(0, ...v.werte.map((w) => w.anzahl));
              const summe = v.werte.reduce((a, w) => a + w.anzahl, 0);
              return (
                <Karte key={v.feld} titel={v.frage}>
                  {summe === 0 ? (
                    <Box {...adminEmptyProps}>Noch keine Antworten.</Box>
                  ) : (
                    <Stack spacing={3}>
                      {v.werte.map((w) => (
                        <Balken key={w.wert} label={w.label} anzahl={w.anzahl} max={max} gesamt={summe} />
                      ))}
                    </Stack>
                  )}
                </Karte>
              );
            })}
          </Grid>

          <Karte
            titel="Bindung nach Stand"
            untertitel="Wie viele je Gruppe heute noch zahlen, und wie viel sie lernen (Median der gesamten Lernzeit)."
          >
            <Box overflowX="auto">
              <Table variant="unstyled" size="sm" sx={adminTableSx}>
                <Thead>
                  <Tr>
                    <Th>Stand</Th>
                    <Th isNumeric>Mitglieder</Th>
                    <Th isNumeric>Noch zahlend</Th>
                    <Th isNumeric>Lernzeit (Median)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {daten.bindung.map((b) => (
                    <Tr key={b.wert}>
                      <Td whiteSpace="normal" fontSize="13px" color="var(--cc-text-soft)">
                        {b.label}
                      </Td>
                      <Td isNumeric className="cc-num">
                        {b.anzahl}
                      </Td>
                      <Td isNumeric className="cc-num">
                        {b.anzahl ? `${b.aktiv} · ${prozent(b.aktiv, b.anzahl)}` : "—"}
                      </Td>
                      <Td isNumeric className="cc-num">
                        {stunden(b.lernzeitMedianStunden)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Karte>

          <Karte titel="Stand × Plan" untertitel="Welche Gruppe kauft welchen Plan. Zellfarbe = Anteil an der Zeile.">
            <Kreuztabelle daten={daten.kreuztabellen.stage_plan} zeilenFeld="trading_stage" spaltenFeld="plan" />
          </Karte>
          <Karte titel="Problem × Ziel">
            <Kreuztabelle daten={daten.kreuztabellen.problem_ziel} zeilenFeld="main_problem" spaltenFeld="trading_goal" />
          </Karte>
          <Karte titel="Herkunft × Plan" untertitel="Selbst angegebene Herkunft (Frage 5) — nicht dasselbe wie die technische UTM-Herkunft, die in der CSV steht.">
            <Kreuztabelle daten={daten.kreuztabellen.discovery_plan} zeilenFeld="discovery_source" spaltenFeld="plan" />
          </Karte>
        </Stack>
      )}
    </Stack>
  );
}
