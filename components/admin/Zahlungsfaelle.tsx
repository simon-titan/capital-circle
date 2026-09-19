"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Flex,
  FormLabel,
  HStack,
  Input,
  SimpleGrid,
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  AdminLabel,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminDangerButtonProps,
  adminEmptyProps,
  adminFormLabelProps,
  adminInputProps,
  adminInsetProps,
  adminTableSx,
  type AdminTone,
} from "@/components/admin/adminUi";
import type { ZahlungsfallNachricht, ZahlungsfallZeile } from "@/lib/admin/zahlungsfaelle";

/**
 * Die Fallakte der Zahlungsausfälle — Liste, Akte und Handlungen.
 *
 * Übernommen aus MoonTrading (`/admin/zahlungen`), im Admin-Schema v3.2:
 * Glas-Karten ohne Anheben, Champagner nur für „offen/ausstehend" und die
 * Hauptaktion, Grün/Rot nur semantisch. Die Daten lädt die Seite auf dem
 * Server (`lib/admin/zahlungsfaelle.ts`); hier wird nur gezeigt und gehandelt.
 *
 * Datumsangaben mit fester Zeitzone: Die Komponente rendert zuerst auf dem
 * Server (UTC) und dann im Browser — ohne feste Zone stünde dort ein anderer
 * Tag, und React meldete einen Hydrationsfehler.
 */

const ZONE = "Europe/Berlin";

function tagVon(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONE });
}

function zeitVon(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONE,
  });
}

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** Was der Zustand für die Arbeit bedeutet, in wenigen Worten. */
function zustand(f: ZahlungsfallZeile): { text: string; ton: AdminTone } {
  if (f.geschlossenAm) return { text: f.status === "bezahlt" ? "bezahlt" : "geschlossen", ton: f.status === "bezahlt" ? "success" : "neutral" };
  if (f.ueberfaellig) return { text: "Aufschub abgelaufen", ton: "danger" };
  if (f.letzteVonKunde) return { text: "Du bist dran", ton: "attention" };
  if (f.status === "aufschub") return { text: `Aufschub bis ${tagVon(f.aufschubBis)}`, ton: "success" };
  if (f.frist) return { text: `ruht ab ${tagVon(f.frist)} · ${f.erinnerungen}/2 erinnert`, ton: "neutral" };
  return { text: "offen, ohne Frist", ton: "neutral" };
}

function Kennzahl({ label, wert, hinweis }: { label: string; wert: string; hinweis?: string }) {
  return (
    <Box {...adminInsetProps} p={4} minW={0}>
      <AdminLabel mb={1.5}>{label}</AdminLabel>
      <Text className="cc-num" fontSize="22px" fontWeight={600} color="var(--cc-text)" lineHeight={1.2}>
        {wert}
      </Text>
      {hinweis ? (
        <Text fontSize="12px" color="var(--cc-text-2)" mt={1}>
          {hinweis}
        </Text>
      ) : null}
    </Box>
  );
}

function Karte({ titel, erklaerung, children }: { titel: string; erklaerung?: string; children: ReactNode }) {
  return (
    <Box as="section" className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <AdminCardTitle mb={erklaerung ? 1 : 4}>{titel}</AdminCardTitle>
      {erklaerung ? (
        <Text fontSize="13px" color="var(--cc-text-2)" mb={4} maxW="72ch" lineHeight={1.55}>
          {erklaerung}
        </Text>
      ) : null}
      {children}
    </Box>
  );
}

function PersonLink({ f }: { f: ZahlungsfallZeile }) {
  return (
    <Link href={`/admin/zahlungsstoerungen/${f.id}`} style={{ textDecoration: "none" }}>
      <Text fontSize="14px" fontWeight={600} color="var(--cc-text)" _hover={{ color: "var(--cc-gold-light)" }} noOfLines={1}>
        {/* Nie ein leerer Link: Ohne Namen und Adresse steht die Kontonummer. */}
        {f.name ?? f.email ?? `Konto ${f.userId.slice(0, 8)}`}
      </Text>
    </Link>
  );
}

/* ── Liste ─────────────────────────────────────────────────────────────────── */

export function ZahlungsfallListe({ faelle }: { faelle: ZahlungsfallZeile[] }) {
  const offen = faelle.filter((f) => !f.geschlossenAm);
  const geschlossen = faelle.filter((f) => f.geschlossenAm);
  const summeOffen = offen.reduce((s, f) => s + f.betragCents, 0);
  const duBistDran = offen.filter((f) => f.letzteVonKunde).length;
  const mitAufschub = offen.filter((f) => f.status === "aufschub" && !f.ueberfaellig).length;

  return (
    <Stack spacing={5}>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        <Kennzahl label="Offen" wert={String(offen.length)} hinweis={euro(summeOffen)} />
        <Kennzahl label="Du bist dran" wert={String(duBistDran)} hinweis={duBistDran ? "der Kunde hat geschrieben" : "nichts unbeantwortet"} />
        <Kennzahl label="Aufschub läuft" wert={String(mitAufschub)} hinweis="Zugang bleibt bis zur Frist" />
        <Kennzahl label="Abgeschlossen" wert={String(geschlossen.length)} />
      </SimpleGrid>

      <Karte
        titel="Offene Fälle"
        erklaerung="Eine Zeile je Rechnung, die nicht bezahlt wurde. Tag 3 und 5 erinnert der Nachtlauf, am siebten Tag ruht der Zugang. Ein Fall schliesst sich von selbst, sobald Stripe die Rechnung als bezahlt meldet."
      >
        {offen.length === 0 ? (
          <Box {...adminEmptyProps}>Kein offener Zahlungsfall.</Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Person", "Betrag", "Versuche", "Seit", "Zustand"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {offen.map((f) => {
                  const z = zustand(f);
                  return (
                    <Tr key={f.id}>
                      <Td>
                        <Stack spacing={0}>
                          <PersonLink f={f} />
                          {f.name && f.email ? (
                            <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
                              {f.email}
                            </Text>
                          ) : null}
                          <HStack spacing={1.5} mt={1}>
                            {!f.discordVerknuepft ? <StatusPill tone="neutral">kein Discord</StatusPill> : null}
                            {f.probe ? <StatusPill tone="neutral">Probe</StatusPill> : null}
                          </HStack>
                        </Stack>
                      </Td>
                      <Td className="cc-num">{euro(f.betragCents)}</Td>
                      <Td className="cc-num">{f.versuche}</Td>
                      <Td className="cc-num">{tagVon(f.eroeffnetAm)}</Td>
                      <Td>
                        <StatusPill tone={z.ton}>{z.text}</StatusPill>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Karte>

      {geschlossen.length > 0 ? (
        <Karte
          titel="Abgeschlossen"
          erklaerung="Bleiben stehen: Wer schon einmal einen Aufschub hatte, ist beim zweiten Mal ein anderer Fall."
        >
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Person", "Betrag", "Eröffnet", "Geschlossen", "Ausgang"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {geschlossen.map((f) => (
                  <Tr key={f.id}>
                    <Td>
                      <PersonLink f={f} />
                    </Td>
                    <Td className="cc-num">{euro(f.betragCents)}</Td>
                    <Td className="cc-num">{tagVon(f.eroeffnetAm)}</Td>
                    <Td className="cc-num">{tagVon(f.geschlossenAm)}</Td>
                    <Td>
                      <Text fontSize="13px" color={f.status === "bezahlt" ? "var(--cc-success)" : "var(--cc-text-2)"}>
                        {f.geschlossenGrund ?? "ohne Angabe"}
                      </Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Karte>
      ) : null}
    </Stack>
  );
}

/* ── Akte ──────────────────────────────────────────────────────────────────── */

const ZEILEN_ART = {
  kunde: { label: "Kunde", farbe: "var(--cc-gold-light)" },
  wir: { label: "Wir", farbe: "var(--cc-text)" },
  notiz: { label: "Interne Notiz, nicht verschickt", farbe: "var(--cc-text-2)" },
  system: { label: "System", farbe: "var(--cc-text-3)" },
} as const;

function zustellung(n: ZahlungsfallNachricht): string | null {
  if (!n.vonAdmin || n.kanal === "notiz" || n.kanal === "system") return null;
  const teile: string[] = [];
  if (n.zugestellt === true) teile.push("Discord zugestellt");
  else if (n.zugestellt === false) teile.push("Discord nicht zugestellt");
  if (n.mailGesendet === true) teile.push("Mail raus");
  else if (n.mailGesendet === false) teile.push("Mail gescheitert");
  return teile.length ? teile.join(" · ") : null;
}

export function ZahlungsfallAkte({
  fall,
  nachrichten,
  vorschlagBis,
  heute,
  spaetestens,
  grenze,
}: {
  fall: ZahlungsfallZeile;
  nachrichten: ZahlungsfallNachricht[];
  vorschlagBis: string;
  heute: string;
  spaetestens: string;
  grenze: number;
}) {
  return (
    <Stack spacing={5}>
      <Link href="/admin/zahlungsstoerungen" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
        <HStack spacing={2} fontSize="14px" color="var(--cc-text-2)" _hover={{ color: "var(--cc-gold-light)" }}>
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
          <Text>Zurück zu den Zahlungsfällen</Text>
        </HStack>
      </Link>

      <Stack spacing={1}>
        <AdminLabel>Zahlungsfall{fall.probe ? " · Probe" : ""}</AdminLabel>
        <Box as="h1" fontSize={{ base: "22px", md: "26px" }} fontWeight={600} color="var(--cc-text)" lineHeight={1.2}>
          {fall.name ?? fall.email ?? `Konto ${fall.userId.slice(0, 8)}`}
        </Box>
        <Flex gap={3} wrap="wrap" fontSize="13px" color="var(--cc-text-2)">
          {fall.email ? <Text>{fall.email}</Text> : null}
          <Text>Tarif {fall.paket ?? fall.tier ?? "unbekannt"}</Text>
          <Text className="cc-num">Rechnung {fall.stripeInvoiceId}</Text>
          {!fall.discordVerknuepft ? (
            <Text color="var(--cc-gold-light)">kein Discord verknüpft, nur Mail</Text>
          ) : null}
        </Flex>
      </Stack>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        <Kennzahl label="Offener Betrag" wert={euro(fall.betragCents)} hinweis="laut Rechnung" />
        <Kennzahl label="Versuche" wert={String(fall.versuche)} hinweis="von Stripe" />
        <Kennzahl
          label="Zugang ruht ab"
          wert={fall.frist ? tagVon(fall.frist) : "keine Frist"}
          hinweis={`seit ${tagVon(fall.eroeffnetAm)}, ${fall.erinnerungen} von 2 Erinnerungen`}
        />
        <Kennzahl
          label="Aufschub"
          wert={fall.aufschubBis ? tagVon(fall.aufschubBis) : "keiner"}
          hinweis={fall.ueberfaellig ? "abgelaufen, der Nachtlauf beendet ihn" : fall.aufschubGrund ?? "nicht gestundet"}
        />
      </SimpleGrid>

      {fall.geschlossenAm ? (
        <Box {...adminInsetProps} px={4} py={3}>
          <Text fontSize="13px" color="var(--cc-text-2)">
            Geschlossen am {tagVon(fall.geschlossenAm)}: {fall.geschlossenGrund ?? "ohne Angabe"}. Eine Antwort geht trotzdem
            noch raus, und der Fall öffnet sich wieder, wenn der Kunde schreibt.
          </Text>
        </Box>
      ) : null}

      <Karte
        titel="Verlauf"
        erklaerung="Was der Kunde geschrieben hat, was wir geschickt haben, und was das System getan hat. Der Kunde antwortet über den Knopf „Antworten“ unter jeder Direktnachricht — frei getippte Antworten kann der Bot nicht lesen."
      >
        {nachrichten.length === 0 ? (
          <Box {...adminEmptyProps}>Noch keine Nachricht.</Box>
        ) : (
          <Stack spacing={3}>
            {nachrichten.map((n) => {
              const art =
                n.kanal === "system"
                  ? ZEILEN_ART.system
                  : n.kanal === "notiz"
                    ? ZEILEN_ART.notiz
                    : n.vonAdmin
                      ? ZEILEN_ART.wir
                      : ZEILEN_ART.kunde;
              const zu = zustellung(n);
              return (
                <Box key={n.id} {...(n.kanal === "system" ? {} : adminInsetProps)} px={n.kanal === "system" ? 1 : 4} py={3}>
                  <Flex gap={3} wrap="wrap" align="baseline" mb={1}>
                    <AdminLabel color={art.farbe}>{art.label}</AdminLabel>
                    <Text fontSize="12px" color="var(--cc-text-3)" className="cc-num">
                      {zeitVon(n.erstelltAm)}
                      {n.autorName ? ` · ${n.autorName}` : ""}
                    </Text>
                    {zu ? (
                      <Text fontSize="12px" color={n.zugestellt === false && n.mailGesendet !== true ? "var(--cc-danger)" : "var(--cc-text-3)"}>
                        {zu}
                      </Text>
                    ) : null}
                  </Flex>
                  <Text fontSize="14px" color="var(--cc-text-soft)" whiteSpace="pre-wrap" lineHeight={1.6}>
                    {n.text}
                  </Text>
                </Box>
              );
            })}
          </Stack>
        )}
      </Karte>

      <Karte
        titel="Handeln"
        erklaerung="Die Antwort geht als Discord-Direktnachricht mit Antworten-Knopf und per Mail an den Kunden. Der Aufschub hält Zugang und Rolle bis zur neuen Frist."
      >
        <ZahlungAktionen
          fallId={fall.id}
          offen={!fall.geschlossenAm}
          vorschlagBis={vorschlagBis}
          heute={heute}
          spaetestens={spaetestens}
          grenze={grenze}
        />
      </Karte>
    </Stack>
  );
}

/* ── Handlungen ────────────────────────────────────────────────────────────── */

/**
 * Antworten und Notiz sind Text. Der **Aufschub** hält einen Zugang aufrecht,
 * für den kein Geld geflossen ist, und steht deshalb in einem eigenen Block mit
 * eigenem Knopf. Die Antwort geht standardmässig raus; die interne Notiz
 * braucht den bewussten Griff — wer eine Notiz versehentlich verschickt, hat
 * einem Kunden „hat schon zweimal storniert" geschickt.
 */
function ZahlungAktionen({
  fallId,
  offen,
  vorschlagBis,
  heute,
  spaetestens,
  grenze,
}: {
  fallId: string;
  offen: boolean;
  vorschlagBis: string;
  heute: string;
  spaetestens: string;
  grenze: number;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [alsNotiz, setAlsNotiz] = useState(false);
  const [perMail, setPerMail] = useState(true);
  const [bis, setBis] = useState(vorschlagBis);
  const [grund, setGrund] = useState("");
  const [benachrichtigen, setBenachrichtigen] = useState(true);
  const [schliessGrund, setSchliessGrund] = useState("");
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweise, setHinweise] = useState<string[]>([]);

  async function ruf(aktion: string, koerper: Record<string, unknown>) {
    setLaeuft(aktion);
    setFehler(null);
    setHinweise([]);
    try {
      const antwort = await fetch("/api/admin/zahlungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion, fallId, ...koerper }),
      });
      const daten = (await antwort.json().catch(() => ({}))) as { ok?: boolean; error?: string; hinweise?: string[] };
      if (!antwort.ok || !daten.ok) {
        setFehler(daten.error ?? "Das hat nicht geklappt.");
        return false;
      }
      setHinweise(daten.hinweise ?? []);
      router.refresh();
      return true;
    } catch (err) {
      setFehler(`Die Anfrage kam nicht durch: ${(err as Error).message}`);
      return false;
    } finally {
      setLaeuft(null);
    }
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={3}>
        <FormLabel htmlFor="zf-text" {...adminFormLabelProps} m={0}>
          {alsNotiz ? "Interne Notiz — geht nicht an den Kunden" : "Antwort an den Kunden"}
        </FormLabel>
        <Textarea
          id="zf-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, grenze))}
          rows={5}
          placeholder={alsNotiz ? "Was wir uns hier merken wollen." : "Was der Kunde lesen soll."}
          {...adminInputProps}
        />
        <Flex gap={4} wrap="wrap" align="center">
          <Checkbox isChecked={alsNotiz} onChange={(e) => setAlsNotiz(e.target.checked)} size="sm">
            <Text fontSize="13px" color="var(--cc-text-2)">
              Nur intern
            </Text>
          </Checkbox>
          {!alsNotiz ? (
            <Checkbox isChecked={perMail} onChange={(e) => setPerMail(e.target.checked)} size="sm">
              <Text fontSize="13px" color="var(--cc-text-2)">
                Auch per Mail
              </Text>
            </Checkbox>
          ) : null}
          <Text fontSize="12px" color="var(--cc-text-3)" className="cc-num">
            {text.length} von {grenze} Zeichen
          </Text>
          <Button
            size="sm"
            variant={alsNotiz ? "line" : "gold"}
            isDisabled={!text.trim() || laeuft !== null}
            isLoading={laeuft === "antworten"}
            onClick={async () => {
              if (await ruf("antworten", { text, alsNotiz, perMail })) setText("");
            }}
          >
            {alsNotiz ? "Notiz speichern" : "Antwort schicken"}
          </Button>
        </Flex>
      </Stack>

      <Stack spacing={3} {...adminInsetProps} p={4}>
        <AdminLabel>Zahlungsaufschub</AdminLabel>
        <Text fontSize="13px" color="var(--cc-text-2)" maxW="72ch" lineHeight={1.55}>
          Bis zu diesem Tag behält die Person Zugang und Mitgliederrolle; erinnert und gesperrt wird nicht. War der Zugang
          schon gesperrt, wird er zurückgegeben. Bei Stripe ändert sich nichts: Die Rechnung bleibt offen. Läuft der
          Aufschub ab, ohne dass gezahlt wurde, sperrt der Nachtlauf wie am siebten Tag.
        </Text>
        <Flex gap={3} wrap="wrap" align="flex-end">
          <Box>
            <FormLabel htmlFor="zf-bis" {...adminFormLabelProps}>
              Zahlbar bis
            </FormLabel>
            <Input
              id="zf-bis"
              type="date"
              value={bis}
              min={heute}
              max={spaetestens}
              onChange={(e) => setBis(e.target.value)}
              size="sm"
              w="170px"
              {...adminInputProps}
            />
          </Box>
          <Box flex="1" minW="220px">
            <FormLabel htmlFor="zf-grund" {...adminFormLabelProps}>
              Grund, intern
            </FormLabel>
            <Input
              id="zf-grund"
              value={grund}
              onChange={(e) => setGrund(e.target.value.slice(0, 200))}
              size="sm"
              placeholder="Warum wir stunden"
              {...adminInputProps}
            />
          </Box>
        </Flex>
        <Flex gap={4} wrap="wrap" align="center">
          <Checkbox isChecked={benachrichtigen} onChange={(e) => setBenachrichtigen(e.target.checked)} size="sm">
            <Text fontSize="13px" color="var(--cc-text-2)">
              Kunden benachrichtigen
            </Text>
          </Checkbox>
          <Button
            size="sm"
            variant="line"
            isDisabled={!bis || laeuft !== null}
            isLoading={laeuft === "aufschub"}
            onClick={() => void ruf("aufschub", { bis, grund, benachrichtigen })}
          >
            Aufschub gewähren
          </Button>
        </Flex>
      </Stack>

      {offen ? (
        <Flex gap={3} wrap="wrap" align="flex-end">
          <Box flex="1" minW="220px">
            <FormLabel htmlFor="zf-schliessen" {...adminFormLabelProps}>
              Fall schliessen, Grund
            </FormLabel>
            <Input
              id="zf-schliessen"
              value={schliessGrund}
              onChange={(e) => setSchliessGrund(e.target.value.slice(0, 200))}
              size="sm"
              placeholder="Etwa: per Überweisung bezahlt"
              {...adminInputProps}
            />
          </Box>
          <Button
            size="sm"
            {...adminDangerButtonProps}
            isDisabled={!schliessGrund.trim() || laeuft !== null}
            isLoading={laeuft === "schliessen"}
            onClick={() => void ruf("schliessen", { grund: schliessGrund })}
          >
            Schliessen
          </Button>
        </Flex>
      ) : null}

      {fehler ? (
        <Alert status="error" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="13px">{fehler}</Text>
        </Alert>
      ) : null}

      {hinweise.map((h) => (
        <Alert key={h} status="warning" {...adminAlertProps("warning")}>
          <AlertIcon color={adminAlertIconColor("warning")} />
          <Text fontSize="13px">{h}</Text>
        </Alert>
      ))}
    </Stack>
  );
}
