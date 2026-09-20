"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import {
  Activity,
  CreditCard,
  Info,
  MousePointerClick,
  RefreshCw,
  Route,
  ScrollText,
  Timer,
  TrendingDown,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ZEITRAEUME, type Zeitraum } from "@/lib/analytics/kaufweg";
import {
  ADMIN_CARD_CLASS,
  ADMIN_CHART,
  AdminCardTitle,
  AdminLabel,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminChipProps,
  adminInsetProps,
  adminTableSx,
} from "./adminUi";
import { KaufwegTagesChart } from "./KaufwegTagesChart";

/**
 * Die Auswertung des Kaufwegs: Besuch → Klick → Kasse → Zahlung.
 *
 * ── Der Grundsatz dieser Ansicht ───────────────────────────────────────────
 *
 * Jede Zahl sagt, woher sie kommt. Die Ansicht mischt drei Quellen, die sich
 * absichtlich nicht decken: die eigene Messung der Verkaufsseite, die Tabelle
 * `checkout_sessions` und die Tabelle `payments`. Wer eine Zahl ohne ihre
 * Herkunft liest, vergleicht früher oder später Äpfel mit Birnen — und hält
 * eine Übergangsquote über 100 % für einen Rechenfehler, obwohl sie richtig
 * ist (in der Kasse landen auch Käufer, die nie auf der Verkaufsseite waren).
 *
 * Die Sätze dazu kommen vom Server mit (`hinweise`), nicht aus dieser Datei:
 * Die Rechnung und ihre Erklärung sollen nicht auseinanderlaufen können.
 */

/* ── Antwortform ─────────────────────────────────────────────────────────── */

interface Fach {
  titel: string;
  anzahl: number;
  anteil: number;
}

interface Antwort {
  ok: true;
  bereit: boolean;
  zeitraum: { tage: number; von: string; bis: string };
  aktualisiert: { gelaufen: boolean; grund?: string; sitzungen?: number };
  trichter: Array<{
    schluessel: string;
    titel: string;
    anzahl: number;
    uebergang: number;
    vomStart: number;
    quelle: string;
  }>;
  besuche: {
    sitzungen: number;
    sitzungenMitKlick: number;
    klicks: number;
    modalGeoeffnet: number;
    laufzeitGewaehlt: number;
    absprung: number;
    absprungQuote: number;
    mittlereDauerSek: number;
  };
  verlauf: Array<{
    tag: string;
    besuche: number;
    klicks: number;
    kassen: number;
    kaeufe: number;
    abbrueche: number;
    fehlzahlungen: number;
  }>;
  herkunft: Array<{
    herkunft: string;
    sitzungen: number;
    sitzungenMitKlick: number;
    klicks: number;
    klickQuote: number;
    kassen: number;
    kaeufe: number;
    kaufQuote: number;
    mittlereDauerSek: number;
  }>;
  pakete: Array<{ plan: string; kassen: number; kaeufe: number; zurueck: number; abgelaufen: number; quote: number }>;
  dauer: Fach[];
  scroll: Fach[];
  abschnitte: Array<{ abschnitt: string; titel: string; erreicht: number; gestoppt: number; anteil: number }>;
  bauteile: Array<{ bauteil: string; titel: string; klicks: number; kassen: number; modal_geoeffnet: number }>;
  kasse: {
    gestartet: number;
    bezahlt: number;
    zurueck: number;
    abgelaufen: number;
    offen: number;
    abbrueche: number;
    abbruchQuote: number;
    kaufQuote: number;
  };
  zahlungen: {
    fehlgeschlagen: number;
    betroffene: number;
    summeCents: number;
    gruende: Array<{ grund: string; anzahl: number }>;
  };
  kette: { kassen: number; mitSitzung: number; anteil: number; kaeufeMitSitzung: number };
  hinweise: Record<string, string>;
}

const PLAN_TITEL: Record<string, string> = {
  monthly: "Monatlich",
  quarterly: "Vierteljährlich",
  yearly: "Jährlich",
};

const zahlFmt = new Intl.NumberFormat("de-DE");
const eurFmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function dauerText(sekunden: number): string {
  if (sekunden < 60) return `${sekunden} s`;
  const min = Math.floor(sekunden / 60);
  const rest = sekunden % 60;
  return rest === 0 ? `${min} min` : `${min} min ${rest} s`;
}

/* ── Hauptkomponente ─────────────────────────────────────────────────────── */

export function KaufwegDashboard() {
  const [zeitraum, setZeitraum] = useState<Zeitraum>(30);
  const [daten, setDaten] = useState<Antwort | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const lade = useCallback(
    async (tage: Zeitraum, allesNeu = false) => {
      setLaedt(true);
      setFehler(null);
      try {
        const res = await fetch(`/api/admin/analytics/kaufweg?tage=${tage}${allesNeu ? "&neu=1" : ""}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as Antwort | { ok: false; error?: string };
        if (!res.ok || !json.ok) {
          setFehler((json as { error?: string }).error ?? "Die Auswertung konnte nicht geladen werden.");
          return;
        }
        setDaten(json);
      } catch (err) {
        setFehler(err instanceof Error ? err.message : "Netzwerkfehler.");
      } finally {
        setLaedt(false);
      }
    },
    [],
  );

  useEffect(() => {
    void lade(zeitraum);
  }, [lade, zeitraum]);

  if (laedt && !daten) {
    return (
      <HStack py={20} justify="center">
        <Spinner color="var(--cc-gold)" />
      </HStack>
    );
  }

  if (fehler) {
    return (
      <Alert status="error" variant="subtle" {...adminAlertProps("error")}>
        <AlertIcon color={adminAlertIconColor("error")} />
        <Stack spacing={1}>
          <Text fontSize="sm">{fehler}</Text>
          <Button size="xs" variant="line" alignSelf="flex-start" onClick={() => void lade(zeitraum)}>
            Erneut versuchen
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!daten) return null;

  return (
    <Stack spacing={6}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <HStack spacing={1.5}>
          {ZEITRAEUME.map((t) => (
            <Button key={t} {...adminChipProps(zeitraum === t)} onClick={() => setZeitraum(t)}>
              {t} Tage
            </Button>
          ))}
          <Text fontSize="12px" color="var(--cc-text-3)" className="cc-num" pl={2}>
            {daten.zeitraum.von} bis {daten.zeitraum.bis}
          </Text>
        </HStack>
        <HStack spacing={2}>
          <Button
            size="sm"
            variant="line"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => void lade(zeitraum)}
            isLoading={laedt}
          >
            Aktualisieren
          </Button>
          {/* Der Nachtlauf rechnet bis gestern; diese Ansicht rechnet die
              letzten beiden Tage bei jedem Aufruf mit. Der Knopf stellt den
              ganzen Zeitraum neu auf — für den Fall, dass der Nachtlauf
              ausgefallen ist. */}
          <Button size="sm" variant="line" onClick={() => void lade(zeitraum, true)} isLoading={laedt}>
            Zeitraum neu rechnen
          </Button>
        </HStack>
      </HStack>

      {!daten.bereit ? (
        <Alert status="warning" variant="subtle" {...adminAlertProps("warning")}>
          <AlertIcon color={adminAlertIconColor("warning")} />
          <Stack spacing={1}>
            <Text fontSize="sm" fontWeight={500}>
              Die eigene Messung ist noch nicht aktiv.
            </Text>
            <Text fontSize="13px" color="var(--cc-text-2)">
              Migration <Box as="code">101_kaufweg_analytics.sql</Box> ist nicht eingespielt. Besuche, Verweildauer,
              Scrolltiefe und Klicks bleiben deshalb leer. Die Zahlen zu Kasse und Zahlungen unten stimmen trotzdem —
              sie stammen aus <Box as="code">checkout_sessions</Box> und <Box as="code">payments</Box>.
            </Text>
          </Stack>
        </Alert>
      ) : null}

      {/*
        Steht die Messung, konnte die Tagesrechnung aber nicht neu aufgestellt
        werden, sind die Zahlen von heute älter als sie aussehen. Das gehört
        sichtbar hin — ein stiller Nuller in einer Auswertung fällt sonst erst
        auf, wenn jemand eine Entscheidung darauf gestützt hat.
      */}
      {daten.bereit && !daten.aktualisiert.gelaufen ? (
        <Alert status="warning" variant="subtle" {...adminAlertProps("warning")}>
          <AlertIcon color={adminAlertIconColor("warning")} />
          <Text fontSize="13px">
            Die Tagesrechnung konnte nicht aktualisiert werden
            {daten.aktualisiert.grund ? `: ${daten.aktualisiert.grund}` : "."} Die Zahlen unten stammen aus dem
            letzten erfolgreichen Lauf.
          </Text>
        </Alert>
      ) : null}

      <KennzahlenReihe daten={daten} />
      <TrichterKarte daten={daten} />
      <VerlaufKarte daten={daten} />

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
        <FaecherKarte
          titel="Verweildauer"
          icon={<Timer size={16} strokeWidth={1.75} />}
          quelle={daten.hinweise.dauer}
          faecher={daten.dauer}
          zusatz={`Im Mittel ${dauerText(daten.besuche.mittlereDauerSek)} je Besuch`}
        />
        <FaecherKarte
          titel="Scrolltiefe"
          icon={<ScrollText size={16} strokeWidth={1.75} />}
          quelle={daten.hinweise.scroll}
          faecher={daten.scroll}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
        <AbschnittKarte daten={daten} />
        <BauteilKarte daten={daten} />
      </SimpleGrid>

      <HerkunftKarte daten={daten} />

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
        <PaketKarte daten={daten} />
        <AbbruchKarte daten={daten} />
      </SimpleGrid>
    </Stack>
  );
}

/* ── Bausteine ───────────────────────────────────────────────────────────── */

function Karte({
  titel,
  icon,
  rechts,
  quelle,
  children,
}: {
  titel: string;
  icon?: ReactNode;
  rechts?: ReactNode;
  /** Der Satz, der sagt, woher die Zahlen dieser Karte kommen. Pflicht. */
  quelle: string;
  children: ReactNode;
}) {
  return (
    <Box as="section" className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <HStack justify="space-between" flexWrap="wrap" gap={2} mb={3}>
        <HStack spacing={2}>
          {icon ? (
            <Box color="var(--cc-text-2)" aria-hidden>
              {icon}
            </Box>
          ) : null}
          <AdminCardTitle>{titel}</AdminCardTitle>
        </HStack>
        {rechts}
      </HStack>
      <Quelle text={quelle} />
      <Box mt={4}>{children}</Box>
    </Box>
  );
}

/** Ein Satz zur Herkunft der Zahlen — steht über jeder Karte, nicht im Kleingedruckten. */
function Quelle({ text }: { text: string }) {
  return (
    <HStack align="flex-start" spacing={2} color="var(--cc-text-3)">
      <Box mt="2px" flexShrink={0} aria-hidden>
        <Info size={13} strokeWidth={1.75} />
      </Box>
      <Text fontSize="12px" lineHeight={1.5} maxW="70ch">
        {text}
      </Text>
    </HStack>
  );
}

function Kennzahl({
  icon,
  label,
  wert,
  unterzeile,
}: {
  icon: ReactNode;
  label: string;
  wert: string;
  unterzeile?: string;
}) {
  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <Stack spacing={3}>
        <HStack spacing={2} color="var(--cc-text-2)">
          {icon}
          <AdminLabel>{label}</AdminLabel>
        </HStack>
        <Text className="cc-num" fontSize="28px" fontWeight={600} letterSpacing="-0.02em" lineHeight="1" color="var(--cc-text)">
          {wert}
        </Text>
        {unterzeile ? (
          <Text fontSize="12px" color="var(--cc-text-2)" className="cc-num" lineHeight={1.45}>
            {unterzeile}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}

function KennzahlenReihe({ daten }: { daten: Antwort }) {
  const { besuche, kasse, zahlungen } = daten;
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4}>
      <Kennzahl
        icon={<Users size={16} strokeWidth={1.75} />}
        label="Besuche"
        wert={zahlFmt.format(besuche.sitzungen)}
        unterzeile={`${dauerText(besuche.mittlereDauerSek)} im Mittel · ${zahlFmt.format(besuche.absprung)} ohne Klick (${besuche.absprungQuote} %)`}
      />
      <Kennzahl
        icon={<MousePointerClick size={16} strokeWidth={1.75} />}
        label="Klicks auf Kauf-Knöpfe"
        wert={zahlFmt.format(besuche.klicks)}
        unterzeile={`${zahlFmt.format(besuche.sitzungenMitKlick)} Besuche mit Klick · ${zahlFmt.format(besuche.modalGeoeffnet)} Dialog geöffnet`}
      />
      <Kennzahl
        icon={<CreditCard size={16} strokeWidth={1.75} />}
        label="Kasse geöffnet"
        wert={zahlFmt.format(kasse.gestartet)}
        unterzeile={`${zahlFmt.format(kasse.bezahlt)} bezahlt (${kasse.kaufQuote} %) · ${zahlFmt.format(kasse.abbrueche)} abgebrochen`}
      />
      <Kennzahl
        icon={<TrendingDown size={16} strokeWidth={1.75} />}
        label="Zahlung fehlgeschlagen"
        wert={zahlFmt.format(zahlungen.fehlgeschlagen)}
        unterzeile={`${zahlFmt.format(zahlungen.betroffene)} Konten · ${eurFmt.format(zahlungen.summeCents / 100)} offen`}
      />
    </SimpleGrid>
  );
}

function TrichterKarte({ daten }: { daten: Antwort }) {
  const max = Math.max(1, ...daten.trichter.map((s) => s.anzahl));

  return (
    <Karte
      titel="Der Trichter"
      icon={<Route size={16} strokeWidth={1.75} />}
      quelle="Die ersten drei Stufen kommen aus der eigenen Messung der Verkaufsseite, die letzten beiden aus checkout_sessions. Beide Mengen decken sich nicht vollständig — in die Kasse kommt man auch ohne die Verkaufsseite. Deshalb kann die Übergangsquote von Klick zu Kasse über 100 % liegen."
      rechts={
        <StatusPill tone="neutral">
          {daten.kette.mitSitzung} von {daten.kette.kassen} Kassen einem Besuch zugeordnet ({daten.kette.anteil} %)
        </StatusPill>
      }
    >
      <Stack spacing={5}>
        {daten.trichter.map((stufe, i) => (
          <Stack key={stufe.schluessel} spacing={2}>
            <HStack justify="space-between" align="flex-end" gap={3}>
              <Text fontSize="14px" color="var(--cc-text-soft)">
                {stufe.titel}
              </Text>
              <HStack spacing={3} className="cc-num" flexShrink={0}>
                {i > 0 ? (
                  <Text fontSize="12px" color="var(--cc-text-3)">
                    {stufe.uebergang} % der Stufe darüber
                  </Text>
                ) : null}
                <Text fontSize="14px" fontWeight={600} color="var(--cc-text)">
                  {zahlFmt.format(stufe.anzahl)}
                </Text>
              </HStack>
            </HStack>
            <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="8px">
              <Box
                h="full"
                w={`${Math.max(stufe.anzahl > 0 ? 1.5 : 0, (stufe.anzahl / max) * 100).toFixed(2)}%`}
                bg={ADMIN_CHART.gold}
                borderRadius="full"
                transition="width 600ms var(--cc-ease)"
              />
            </Box>
            <Text fontSize="11px" color="var(--cc-text-3)" lineHeight={1.45}>
              {stufe.quelle}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Karte>
  );
}

function VerlaufKarte({ daten }: { daten: Antwort }) {
  const tage = useMemo(() => daten.verlauf.map((v) => v.tag), [daten.verlauf]);
  const kassen = useMemo(() => daten.verlauf.map((v) => v.kassen), [daten.verlauf]);
  const kaeufe = useMemo(() => daten.verlauf.map((v) => v.kaeufe), [daten.verlauf]);
  const abbrueche = useMemo(() => daten.verlauf.map((v) => v.abbrueche), [daten.verlauf]);
  const fehlzahlungen = useMemo(() => daten.verlauf.map((v) => v.fehlzahlungen), [daten.verlauf]);
  const besuche = useMemo(() => daten.verlauf.map((v) => v.besuche), [daten.verlauf]);

  /* Eine gemeinsame Höhe für die vier Kassen-Diagramme, damit sie vergleichbar
     bleiben. Die Besuche stehen darüber und **nicht** auf derselben Achse:
     Sie sind eine Größenordnung höher, und eine zweite Achse im selben
     Diagramm wäre die verlässlichste Art, eine Kurve zu erfinden. */
  const maxKasse = Math.max(1, ...kassen, ...kaeufe, ...abbrueche, ...fehlzahlungen);

  return (
    <Karte
      titel="Zeitverlauf"
      icon={<Activity size={16} strokeWidth={1.75} />}
      quelle="Besuche aus der eigenen Messung, Kassen/Käufe/Abbrüche aus checkout_sessions, fehlgeschlagene Zahlungen aus payments. Käufe zählen am Tag der Zahlung, Abbrüche am Tag des Abbruchs — deshalb kann ein Tag mehr Käufe als Kassen haben."
    >
      <Stack spacing={6}>
        <KaufwegTagesChart
          titel="Besuche"
          tage={tage}
          werte={besuche}
          max={Math.max(1, ...besuche)}
          hoehe="190px"
          hinweis="Eigene Skala — die Besuche sind eine Größenordnung höher als alles darunter."
        />
        <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={5}>
          <KaufwegTagesChart titel="Kasse geöffnet" tage={tage} werte={kassen} max={maxKasse} />
          <KaufwegTagesChart titel="Bezahlt" tage={tage} werte={kaeufe} max={maxKasse} />
          <KaufwegTagesChart titel="Kasse abgebrochen" tage={tage} werte={abbrueche} max={maxKasse} ton="ink" />
          <KaufwegTagesChart
            titel="Zahlung fehlgeschlagen"
            tage={tage}
            werte={fehlzahlungen}
            max={maxKasse}
            ton="danger"
          />
        </SimpleGrid>
      </Stack>
    </Karte>
  );
}

function FaecherKarte({
  titel,
  icon,
  quelle,
  faecher,
  zusatz,
}: {
  titel: string;
  icon: ReactNode;
  quelle: string;
  faecher: Fach[];
  zusatz?: string;
}) {
  const max = Math.max(1, ...faecher.map((f) => f.anzahl));
  return (
    <Karte titel={titel} icon={icon} quelle={quelle} rechts={zusatz ? <StatusPill tone="neutral">{zusatz}</StatusPill> : undefined}>
      <Stack spacing={3}>
        {faecher.map((fach) => (
          <Stack key={fach.titel} spacing={1.5}>
            <HStack justify="space-between">
              <Text fontSize="13px" color="var(--cc-text-soft)">
                {fach.titel}
              </Text>
              <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)">
                {zahlFmt.format(fach.anzahl)} · {fach.anteil} %
              </Text>
            </HStack>
            <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="6px">
              <Box
                h="full"
                w={`${((fach.anzahl / max) * 100).toFixed(2)}%`}
                bg={ADMIN_CHART.gold}
                borderRadius="full"
                transition="width 500ms var(--cc-ease)"
              />
            </Box>
          </Stack>
        ))}
      </Stack>
    </Karte>
  );
}

function AbschnittKarte({ daten }: { daten: Antwort }) {
  const max = Math.max(1, ...daten.abschnitte.map((a) => a.erreicht));
  return (
    <Karte titel="Wie weit gelesen wurde" icon={<ScrollText size={16} strokeWidth={1.75} />} quelle={daten.hinweise.abschnitte}>
      <Stack spacing={3}>
        {daten.abschnitte.map((a) => (
          <Stack key={a.abschnitt} spacing={1.5}>
            <HStack justify="space-between" gap={3}>
              <Text fontSize="13px" color="var(--cc-text-soft)" noOfLines={1}>
                {a.titel}
              </Text>
              <HStack spacing={3} className="cc-num" flexShrink={0}>
                <Text fontSize="12px" color="var(--cc-text-3)">
                  {zahlFmt.format(a.gestoppt)} gestoppt
                </Text>
                <Text fontSize="13px" color="var(--cc-text-2)">
                  {zahlFmt.format(a.erreicht)} · {a.anteil} %
                </Text>
              </HStack>
            </HStack>
            <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="6px">
              <Box
                h="full"
                w={`${((a.erreicht / max) * 100).toFixed(2)}%`}
                bg={ADMIN_CHART.gold}
                borderRadius="full"
                transition="width 500ms var(--cc-ease)"
              />
            </Box>
          </Stack>
        ))}
      </Stack>
    </Karte>
  );
}

function BauteilKarte({ daten }: { daten: Antwort }) {
  const max = Math.max(1, ...daten.bauteile.map((b) => b.klicks));
  return (
    <Karte titel="Klicks je Knopf" icon={<MousePointerClick size={16} strokeWidth={1.75} />} quelle={daten.hinweise.klicks}>
      {daten.bauteile.length === 0 ? (
        <Text fontSize="13px" color="var(--cc-text-3)">
          Noch keine Klicks im Zeitraum.
        </Text>
      ) : (
        <Stack spacing={3}>
          {daten.bauteile.map((b) => (
            <Stack key={b.bauteil} spacing={1.5}>
              <HStack justify="space-between" gap={3}>
                <Text fontSize="13px" color="var(--cc-text-soft)" noOfLines={1}>
                  {b.titel}
                </Text>
                <HStack spacing={3} className="cc-num" flexShrink={0}>
                  {b.kassen > 0 ? (
                    <Text fontSize="12px" color="var(--cc-gold-light)">
                      {zahlFmt.format(b.kassen)} in die Kasse
                    </Text>
                  ) : null}
                  <Text fontSize="13px" color="var(--cc-text-2)">
                    {zahlFmt.format(b.klicks)}
                  </Text>
                </HStack>
              </HStack>
              <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="6px">
                <Box
                  h="full"
                  w={`${((b.klicks / max) * 100).toFixed(2)}%`}
                  bg={ADMIN_CHART.gold}
                  borderRadius="full"
                  transition="width 500ms var(--cc-ease)"
                />
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Karte>
  );
}

function HerkunftKarte({ daten }: { daten: Antwort }) {
  return (
    <Karte titel="Herkunft" icon={<Route size={16} strokeWidth={1.75} />} quelle={daten.hinweise.herkunft}>
      {daten.herkunft.length === 0 ? (
        <Text fontSize="13px" color="var(--cc-text-3)">
          Noch keine Besuche im Zeitraum.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="unstyled" size="sm" sx={adminTableSx}>
            <Thead>
              <Tr>
                <Th>Herkunft</Th>
                <Th isNumeric>Besuche</Th>
                <Th isNumeric>Ø Dauer</Th>
                <Th isNumeric>Mit Klick</Th>
                <Th isNumeric>Kassen</Th>
                <Th isNumeric>Käufe</Th>
                <Th isNumeric>Besuch → Kauf</Th>
              </Tr>
            </Thead>
            <Tbody>
              {daten.herkunft.map((h) => (
                <Tr key={h.herkunft}>
                  <Td>{h.herkunft}</Td>
                  <Td isNumeric>{zahlFmt.format(h.sitzungen)}</Td>
                  <Td isNumeric>{h.sitzungen > 0 ? dauerText(h.mittlereDauerSek) : "—"}</Td>
                  <Td isNumeric>
                    {zahlFmt.format(h.sitzungenMitKlick)}
                    <Box as="span" color="var(--cc-text-3)">
                      {" "}
                      ({h.klickQuote} %)
                    </Box>
                  </Td>
                  <Td isNumeric>{zahlFmt.format(h.kassen)}</Td>
                  <Td isNumeric>{zahlFmt.format(h.kaeufe)}</Td>
                  <Td isNumeric>{h.sitzungen > 0 ? `${h.kaufQuote} %` : "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Karte>
  );
}

function PaketKarte({ daten }: { daten: Antwort }) {
  return (
    <Karte titel="Pakete" icon={<CreditCard size={16} strokeWidth={1.75} />} quelle={daten.hinweise.pakete}>
      {daten.pakete.length === 0 ? (
        <Text fontSize="13px" color="var(--cc-text-3)">
          Keine Kasse im Zeitraum geöffnet.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="unstyled" size="sm" sx={adminTableSx}>
            <Thead>
              <Tr>
                <Th>Laufzeit</Th>
                <Th isNumeric>Kassen</Th>
                <Th isNumeric>Bezahlt</Th>
                <Th isNumeric>Zurück</Th>
                <Th isNumeric>Abgelaufen</Th>
                <Th isNumeric>Quote</Th>
              </Tr>
            </Thead>
            <Tbody>
              {daten.pakete.map((p) => (
                <Tr key={p.plan}>
                  <Td>{PLAN_TITEL[p.plan] ?? p.plan}</Td>
                  <Td isNumeric>{zahlFmt.format(p.kassen)}</Td>
                  <Td isNumeric>{zahlFmt.format(p.kaeufe)}</Td>
                  <Td isNumeric>{zahlFmt.format(p.zurueck)}</Td>
                  <Td isNumeric>{zahlFmt.format(p.abgelaufen)}</Td>
                  <Td isNumeric>{p.quote} %</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Karte>
  );
}

function AbbruchKarte({ daten }: { daten: Antwort }) {
  const { kasse, zahlungen } = daten;
  return (
    <Karte titel="Abbrüche und Fehlschläge" icon={<TrendingDown size={16} strokeWidth={1.75} />} quelle={daten.hinweise.abbruch}>
      <Stack spacing={4}>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
          <Zaehler titel="Zurück" wert={kasse.zurueck} />
          <Zaehler titel="Abgelaufen" wert={kasse.abgelaufen} />
          <Zaehler titel="Noch offen" wert={kasse.offen} />
          <Zaehler titel="Abbruchquote" wert={`${kasse.abbruchQuote} %`} />
        </SimpleGrid>

        <Stack spacing={2} pt={1}>
          <AdminLabel>Fehlgeschlagene Zahlungen</AdminLabel>
          <Quelle text={daten.hinweise.zahlungen} />
          {zahlungen.gruende.length === 0 ? (
            <Text fontSize="13px" color="var(--cc-text-3)">
              Keine im Zeitraum.
            </Text>
          ) : (
            <Stack spacing={0} {...adminInsetProps} px={3} py={1}>
              {zahlungen.gruende.map((g) => (
                <HStack
                  key={g.grund}
                  justify="space-between"
                  py={2}
                  gap={3}
                  borderBottom="1px solid var(--cc-line)"
                  _last={{ borderBottom: "none" }}
                >
                  <Text fontSize="13px" color="var(--cc-text-soft)" noOfLines={2}>
                    {g.grund}
                  </Text>
                  <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)" flexShrink={0}>
                    {zahlFmt.format(g.anzahl)}
                  </Text>
                </HStack>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Karte>
  );
}

function Zaehler({ titel, wert }: { titel: string; wert: number | string }) {
  return (
    <Stack {...adminInsetProps} px={3} py={2.5} spacing={1}>
      <Text fontSize="11px" letterSpacing="0.06em" textTransform="uppercase" color="var(--cc-text-3)">
        {titel}
      </Text>
      <Text className="cc-num" fontSize="18px" fontWeight={600} color="var(--cc-text)">
        {typeof wert === "number" ? zahlFmt.format(wert) : wert}
      </Text>
    </Stack>
  );
}
