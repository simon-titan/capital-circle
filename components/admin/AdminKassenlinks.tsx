"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Grid,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
  useToast,
} from "@chakra-ui/react";
import { Copy, ExternalLink, Link2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  AdminCount,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminChipProps,
  adminDangerButtonProps,
  adminEmptyProps,
  adminFormLabelProps,
  adminInputProps,
  adminInsetProps,
  adminModalHeaderProps,
  adminModalProps,
  adminOptionStyle,
  adminOverlayProps,
  adminTableSx,
  type AdminTone,
} from "@/components/admin/adminUi";
import {
  CLOSER_AUSWAHL,
  KASSEN_PRODUKTE,
  KASSENLINK_GUELTIG_TAGE,
  PRODUKTE,
  erlaubteRaten,
  euro,
  rateCents,
  sollCents,
  zahlweiseText,
  type KassenProdukt,
} from "@/config/mentoring";
// Nur Typen: das Modul selbst zieht `node:crypto` und Stripe nach.
import type { KassenUebersicht, KassenlinkZeile, KaufWarnung, KaufZeile } from "@/lib/mentoring/admin";

/* ── Hilfen ─────────────────────────────────────────────────────────────── */

interface LeadTreffer {
  id: string;
  name: string | null;
  email: string | null;
  closer: string | null;
  closed: string | null;
  calendly_booked_at: string | null;
  created_at: string;
}

const EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Server-Fehlercodes aus `app/api/admin/kassenlinks` in lesbar. */
const FEHLERTEXT: Record<string, string> = {
  produkt_ungueltig: "Bitte ein Produkt wählen.",
  raten_ungueltig: "Diese Ratenzahl ist für das Produkt nicht erlaubt.",
  email_ungueltig: "Die E-Mail-Adresse sieht nicht gültig aus.",
  closer_ungueltig: "Unbekannter Closer.",
  lead_ungueltig: "Die Lead-ID ist ungültig.",
  lead_unbekannt: "Den verknüpften Lead gibt es nicht mehr.",
  gueltigkeit_ungueltig: "Gültigkeit: 1 bis 60 Tage.",
  kein_mentoring_konto:
    "Zu dieser E-Mail gibt es kein Konto mit Mentoring-Programm. Das Live-Abo setzt ein Programm voraus; bitte die E-Mail des bestehenden Kontos verwenden.",
  migration_fehlt: "Die Tabelle fehlt: Migration 108 ist noch nicht eingespielt.",
  nicht_offen: "Der Link ist nicht mehr offen (inzwischen bezahlt oder schon storniert).",
};

function fehlertext(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  return FEHLERTEXT[code] ?? code;
}

function datum(wert: string | null | undefined): string {
  if (!wert) return "—";
  return new Date(wert).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

function closerName(id: string | null | undefined): string {
  if (!id) return "—";
  return CLOSER_AUSWAHL.find((c) => c.id === id)?.name ?? id;
}

/** „4 × 750 €", „Einmalzahlung", „Monatlich" — kurz für Tabellen. */
function zahlweiseKurz(produkt: KassenProdukt, raten: number, betragCents: number): string {
  if (produkt === "live") return "Monatlich";
  if (raten <= 1) return "Einmalzahlung";
  return `${raten} × ${euro(rateCents(betragCents, raten))}`;
}

/** Ausführlich, wie in der Vorschau und der Nachricht an den Kunden. */
function zahlweiseLang(produkt: KassenProdukt, raten: number, betragCents: number): string {
  if (produkt === "live") return `${euro(betragCents)} pro Monat, monatlich kündbar`;
  if (raten <= 1) return `Einmalzahlung, ${euro(betragCents)}`;
  return zahlweiseText(betragCents, raten);
}

async function kopiere(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Ohne sicheren Kontext (http im LAN) gibt es keine Clipboard-API.
    try {
      const feld = document.createElement("textarea");
      feld.value = text;
      feld.style.position = "fixed";
      feld.style.opacity = "0";
      document.body.appendChild(feld);
      feld.select();
      const ok = document.execCommand("copy");
      feld.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Vorformulierter Text für WhatsApp oder Mail. Bewusst schlicht und ohne
 * Emojis: Er geht von einer echten Person an einen Kunden, mit dem sie gerade
 * telefoniert hat, und soll sich auch so lesen.
 */
function nachrichtFuer(link: KassenlinkZeile): string {
  const produkt = PRODUKTE[link.produkt];
  const vorname = link.name?.trim().split(/\s+/)[0];
  const bis = new Date(link.gueltig_bis).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  });
  const absender = link.closer ? closerName(link.closer) : "Dein Capital-Circle-Team";
  return [
    vorname ? `Hallo ${vorname},` : "Hallo,",
    "",
    link.produkt === "live"
      ? "wie besprochen hier dein persönlicher Link für das Live-Trading-Abo:"
      : `wie besprochen hier dein persönlicher Link für das ${produkt.name}:`,
    link.url,
    "",
    `Zahlweise: ${zahlweiseLang(link.produkt, link.raten, link.betrag_cents)}`,
    `Der Link gilt bis zum ${bis}. Bezahlt wird sicher über Stripe, deinen Zugang bekommst du danach per Mail an ${link.email}.`,
    "",
    "Wenn du Fragen hast, melde dich jederzeit bei mir.",
    absender,
  ].join("\n");
}

const ZUSTAND_TON: Record<KassenlinkZeile["zustand"], { ton: AdminTone; text: string }> = {
  offen: { ton: "attention", text: "Offen" },
  bezahlt: { ton: "success", text: "Bezahlt" },
  storniert: { ton: "neutral", text: "Storniert" },
  abgelaufen: { ton: "neutral", text: "Abgelaufen" },
};

const KAUF_STATUS: Record<KaufZeile["status"], { ton: AdminTone; text: string }> = {
  aktiv: { ton: "attention", text: "Läuft" },
  vollstaendig: { ton: "success", text: "Vollständig" },
  beendet: { ton: "neutral", text: "Beendet" },
  erstattet: { ton: "neutral", text: "Erstattet" },
};

const WARNUNG: Record<KaufWarnung, { ton: AdminTone; text: string }> = {
  fehlgeschlagen: { ton: "danger", text: "Zahlung fehlgeschlagen" },
  abgebrochen: { ton: "danger", text: "Vor der letzten Rate beendet" },
  ueberfaellig: { ton: "danger", text: "Rate überfällig" },
  letzte_offen: { ton: "attention", text: "Letzte Rate offen" },
};

type LinkFilter = "alle" | "offen" | "bezahlt" | "beendet";

/* ── Hauptkomponente ────────────────────────────────────────────────────── */

export function AdminKassenlinks() {
  const toast = useToast();
  const [daten, setDaten] = useState<KassenUebersicht | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<KassenlinkZeile | null>(null);
  const [stornoZiel, setStornoZiel] = useState<KassenlinkZeile | null>(null);
  const [filter, setFilter] = useState<LinkFilter>("alle");
  const ergebnisRef = useRef<HTMLDivElement | null>(null);

  const laden = useCallback(async () => {
    setLaedt(true);
    setLadeFehler(null);
    try {
      const res = await fetch("/api/admin/kassenlinks", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; error?: string } & Partial<KassenUebersicht>;
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Laden.");
      setDaten({ links: json.links ?? [], kaeufe: json.kaeufe ?? [], fehlt: Boolean(json.fehlt) });
    } catch (err) {
      setLadeFehler((err as Error).message);
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  const melde = useCallback(
    async (text: string, was: string) => {
      const ok = await kopiere(text);
      toast({
        title: ok ? `${was} kopiert` : "Kopieren nicht möglich",
        description: ok ? undefined : "Bitte von Hand markieren und kopieren.",
        status: ok ? "success" : "error",
        duration: 2200,
        isClosable: true,
      });
    },
    [toast],
  );

  function angelegt(link: KassenlinkZeile) {
    setErgebnis(link);
    setDaten((d) => (d ? { ...d, links: [link, ...d.links] } : d));
    // Nach dem Rendern zum fertigen Link scrollen — dort geht es weiter.
    requestAnimationFrame(() => ergebnisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function storniert(link: KassenlinkZeile) {
    setDaten((d) => (d ? { ...d, links: d.links.map((l) => (l.id === link.id ? link : l)) } : d));
    if (ergebnis?.id === link.id) setErgebnis(null);
    toast({ title: "Kassenlink storniert", status: "info", duration: 2500, isClosable: true });
  }

  const links = daten?.links ?? [];
  const kaeufe = daten?.kaeufe ?? [];
  const zaehler: Record<LinkFilter, number> = {
    alle: links.length,
    offen: links.filter((l) => l.zustand === "offen").length,
    bezahlt: links.filter((l) => l.zustand === "bezahlt").length,
    beendet: links.filter((l) => l.zustand === "storniert" || l.zustand === "abgelaufen").length,
  };
  const gefiltert = links.filter((l) =>
    filter === "alle"
      ? true
      : filter === "beendet"
        ? l.zustand === "storniert" || l.zustand === "abgelaufen"
        : l.zustand === filter,
  );
  const auffaellig = kaeufe.filter((k) => k.warnung && k.warnung !== "letzte_offen").length;

  return (
    <Stack spacing={6}>
      {daten?.fehlt ? (
        <Alert status="warning" {...adminAlertProps("warning")}>
          <AlertIcon color={adminAlertIconColor("warning")} />
          <Text fontSize="14px">
            Die Tabellen <code>kassenlink</code> und <code>mentoring_kauf</code> fehlen. Migration 108 ist noch nicht
            eingespielt. Solange lassen sich keine Kassenlinks anlegen; das ist kein leerer Bestand, sondern eine fehlende
            Einrichtung.
          </Text>
        </Alert>
      ) : null}

      {ladeFehler ? (
        <Alert status="error" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="14px">Übersicht nicht ladbar: {ladeFehler}</Text>
        </Alert>
      ) : null}

      <AnlageFormular onAngelegt={angelegt} gesperrt={Boolean(daten?.fehlt)} />

      {ergebnis ? (
        <Box ref={ergebnisRef} scrollMarginTop="24px">
          <ErgebnisKarte link={ergebnis} onKopieren={melde} onSchliessen={() => setErgebnis(null)} />
        </Box>
      ) : null}

      {/* ── Liste der Kassenlinks ─────────────────────────────────────── */}
      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap" mb={4}>
          <AdminCardTitle>Kassenlinks</AdminCardTitle>
          <HStack spacing={2} wrap="wrap">
            {(
              [
                ["alle", "Alle"],
                ["offen", "Offen"],
                ["bezahlt", "Bezahlt"],
                ["beendet", "Storniert / abgelaufen"],
              ] as const
            ).map(([id, label]) => (
              <Button key={id} {...adminChipProps(filter === id)} onClick={() => setFilter(id)}>
                {label}
                <AdminCount active={filter === id}>{zaehler[id]}</AdminCount>
              </Button>
            ))}
          </HStack>
        </Flex>

        {laedt && !daten ? (
          <Text fontSize="14px" color="var(--cc-text-2)" py={8} textAlign="center">
            Lade Kassenlinks …
          </Text>
        ) : gefiltert.length === 0 ? (
          <Box {...adminEmptyProps}>
            {links.length === 0 ? "Noch keine Kassenlinks angelegt." : "Keine Kassenlinks in dieser Ansicht."}
          </Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Kunde", "Produkt", "Zahlweise", "Betrag", "Closer", "Status", "Erstellt", "Gültig bis", ""].map(
                    (h, i) => (
                      <Th key={`${h}-${i}`}>{h}</Th>
                    ),
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {gefiltert.map((l) => {
                  const z = ZUSTAND_TON[l.zustand];
                  return (
                    <Tr key={l.id}>
                      <Td maxW="260px">
                        <Text fontSize="14px" color="var(--cc-text)" noOfLines={1}>
                          {l.name || l.email}
                        </Text>
                        {l.name ? (
                          <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
                            {l.email}
                          </Text>
                        ) : null}
                        {l.notiz ? (
                          <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1} title={l.notiz}>
                            {l.notiz}
                          </Text>
                        ) : null}
                      </Td>
                      <Td whiteSpace="nowrap">{PRODUKTE[l.produkt].name}</Td>
                      <Td whiteSpace="nowrap" className="cc-num">
                        {zahlweiseKurz(l.produkt, l.raten, l.betrag_cents)}
                      </Td>
                      <Td whiteSpace="nowrap" className="cc-num" color="var(--cc-text)">
                        {l.produkt === "live" ? `${euro(l.betrag_cents)} / Monat` : euro(sollCents(l.betrag_cents, l.raten))}
                      </Td>
                      <Td whiteSpace="nowrap">{closerName(l.closer)}</Td>
                      <Td>
                        <StatusPill tone={z.ton}>{z.text}</StatusPill>
                      </Td>
                      <Td whiteSpace="nowrap" className="cc-num" color="var(--cc-text-3)" fontSize="13px">
                        {datum(l.erstellt_am)}
                      </Td>
                      <Td whiteSpace="nowrap" className="cc-num" color="var(--cc-text-3)" fontSize="13px">
                        {l.zustand === "bezahlt" ? `bezahlt ${datum(l.bezahlt_am)}` : datum(l.gueltig_bis)}
                      </Td>
                      <Td>
                        <HStack spacing={1} justify="flex-end">
                          {l.zustand === "offen" ? (
                            <IconButton
                              aria-label="Link kopieren"
                              title="Link kopieren"
                              icon={<Copy size={14} />}
                              size="xs"
                              variant="ghost"
                              color="var(--cc-text-2)"
                              _hover={{ color: "var(--cc-gold-light)", bg: "var(--cc-gold-wash)" }}
                              borderRadius="6px"
                              onClick={() => melde(l.url, "Link")}
                            />
                          ) : null}
                          {l.zustand === "offen" ? (
                            <Button
                              size="xs"
                              variant="ghost"
                              color="var(--cc-text-3)"
                              _hover={{ color: "var(--cc-danger)", bg: "rgba(248, 113, 113, 0.08)" }}
                              borderRadius="6px"
                              fontWeight={500}
                              onClick={() => setStornoZiel(l)}
                            >
                              Stornieren
                            </Button>
                          ) : null}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      {/* ── Käufe ─────────────────────────────────────────────────────── */}
      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap" mb={4}>
          <AdminCardTitle>Käufe</AdminCardTitle>
          {auffaellig > 0 ? (
            <StatusPill tone="danger">
              {auffaellig} {auffaellig === 1 ? "Kauf braucht" : "Käufe brauchen"} Aufmerksamkeit
            </StatusPill>
          ) : null}
        </Flex>

        {laedt && !daten ? (
          <Text fontSize="14px" color="var(--cc-text-2)" py={8} textAlign="center">
            Lade Käufe …
          </Text>
        ) : kaeufe.length === 0 ? (
          <Box {...adminEmptyProps}>Noch keine Mentoring-Käufe.</Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Kunde", "Produkt", "Zahlweise", "Bezahlt", "Status", "Gekauft", "Closer"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {kaeufe.map((k) => (
                  <KaufReihe key={k.id} kauf={k} />
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
        <Text fontSize="12px" color="var(--cc-text-3)" mt={3}>
          Geplatzte Raten laufen als Zahlungsfall unter{" "}
          <Box as="a" href="/admin/zahlungsstoerungen" color="var(--cc-text-2)" textDecoration="underline">
            Zahlungsstörungen
          </Box>{" "}
          mit Erinnerungen und Frist. „Überfällig“ heißt: weder Zahlung noch Zahlungsfall, obwohl die Rate seit drei Tagen
          fällig wäre. Das deutet auf einen verpassten Webhook und gehört in Stripe geprüft.
        </Text>
      </Box>

      <StornoModal ziel={stornoZiel} onClose={() => setStornoZiel(null)} onStorniert={storniert} />
    </Stack>
  );
}

/* ── Formular ───────────────────────────────────────────────────────────── */

function AnlageFormular({
  onAngelegt,
  gesperrt,
}: {
  onAngelegt: (link: KassenlinkZeile) => void;
  gesperrt: boolean;
}) {
  const [produkt, setProdukt] = useState<KassenProdukt>("main");
  const [raten, setRaten] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [closer, setCloser] = useState("");
  const [tage, setTage] = useState(String(KASSENLINK_GUELTIG_TAGE));
  const [notiz, setNotiz] = useState("");
  const [lead, setLead] = useState<LeadTreffer | null>(null);
  const [suche, setSuche] = useState("");
  const [treffer, setTreffer] = useState<LeadTreffer[]>([]);
  const [emailVorschlag, setEmailVorschlag] = useState<LeadTreffer | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [fehler, setFehler] = useState<{ email?: string; tage?: string }>({});

  const sucheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Nur die Antwort auf die jüngste Anfrage zählt — ältere kommen manchmal später an.
  const sucheNr = useRef(0);
  const emailNr = useRef(0);

  const def = PRODUKTE[produkt];
  const istLive = produkt === "live";

  async function holeLeads(q: string): Promise<LeadTreffer[]> {
    try {
      const res = await fetch(`/api/admin/kassenlinks/leads?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; items?: LeadTreffer[] } | null;
      return json?.ok ? (json.items ?? []) : [];
    } catch {
      return [];
    }
  }

  function sucheAendern(wert: string) {
    setSuche(wert);
    if (sucheTimer.current) clearTimeout(sucheTimer.current);
    const q = wert.trim();
    if (q.length < 2) {
      setTreffer([]);
      return;
    }
    const nr = ++sucheNr.current;
    sucheTimer.current = setTimeout(async () => {
      const items = await holeLeads(q);
      if (nr === sucheNr.current) setTreffer(items);
    }, 250);
  }

  /*
    Tippt der Closer die E-Mail direkt ein, schlagen wir den passenden Lead von
    selbst vor — aber nur bei exakt gleicher Adresse. Ein Teiltreffer wäre an
    dieser Stelle eher Verwechslung als Hilfe.
  */
  function emailAendern(wert: string) {
    setEmail(wert);
    setFehler((f) => ({ ...f, email: undefined }));
    if (emailTimer.current) clearTimeout(emailTimer.current);
    const gesucht = wert.trim().toLowerCase();
    if (lead || !EMAIL_MUSTER.test(gesucht)) {
      setEmailVorschlag(null);
      return;
    }
    const nr = ++emailNr.current;
    emailTimer.current = setTimeout(async () => {
      const items = await holeLeads(gesucht);
      if (nr !== emailNr.current) return;
      setEmailVorschlag(items.find((l) => l.email?.trim().toLowerCase() === gesucht) ?? null);
    }, 400);
  }

  function waehleLead(l: LeadTreffer) {
    setLead(l);
    setTreffer([]);
    setSuche("");
    setEmailVorschlag(null);
    // Nur leere Felder füllen — was der Closer schon getippt hat, gilt.
    if (!email.trim() && l.email) setEmail(l.email);
    if (!name.trim() && l.name) setName(l.name);
    if (!closer && l.closer && CLOSER_AUSWAHL.some((c) => c.id === l.closer)) setCloser(l.closer);
  }

  function produktAendern(p: KassenProdukt) {
    setProdukt(p);
    if (!erlaubteRaten(p).includes(raten)) setRaten(1);
  }

  function zuruecksetzen() {
    setEmail("");
    setName("");
    setNotiz("");
    setLead(null);
    setEmailVorschlag(null);
    setRaten(1);
    setTage(String(KASSENLINK_GUELTIG_TAGE));
    setFehler({});
  }

  async function absenden() {
    const f: { email?: string; tage?: string } = {};
    if (!EMAIL_MUSTER.test(email.trim())) f.email = "Bitte eine gültige E-Mail-Adresse eingeben.";
    const t = Number(tage);
    if (!Number.isInteger(t) || t < 1 || t > 60) f.tage = "1 bis 60 Tage.";
    setFehler(f);
    if (Object.keys(f).length) return;

    setSpeichert(true);
    setServerFehler(null);
    try {
      const res = await fetch("/api/admin/kassenlinks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          produkt,
          raten: istLive ? 1 : raten,
          email: email.trim(),
          name: name.trim() || null,
          closer: closer || null,
          lead_id: lead?.id ?? null,
          gueltig_tage: t,
          notiz: notiz.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; item?: KassenlinkZeile } | null;
      if (!json?.ok || !json.item) {
        setServerFehler(fehlertext(json?.error, "Der Kassenlink konnte nicht angelegt werden."));
        return;
      }
      onAngelegt(json.item);
      zuruecksetzen();
    } catch {
      setServerFehler("Keine Verbindung zum Server. Bitte noch einmal versuchen.");
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <AdminCardTitle mb={5}>Kassenlink anlegen</AdminCardTitle>

      <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1.6fr) minmax(0, 1fr)" }} gap={{ base: 6, xl: 8 }}>
        <Stack spacing={4}>
          {/* Lead zuerst: Wer ihn wählt, bekommt E-Mail, Name und Closer gleich mit. */}
          <FormControl>
            <FormLabel {...adminFormLabelProps}>Lead (optional)</FormLabel>
            {lead ? (
              <Flex align="center" gap={3} px={3} py={2} {...adminInsetProps}>
                <Box flex="1" minW={0}>
                  <Text fontSize="14px" color="var(--cc-text)" noOfLines={1}>
                    {lead.name || lead.email || "Lead ohne Namen"}
                  </Text>
                  <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
                    {[lead.email, lead.closer ? `Closer ${closerName(lead.closer)}` : null, `seit ${datum(lead.created_at)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </Box>
                <IconButton
                  aria-label="Lead-Verknüpfung entfernen"
                  icon={<X size={14} />}
                  size="xs"
                  variant="ghost"
                  color="var(--cc-text-3)"
                  _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.05)" }}
                  onClick={() => setLead(null)}
                />
              </Flex>
            ) : (
              <Box position="relative">
                <Box
                  position="absolute"
                  left="12px"
                  top="50%"
                  transform="translateY(-50%)"
                  color="var(--cc-text-3)"
                  pointerEvents="none"
                  zIndex={1}
                  display="flex"
                >
                  <Search size={15} />
                </Box>
                <Input
                  value={suche}
                  onChange={(e) => sucheAendern(e.target.value)}
                  placeholder="Name oder E-Mail aus dem Discord-Funnel suchen"
                  pl="36px"
                  {...adminInputProps}
                />
                {treffer.length > 0 ? (
                  <Stack
                    as="ul"
                    listStyleType="none"
                    spacing={0}
                    mt={1.5}
                    py={1}
                    maxH="260px"
                    overflowY="auto"
                    bg="var(--cc-panel-solid)"
                    border="1px solid var(--cc-line-strong)"
                    borderRadius="8px"
                  >
                    {treffer.map((l) => (
                      <Box as="li" key={l.id}>
                        <Box
                          as="button"
                          type="button"
                          w="100%"
                          textAlign="left"
                          px={3}
                          py={2}
                          _hover={{ bg: "rgba(255, 255, 255, 0.04)" }}
                          _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "-2px" }}
                          onClick={() => waehleLead(l)}
                        >
                          <Text fontSize="14px" color="var(--cc-text)" noOfLines={1}>
                            {l.name || "Ohne Namen"}
                          </Text>
                          <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
                            {[l.email, l.closer ? closerName(l.closer) : null, datum(l.created_at)].filter(Boolean).join(" · ")}
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                ) : null}
              </Box>
            )}
          </FormControl>

          <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }} gap={4}>
            <FormControl isRequired>
              <FormLabel {...adminFormLabelProps}>Produkt</FormLabel>
              <Select value={produkt} onChange={(e) => produktAendern(e.target.value as KassenProdukt)} {...adminInputProps}>
                {KASSEN_PRODUKTE.map((p) => (
                  <option key={p} value={p} style={adminOptionStyle}>
                    {PRODUKTE[p].name} · {p === "live" ? `${euro(PRODUKTE[p].preisCents)} / Monat` : euro(PRODUKTE[p].preisCents)}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel {...adminFormLabelProps}>Zahlweise</FormLabel>
              {istLive ? (
                <Flex h="40px" align="center" px={3} fontSize="14px" color="var(--cc-text-2)" {...adminInsetProps}>
                  Monatlich, jederzeit kündbar
                </Flex>
              ) : (
                <Select value={raten} onChange={(e) => setRaten(Number(e.target.value))} {...adminInputProps}>
                  {erlaubteRaten(produkt).map((n) => (
                    <option key={n} value={n} style={adminOptionStyle}>
                      {n === 1
                        ? `Einmalzahlung · ${euro(def.preisCents)}`
                        : `${n} Monatsraten à ${euro(rateCents(def.preisCents, n))}`}
                    </option>
                  ))}
                </Select>
              )}
            </FormControl>

            <FormControl isRequired isInvalid={Boolean(fehler.email)}>
              <FormLabel {...adminFormLabelProps}>E-Mail des Kunden</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => emailAendern(e.target.value)}
                placeholder="name@beispiel.de"
                autoComplete="off"
                {...adminInputProps}
              />
              {fehler.email ? (
                <FormErrorMessage color="var(--cc-danger)">{fehler.email}</FormErrorMessage>
              ) : emailVorschlag && !lead ? (
                <Flex mt={2} align="center" gap={2} wrap="wrap" fontSize="13px" color="var(--cc-text-2)">
                  <Text as="span">
                    Passender Lead: <Box as="span" color="var(--cc-text)">{emailVorschlag.name || emailVorschlag.email}</Box>
                  </Text>
                  <Button size="xs" variant="line" onClick={() => waehleLead(emailVorschlag)}>
                    Verknüpfen
                  </Button>
                </Flex>
              ) : (
                <FormHelperText color="var(--cc-text-3)" fontSize="12px">
                  Auf diese Adresse entsteht das Konto. Bitte genau so, wie der Kunde sich anmelden will.
                </FormHelperText>
              )}
            </FormControl>

            <FormControl>
              <FormLabel {...adminFormLabelProps}>Name</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" {...adminInputProps} />
            </FormControl>

            <FormControl>
              <FormLabel {...adminFormLabelProps}>Closer</FormLabel>
              <Select value={closer} onChange={(e) => setCloser(e.target.value)} {...adminInputProps}>
                <option value="" style={adminOptionStyle}>
                  Kein Closer
                </option>
                {CLOSER_AUSWAHL.map((c) => (
                  <option key={c.id} value={c.id} style={adminOptionStyle}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isInvalid={Boolean(fehler.tage)}>
              <FormLabel {...adminFormLabelProps}>Gültig (Tage)</FormLabel>
              <Input
                type="number"
                min={1}
                max={60}
                value={tage}
                onChange={(e) => setTage(e.target.value)}
                className="cc-num"
                {...adminInputProps}
              />
              <FormErrorMessage color="var(--cc-danger)">{fehler.tage}</FormErrorMessage>
            </FormControl>
          </Grid>

          <FormControl>
            <FormLabel {...adminFormLabelProps}>Notiz (intern)</FormLabel>
            <Textarea
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              rows={2}
              placeholder="z. B. will erst nach dem Gehalt am 1. zahlen"
              resize="vertical"
              {...adminInputProps}
            />
          </FormControl>
        </Stack>

        {/* ── Vorschau ─────────────────────────────────────────────────── */}
        <Stack spacing={4} p={{ base: 4, md: 5 }} {...adminInsetProps} alignSelf="start">
          <Text fontSize="12px" fontWeight={500} letterSpacing="0.06em" textTransform="uppercase" color="var(--cc-text-2)">
            Das sieht der Kunde
          </Text>
          <Box>
            <Text fontSize="18px" fontWeight={600} color="var(--cc-text)">
              {def.name}
            </Text>
            {name.trim() ? (
              <Text fontSize="14px" color="var(--cc-text-2)">
                Für {name.trim()}
              </Text>
            ) : null}
          </Box>
          <Box>
            <Text fontSize="28px" fontWeight={600} letterSpacing="-0.02em" className="cc-num" color="var(--cc-text)">
              {istLive ? euro(def.preisCents) : raten > 1 ? euro(rateCents(def.preisCents, raten)) : euro(def.preisCents)}
              {istLive || raten > 1 ? (
                <Box as="span" fontSize="15px" fontWeight={400} color="var(--cc-text-2)" ml={1.5}>
                  / Monat
                </Box>
              ) : null}
            </Text>
            <Text fontSize="14px" color="var(--cc-text-2)" className="cc-num">
              {zahlweiseLang(produkt, istLive ? 1 : raten, def.preisCents)}
            </Text>
          </Box>
          <Text fontSize="13px" color="var(--cc-text-3)" lineHeight={1.55}>
            {istLive
              ? "Verlängert den Live-Bereich eines bestehenden Programms. Setzt ein Konto mit Mentoring-Programm auf dieser E-Mail voraus."
              : raten > 1
                ? `Ohne Aufschlag. Die Ratenzahlung endet nach der ${raten}. Rate von selbst. Live-Zugang ${def.liveMonate} Monate.`
                : `Einmalzahlung ohne Verlängerung. Live-Zugang ${def.liveMonate} Monate, Plattform dauerhaft.`}
          </Text>

          {serverFehler ? (
            <Alert status="error" {...adminAlertProps("error")}>
              <AlertIcon color={adminAlertIconColor("error")} />
              <Text fontSize="14px">{serverFehler}</Text>
            </Alert>
          ) : null}

          <Button
            variant="gold"
            leftIcon={<Link2 size={16} />}
            onClick={absenden}
            isLoading={speichert}
            loadingText="Wird angelegt …"
            isDisabled={gesperrt}
          >
            Kassenlink anlegen
          </Button>
        </Stack>
      </Grid>
    </Box>
  );
}

/* ── Fertiger Link ──────────────────────────────────────────────────────── */

function ErgebnisKarte({
  link,
  onKopieren,
  onSchliessen,
}: {
  link: KassenlinkZeile;
  onKopieren: (text: string, was: string) => void;
  onSchliessen: () => void;
}) {
  const nachricht = nachrichtFuer(link);
  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} borderColor="var(--cc-gold-line)">
      <Flex justify="space-between" align="flex-start" gap={3} mb={4}>
        <Box>
          <AdminCardTitle color="var(--cc-gold-light)">Kassenlink bereit</AdminCardTitle>
          <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
            {PRODUKTE[link.produkt].name} für {link.name || link.email} ·{" "}
            {zahlweiseLang(link.produkt, link.raten, link.betrag_cents)} · gültig bis {datum(link.gueltig_bis)}
          </Text>
        </Box>
        <IconButton
          aria-label="Schließen"
          icon={<X size={16} />}
          size="sm"
          variant="ghost"
          color="var(--cc-text-3)"
          _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.05)" }}
          onClick={onSchliessen}
        />
      </Flex>

      <Box px={4} py={3.5} {...adminInsetProps} borderColor="rgba(212, 176, 128, 0.32)">
        <Text
          fontSize={{ base: "16px", md: "20px" }}
          fontWeight={500}
          color="var(--cc-gold-light)"
          className="cc-num"
          wordBreak="break-all"
          lineHeight={1.4}
        >
          {link.url}
        </Text>
      </Box>

      <HStack spacing={2} mt={3} wrap="wrap">
        <Button variant="gold" size="sm" leftIcon={<Copy size={15} />} onClick={() => onKopieren(link.url, "Link")}>
          Link kopieren
        </Button>
        {/* Öffnen ist ein gewöhnlicher Seitenaufruf: Die Kassenseite legt erst
            beim Klick auf ihren Knopf eine Stripe-Kasse an, nicht beim Ansehen. */}
        <Button
          as="a"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          variant="line"
          size="sm"
          leftIcon={<ExternalLink size={15} />}
        >
          Kassenseite ansehen
        </Button>
      </HStack>

      <Box mt={6}>
        <Flex justify="space-between" align="center" gap={3} mb={2} wrap="wrap">
          <Text fontSize="12px" fontWeight={500} letterSpacing="0.06em" textTransform="uppercase" color="var(--cc-text-2)">
            Nachricht für WhatsApp oder Mail
          </Text>
          <Button variant="line" size="xs" leftIcon={<Copy size={13} />} onClick={() => onKopieren(nachricht, "Text")}>
            Text kopieren
          </Button>
        </Flex>
        <Textarea value={nachricht} readOnly rows={11} fontSize="14px" lineHeight={1.55} resize="vertical" {...adminInputProps} />
      </Box>
    </Box>
  );
}

/* ── Käufe ──────────────────────────────────────────────────────────────── */

function KaufReihe({ kauf: k }: { kauf: KaufZeile }) {
  const status = KAUF_STATUS[k.status];
  const warnung = k.warnung ? WARNUNG[k.warnung] : null;

  let zahlweise: string;
  let bezahlt: string;
  if (k.zahlweise === "raten") {
    zahlweise = `${k.ratenGesamt ?? "?"} × ${k.rateCents ? euro(k.rateCents) : "?"}`;
    bezahlt = `${k.ratenBezahlt} / ${k.ratenGesamt ?? "?"}`;
  } else if (k.zahlweise === "abo") {
    zahlweise = "Monatsabo";
    bezahlt = `${k.ratenBezahlt} ${k.ratenBezahlt === 1 ? "Monat" : "Monate"}`;
  } else {
    zahlweise = "Einmalzahlung";
    bezahlt = k.sollCents ? euro(k.sollCents) : "bezahlt";
  }

  return (
    <Tr bg={warnung?.ton === "danger" ? "rgba(248, 113, 113, 0.04)" : undefined}>
      <Td maxW="260px">
        <Text fontSize="14px" color="var(--cc-text)" noOfLines={1}>
          {k.name || k.email || "—"}
        </Text>
        {k.name && k.email ? (
          <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
            {k.email}
          </Text>
        ) : null}
      </Td>
      <Td whiteSpace="nowrap">{PRODUKTE[k.produkt].name}</Td>
      <Td whiteSpace="nowrap" className="cc-num">
        {zahlweise}
      </Td>
      <Td whiteSpace="nowrap">
        <Text fontSize="14px" className="cc-num" color="var(--cc-text)">
          {bezahlt}
        </Text>
        {k.naechsteRateAm ? (
          <Text fontSize="12px" className="cc-num" color="var(--cc-text-3)">
            nächste {datum(k.naechsteRateAm)}
          </Text>
        ) : null}
      </Td>
      <Td>
        <Stack spacing={1} align="flex-start">
          <StatusPill tone={status.ton}>{status.text}</StatusPill>
          {warnung ? (
            <StatusPill tone={warnung.ton} title={k.zahlungsfall?.frist ? `Frist ${datum(k.zahlungsfall.frist)}` : undefined}>
              {warnung.text}
            </StatusPill>
          ) : null}
        </Stack>
      </Td>
      <Td whiteSpace="nowrap" className="cc-num" color="var(--cc-text-3)" fontSize="13px">
        {datum(k.gekauftAm)}
      </Td>
      <Td whiteSpace="nowrap">{closerName(k.closer)}</Td>
    </Tr>
  );
}

/* ── Stornieren ─────────────────────────────────────────────────────────── */

function StornoModal({
  ziel,
  onClose,
  onStorniert,
}: {
  ziel: KassenlinkZeile | null;
  onClose: () => void;
  onStorniert: (link: KassenlinkZeile) => void;
}) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  function schliessen() {
    setFehler(null);
    onClose();
  }

  async function stornieren() {
    if (!ziel) return;
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch(`/api/admin/kassenlinks/${ziel.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aktion: "stornieren" }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; item?: KassenlinkZeile } | null;
      if (!json?.ok || !json.item) {
        setFehler(fehlertext(json?.error, "Stornieren fehlgeschlagen."));
        return;
      }
      onStorniert(json.item);
      schliessen();
    } catch {
      setFehler("Keine Verbindung zum Server.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Modal isOpen={Boolean(ziel)} onClose={schliessen} size="sm" isCentered>
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent {...adminModalProps} mx={4}>
        <ModalHeader pt={6} pb={2} {...adminModalHeaderProps}>
          Kassenlink stornieren?
        </ModalHeader>
        <ModalBody pb={2}>
          <Stack spacing={3}>
            <Text fontSize="14px" color="var(--cc-text-2)" lineHeight={1.65}>
              Der Link für{" "}
              <Box as="span" color="var(--cc-text)">
                {ziel?.name || ziel?.email}
              </Box>{" "}
              ({ziel ? PRODUKTE[ziel.produkt].name : ""}) funktioniert danach nicht mehr. Eine bereits geöffnete
              Stripe-Kasse wird mit abgebrochen. Für ein neues Angebot einfach einen neuen Link anlegen.
            </Text>
            {fehler ? (
              <Alert status="error" {...adminAlertProps("error")}>
                <AlertIcon color={adminAlertIconColor("error")} />
                <Text fontSize="14px">{fehler}</Text>
              </Alert>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5}>
          <Button variant="ghost" onClick={schliessen} color="var(--cc-text-2)">
            Abbrechen
          </Button>
          <Button {...adminDangerButtonProps} onClick={stornieren} isLoading={laeuft} loadingText="Storniert …">
            Stornieren
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
