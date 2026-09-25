"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  IconButton,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCount,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminChipProps,
  adminTableSx,
  type AdminTone,
} from "@/components/admin/adminUi";
import { TV_STATUS_LABEL, type TvStatus, type TvZugang } from "@/lib/tradingview/zugang";

type Eintrag = TvZugang & { name: string; email: string | null; zahlend: boolean };

type Filter = "freischalten" | "entziehen" | "aktiv" | "archiv";

const FILTER: { key: Filter; label: string; status: TvStatus[] }[] = [
  { key: "freischalten", label: "Freischalten", status: ["angefragt"] },
  { key: "entziehen", label: "Entziehen", status: ["entzug_offen"] },
  { key: "aktiv", label: "Aktiv", status: ["aktiv"] },
  { key: "archiv", label: "Archiv", status: ["entzogen"] },
];

const TON: Record<TvStatus, AdminTone> = {
  angefragt: "attention",
  aktiv: "success",
  entzug_offen: "danger",
  entzogen: "neutral",
};

function kurzZeit(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Der Name wird auf TradingView eingetippt — ein Klick kopiert ihn. */
function NameKopieren({ name }: { name: string }) {
  const { onCopy, hasCopied } = useClipboard(name);
  return (
    <HStack spacing={1}>
      <Text fontSize="sm" color="var(--cc-text)">
        {name}
      </Text>
      <Tooltip label={hasCopied ? "Kopiert" : "Namen kopieren"} hasArrow openDelay={200}>
        <IconButton
          aria-label="TradingView-Namen kopieren"
          icon={hasCopied ? <Check size={13} /> : <Copy size={13} />}
          size="xs"
          variant="ghost"
          color="var(--cc-text-2)"
          onClick={onCopy}
        />
      </Tooltip>
    </HStack>
  );
}

/**
 * Warteschlange der TradingView-Zugänge. Wie bei den Kündigungen: sehen, was
 * offen ist, auf TradingView erledigen, hier abhaken. Die Tabs zählen mit,
 * damit „Entziehen“ nicht übersehen wird — das ist der Teil, der Geld kostet,
 * wenn er liegen bleibt.
 */
export function AdminTradingViewManager() {
  const [items, setItems] = useState<Eintrag[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("freischalten");
  const [arbeitet, setArbeitet] = useState<string | null>(null);
  const toast = useToast();

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/tradingview", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; items?: Eintrag[]; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Laden.");
      setItems(json.items ?? []);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  const zaehler = useMemo(() => {
    const z: Record<Filter, number> = { freischalten: 0, entziehen: 0, aktiv: 0, archiv: 0 };
    for (const f of FILTER) z[f.key] = items.filter((i) => f.status.includes(i.status)).length;
    return z;
  }, [items]);

  const sichtbar = useMemo(() => {
    const status = FILTER.find((f) => f.key === filter)?.status ?? [];
    return items.filter((i) => status.includes(i.status));
  }, [items, filter]);

  async function abhaken(userId: string, aktion: "freigeben" | "entzogen") {
    setArbeitet(userId);
    try {
      const res = await fetch(`/api/admin/tradingview/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aktion }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; item?: TvZugang };
      if (!json.ok || !json.item) throw new Error(json.error ?? "Fehler beim Speichern.");
      const item = json.item;
      setItems((prev) => prev.map((i) => (i.user_id === userId ? { ...i, ...item } : i)));
    } catch (err) {
      toast({ title: "Fehler", description: (err as Error).message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setArbeitet(null);
    }
  }

  return (
    <>
      <HStack spacing={2} flexWrap="wrap">
        {FILTER.map((f) => (
          <Button key={f.key} {...adminChipProps(filter === f.key)} onClick={() => setFilter(f.key)}>
            {f.label}
            <AdminCount active={filter === f.key}>{zaehler[f.key]}</AdminCount>
          </Button>
        ))}
      </HStack>

      {fehler ? (
        <Alert status="error" {...adminAlertProps("error")} mt={4}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{fehler}</Text>
        </Alert>
      ) : null}

      <Box mt={5} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        {laedt ? (
          <Box p={8} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm">
              Lade TradingView-Zugänge…
            </Text>
          </Box>
        ) : sichtbar.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm">
              {filter === "freischalten"
                ? "Keine offenen Anfragen."
                : filter === "entziehen"
                  ? "Nichts zu entziehen."
                  : "Keine Einträge."}
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Mitglied", "TradingView-Name", "Status", "Zeitpunkte", ""].map((h) => (
                    <Th key={h || "aktion"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {sichtbar.map((z) => (
                  <Tr key={z.user_id} verticalAlign="top">
                    <Td>
                      <Stack spacing={0} maxW="260px">
                        <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                          {z.name}
                        </Text>
                        <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
                          {z.email ?? "—"}
                        </Text>
                        {!z.zahlend && (z.status === "angefragt" || z.status === "aktiv") ? (
                          <Text fontSize="11px" color="var(--cc-danger)">
                            Kein Plattformzugang mehr
                          </Text>
                        ) : null}
                      </Stack>
                    </Td>
                    <Td>
                      <NameKopieren name={z.tv_benutzername} />
                    </Td>
                    <Td>
                      <StatusPill tone={TON[z.status]}>{TV_STATUS_LABEL[z.status]}</StatusPill>
                    </Td>
                    <Td>
                      <Stack spacing={0} fontSize="xs" color="var(--cc-text-2)" className="cc-num">
                        <Text>Angefragt {kurzZeit(z.angefragt_am)}</Text>
                        {z.freigegeben_am ? <Text>Frei seit {kurzZeit(z.freigegeben_am)}</Text> : null}
                        {z.entzug_angefordert_am ? <Text>Zugang endete {kurzZeit(z.entzug_angefordert_am)}</Text> : null}
                        {z.entzogen_am ? <Text>Entzogen {kurzZeit(z.entzogen_am)}</Text> : null}
                      </Stack>
                    </Td>
                    <Td textAlign="right">
                      {z.status === "angefragt" ? (
                        <Button
                          variant="line"
                          size="xs"
                          whiteSpace="nowrap"
                          isLoading={arbeitet === z.user_id}
                          onClick={() => void abhaken(z.user_id, "freigeben")}
                        >
                          Freigeschaltet
                        </Button>
                      ) : z.status === "entzug_offen" || z.status === "aktiv" ? (
                        <Button
                          variant="line"
                          size="xs"
                          whiteSpace="nowrap"
                          isLoading={arbeitet === z.user_id}
                          onClick={() => void abhaken(z.user_id, "entzogen")}
                        >
                          Entzogen
                        </Button>
                      ) : null}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
        Jede neue Anfrage und jede Sammelmeldung aus dem Nachtlauf geht zusätzlich per Mail ans Team-Postfach und nach
        Slack. „Freigeschaltet“ bzw. „Entzogen“ erst klicken, nachdem es auf TradingView erledigt ist.
      </Text>
    </>
  );
}
