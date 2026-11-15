"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Collapse,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { Check, ChevronDown, ChevronUp, Copy, MailWarning, Phone, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCount,
  AdminLabel,
  StatusDot,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminChipProps,
  adminDangerButtonProps,
  adminEmptyProps,
  adminInputProps,
  adminModalHeaderProps,
  adminModalProps,
  adminOverlayProps,
  type AdminTone,
} from "@/components/admin/adminUi";
import { kanalLabel, type Kanal } from "@/config/training";
import type { BoardBewerbung } from "@/lib/training/board";

/**
 * Free-Kurs-Bewerbungen (`/training`) — aufgebaut wie `/admin/applications`:
 * Status-Reiter mit Zähler, Suche, je Bewerbung eine aufklappbare Karte mit den
 * Antworten und den beiden Entscheidungen. Annehmen = 30 Kalendertage Zugang +
 * A02, Ablehnen = A03, **endgültig** (eine Bewerbung je Konto). Annehmen geht erst
 * nach bestätigter E-Mail-Adresse.
 */

type Tab = "pruefen" | "unbestaetigt" | "angenommen" | "abgelehnt" | "alle";

const TABS: { id: Tab; label: string; passt: (b: BoardBewerbung) => boolean }[] = [
  { id: "pruefen", label: "Zu prüfen", passt: (b) => b.status === "offen" && Boolean(b.adresse_bestaetigt_am) },
  { id: "unbestaetigt", label: "Adresse unbestätigt", passt: (b) => b.status === "offen" && !b.adresse_bestaetigt_am },
  { id: "angenommen", label: "Angenommen", passt: (b) => b.status === "angenommen" },
  { id: "abgelehnt", label: "Abgelehnt", passt: (b) => b.status === "abgelehnt" },
  { id: "alle", label: "Alle", passt: () => true },
];

const FEHLER: Record<string, string> = {
  schon_entschieden: "Darüber wurde schon entschieden.",
  adresse_unbestaetigt: "Die E-Mail-Adresse ist noch nicht bestätigt.",
  zugang_fehlgeschlagen: "Der Zugang konnte nicht angelegt werden. Bitte noch einmal versuchen.",
};

function ton(b: BoardBewerbung): AdminTone {
  if (b.status === "angenommen") return "success";
  if (b.status === "abgelehnt") return "danger";
  return b.adresse_bestaetigt_am ? "attention" : "neutral";
}

function statusLabel(b: BoardBewerbung): string {
  if (b.status === "angenommen") return "Angenommen";
  if (b.status === "abgelehnt") return "Abgelehnt";
  return b.adresse_bestaetigt_am ? "Zu prüfen" : "Adresse unbestätigt";
}

const datumFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
function datum(iso: string | null): string {
  return iso ? datumFormat.format(new Date(iso)) : "—";
}

function vorWann(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 48) return `vor ${h} Std.`;
  return `vor ${Math.floor(h / 24)} Tagen`;
}

export function TrainingBewerbungen({
  bewerbungen: anfang,
  fragen,
  onAenderung,
}: {
  bewerbungen: BoardBewerbung[];
  fragen: readonly { id: string; frage: string }[];
  onAenderung?: (b: BoardBewerbung) => void;
}) {
  const [bewerbungen, setBewerbungen] = useState(anfang);
  const zuPruefen = bewerbungen.filter(TABS[0]!.passt).length;
  const [tab, setTab] = useState<Tab>(zuPruefen > 0 ? "pruefen" : "alle");
  const [suche, setSuche] = useState("");
  // Zu prüfende Bewerbungen stehen aufgeklappt da — Emre soll lesen, nicht klicken.
  const [offen, setOffen] = useState<Set<string>>(() => new Set(anfang.filter(TABS[0]!.passt).map((b) => b.id)));
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ablehnen, setAblehnen] = useState<BoardBewerbung | null>(null);
  const [notiz, setNotiz] = useState("");
  const toast = useToast();

  const sichtbar = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const passt = TABS.find((t) => t.id === tab)!.passt;
    return bewerbungen
      .filter((b) => passt(b) && (!q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q) || (b.telefon ?? "").includes(q)))
      .sort((a, b) => b.eingereicht_am.localeCompare(a.eingereicht_am));
  }, [bewerbungen, tab, suche]);

  const umschalten = (id: string) =>
    setOffen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const entscheide = async (b: BoardBewerbung, aktion: "annehmen" | "ablehnen", grund?: string) => {
    setLaeuft(b.id + aktion);
    setFehler(null);
    try {
      const res = await fetch(`/api/admin/training/bewerbungen/${b.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion, notiz: aktion === "ablehnen" ? grund : undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setFehler(FEHLER[json.error ?? ""] ?? json.error ?? `Fehler ${res.status}`);
        return false;
      }
      const neu: BoardBewerbung = {
        ...b,
        status: aktion === "annehmen" ? "angenommen" : "abgelehnt",
        geprueft_am: new Date().toISOString(),
        notiz: aktion === "ablehnen" ? grund || null : b.notiz,
      };
      setBewerbungen((alt) => alt.map((x) => (x.id === b.id ? neu : x)));
      onAenderung?.(neu);
      toast({
        status: "success",
        variant: "solid",
        position: "bottom-right",
        title: aktion === "annehmen" ? `${b.name} angenommen — 30 Tage frei, A02 ist raus.` : `${b.name} abgelehnt — A03 ist raus.`,
      });
      return true;
    } finally {
      setLaeuft(null);
    }
  };

  return (
    <Stack spacing={6}>
      <HStack spacing={2} flexWrap="wrap">
        {TABS.map((t) => {
          const aktiv = tab === t.id;
          return (
            <Button key={t.id} {...adminChipProps(aktiv)} onClick={() => setTab(t.id)}>
              {t.label}
              <AdminCount active={aktiv}>{bewerbungen.filter(t.passt).length}</AdminCount>
            </Button>
          );
        })}
      </HStack>

      <InputGroup maxW="360px">
        <InputLeftElement pointerEvents="none" color="var(--cc-text-3)">
          <Search size={16} />
        </InputLeftElement>
        <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Nach Name, E-Mail oder Telefon suchen…" {...adminInputProps} />
      </InputGroup>

      {fehler ? (
        <Alert status="error" variant="subtle" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{fehler}</Text>
        </Alert>
      ) : null}

      {sichtbar.length === 0 ? (
        <Box {...adminEmptyProps}>{tab === "pruefen" ? "Keine Bewerbung wartet auf eine Entscheidung." : "Keine Bewerbungen in dieser Ansicht."}</Box>
      ) : (
        <Stack spacing={3}>
          {sichtbar.map((b) => (
            <Karte
              key={b.id}
              b={b}
              fragen={fragen}
              istOffen={offen.has(b.id)}
              laeuft={laeuft}
              onUmschalten={() => umschalten(b.id)}
              onAnnehmen={() => void entscheide(b, "annehmen")}
              onAblehnen={() => {
                setNotiz("");
                setAblehnen(b);
              }}
            />
          ))}
        </Stack>
      )}

      <Modal isOpen={Boolean(ablehnen)} onClose={() => setAblehnen(null)} isCentered>
        <ModalOverlay {...adminOverlayProps} />
        <ModalContent {...adminModalProps} mx={3}>
          <ModalHeader {...adminModalHeaderProps}>Bewerbung ablehnen</ModalHeader>
          <ModalCloseButton color="var(--cc-text-2)" />
          <ModalBody>
            <Stack spacing={3}>
              <Text fontSize="sm" color="var(--cc-text-2)">
                {ablehnen?.name} bekommt sofort die Absage (A03). Das ist <b>endgültig</b> — je Konto gibt es nur eine Bewerbung.
              </Text>
              <Text fontSize="sm" color="var(--cc-text-2)">
                Der Grund ist nur intern sichtbar und taucht nicht in der E-Mail auf.
              </Text>
              <Textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Optionaler interner Grund…" {...adminInputProps} minH="110px" />
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" color="var(--cc-text-2)" onClick={() => setAblehnen(null)}>
              Abbrechen
            </Button>
            <Button
              {...adminDangerButtonProps}
              isLoading={Boolean(ablehnen && laeuft === ablehnen.id + "ablehnen")}
              loadingText="Ablehnen…"
              onClick={async () => {
                if (ablehnen && (await entscheide(ablehnen, "ablehnen", notiz.trim() || undefined))) setAblehnen(null);
              }}
            >
              Endgültig ablehnen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}

function Karte({
  b,
  fragen,
  istOffen,
  laeuft,
  onUmschalten,
  onAnnehmen,
  onAblehnen,
}: {
  b: BoardBewerbung;
  fragen: readonly { id: string; frage: string }[];
  istOffen: boolean;
  laeuft: string | null;
  onUmschalten: () => void;
  onAnnehmen: () => void;
  onAblehnen: () => void;
}) {
  const [kopiert, setKopiert] = useState(false);
  const beschaeftigt = laeuft?.startsWith(b.id) ?? false;
  return (
    <Box className={ADMIN_CARD_CLASS}>
      <HStack
        as="button"
        type="button"
        onClick={onUmschalten}
        aria-expanded={istOffen}
        w="full"
        px={4}
        py={3.5}
        spacing={4}
        align="center"
        justifyContent="space-between"
        textAlign="left"
        borderTopRadius="12px"
        borderBottomRadius={istOffen ? 0 : "12px"}
        transition="background-color 120ms ease"
        _hover={{ bg: "rgba(255, 255, 255, 0.02)" }}
      >
        <HStack spacing={3} align="center" flex="1" minW={0}>
          <StatusDot tone={ton(b)} />
          <Stack spacing={0.5} flex="1" minW={0}>
            <HStack spacing={2}>
              <Text fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                {b.name || "(Kein Name)"}
              </Text>
              <Text fontSize="xs" className="cc-num" color="var(--cc-text-2)" flexShrink={0}>
                · {vorWann(b.eingereicht_am)}
              </Text>
            </HStack>
            <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
              {b.email}
            </Text>
          </Stack>
        </HStack>
        <HStack spacing={2} flexShrink={0}>
          {b.kontakt_gewuenscht ? (
            <Box display={{ base: "none", md: "block" }}>
              <StatusPill tone="attention">Kontakt gewünscht</StatusPill>
            </Box>
          ) : null}
          <StatusPill tone={ton(b)}>{statusLabel(b)}</StatusPill>
          <Box color="var(--cc-text-2)">{istOffen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Box>
        </HStack>
      </HStack>

      <Collapse in={istOffen} animateOpacity>
        <Box px={5} pb={5} pt={4} borderTop="1px solid var(--cc-line)">
          <Stack spacing={5}>
            <Flex gap={{ base: 3, md: 6 }} wrap="wrap" fontSize="xs" color="var(--cc-text-2)">
              <Text>
                Eingereicht{" "}
                <Box as="span" className="cc-num" color="var(--cc-text)">
                  {datum(b.eingereicht_am)}
                </Box>
              </Text>
              <Text>
                Adresse{" "}
                {b.adresse_bestaetigt_am ? (
                  <Box as="span" className="cc-num" color="var(--cc-text)">
                    bestätigt {datum(b.adresse_bestaetigt_am)}
                  </Box>
                ) : (
                  <Box as="span" color="var(--cc-gold-light)">
                    noch nicht bestätigt
                  </Box>
                )}
              </Text>
              <Text>
                Herkunft{" "}
                <Box as="span" color="var(--cc-text)">
                  {kanalLabel[(b.kanal ?? "direkt") as Kanal] ?? b.kanal}
                </Box>
              </Text>
            </Flex>

            {b.kontakt_gewuenscht ? (
              <Flex
                align="center"
                gap={3}
                px={3}
                py={2.5}
                borderRadius="10px"
                bg="var(--cc-gold-wash)"
                border="1px solid rgba(212, 176, 128, 0.28)"
                wrap="wrap"
              >
                <Phone size={15} color="var(--cc-gold-light)" />
                <Text fontSize="sm" color="var(--cc-text)" flex="1" minW="200px">
                  Möchte kontaktiert werden{b.telefon ? ":" : " — keine Nummer angegeben."}{" "}
                  {b.telefon ? (
                    <Box as="a" href={`tel:${b.telefon.replace(/[^\d+]/g, "")}`} className="cc-num" color="var(--cc-gold-light)" fontWeight={500}>
                      {b.telefon}
                    </Box>
                  ) : null}
                </Text>
                {b.telefon ? (
                  <Button
                    size="xs"
                    variant="line"
                    leftIcon={kopiert ? <Check size={12} /> : <Copy size={12} />}
                    onClick={() =>
                      void navigator.clipboard.writeText(b.telefon!).then(() => {
                        setKopiert(true);
                        window.setTimeout(() => setKopiert(false), 1500);
                      })
                    }
                  >
                    {kopiert ? "Kopiert" : "Nummer kopieren"}
                  </Button>
                ) : null}
              </Flex>
            ) : null}

            {fragen.map((f) => (
              <Stack key={f.id} spacing={1}>
                <AdminLabel>{f.frage}</AdminLabel>
                <Text fontSize="sm" color="var(--cc-text)" whiteSpace="pre-wrap" lineHeight="1.6">
                  {b.antworten?.[f.id] || "—"}
                </Text>
              </Stack>
            ))}

            {b.status === "offen" ? (
              <Flex justify="flex-end" align="center" pt={2} gap={2} wrap="wrap">
                {!b.adresse_bestaetigt_am ? (
                  <HStack spacing={1.5} mr="auto" color="var(--cc-text-2)">
                    <MailWarning size={14} />
                    <Text fontSize="xs">Annehmen geht erst, wenn die E-Mail-Adresse bestätigt ist.</Text>
                  </HStack>
                ) : null}
                <Button {...adminDangerButtonProps} onClick={onAblehnen} isDisabled={beschaeftigt} leftIcon={<X size={16} />}>
                  Ablehnen
                </Button>
                <Button
                  variant="gold"
                  onClick={onAnnehmen}
                  isDisabled={!b.adresse_bestaetigt_am || (beschaeftigt && laeuft !== b.id + "annehmen")}
                  isLoading={laeuft === b.id + "annehmen"}
                  loadingText="Annehmen…"
                  leftIcon={<Check size={16} />}
                >
                  Annehmen · 30 Tage
                </Button>
              </Flex>
            ) : (
              <Stack spacing={1} pt={2}>
                <Text fontSize="xs" color="var(--cc-text-2)">
                  {b.status === "angenommen" ? "✓ Angenommen" : "✗ Abgelehnt"} am{" "}
                  <Box as="span" className="cc-num">
                    {datum(b.geprueft_am)}
                  </Box>
                </Text>
                {b.notiz ? (
                  <Text fontSize="xs" color="var(--cc-text-2)">
                    Interner Grund: {b.notiz}
                  </Text>
                ) : null}
              </Stack>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
