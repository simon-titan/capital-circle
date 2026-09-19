"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  Input,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCount,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminChipProps,
  adminInputProps,
  adminTableSx,
  type AdminTone,
} from "@/components/admin/adminUi";
import {
  erstattungFaelligBis,
  formatEingang,
  formatTag,
  GRENZEN,
  PLAN_LABEL,
  referenzAus,
  STATUS_LABEL,
  type WiderrufsStatus,
} from "@/lib/widerruf/shared";

interface Widerruf {
  id: string;
  eingegangen_am: string;
  name: string;
  email: string;
  bestaetigung_email: string;
  vertrag_bezeichnung: string | null;
  vertrag_angabe: string | null;
  user_id: string | null;
  eingeloggt: boolean;
  vertrag_plan: string | null;
  stripe_subscription_id: string | null;
  vertragsschluss_am: string | null;
  frist_ende: string | null;
  fristgerecht: boolean | null;
  status: WiderrufsStatus;
  pruef_hinweis: string | null;
  bestaetigung_gesendet_am: string | null;
  erledigt_am: string | null;
  erledigt_notiz: string | null;
}

const OFFEN: ReadonlySet<WiderrufsStatus> = new Set(["eingegangen", "manuell_pruefen"]);

const TON: Record<WiderrufsStatus, AdminTone> = {
  eingegangen: "attention",
  manuell_pruefen: "attention",
  erledigt: "neutral",
};

type Filter = "offen" | "alle";

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

/**
 * Leseliste der Widerrufe aus `/widerrufen` — gebaut wie die Kündigungsliste
 * (`AdminKuendigungenManager.tsx`): sehen, was offen ist, entscheiden, abhaken.
 * Beim Abhaken wird festgehalten, was entschieden wurde; die Erklärung selbst
 * bleibt als Beleg unverändert.
 */
export function AdminWiderrufeManager() {
  const [items, setItems] = useState<Widerruf[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("offen");
  const [offeneNotiz, setOffeneNotiz] = useState<string | null>(null);
  const [notiz, setNotiz] = useState("");
  const [markiert, setMarkiert] = useState<string | null>(null);
  const toast = useToast();

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/widerrufe", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; items?: Widerruf[]; error?: string };
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

  const offen = useMemo(() => items.filter((w) => OFFEN.has(w.status)), [items]);
  const sichtbar = filter === "offen" ? offen : items;

  async function erledigen(id: string) {
    setMarkiert(id);
    try {
      const res = await fetch(`/api/admin/widerrufe/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "erledigt", notiz }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        item?: { erledigt_am: string; erledigt_notiz: string | null };
      };
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Speichern.");
      setItems((prev) =>
        prev.map((w) =>
          w.id === id
            ? {
                ...w,
                status: "erledigt",
                erledigt_am: json.item?.erledigt_am ?? new Date().toISOString(),
                erledigt_notiz: json.item?.erledigt_notiz ?? null,
              }
            : w,
        ),
      );
      setOffeneNotiz(null);
      setNotiz("");
    } catch (err) {
      toast({ title: "Fehler", description: (err as Error).message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setMarkiert(null);
    }
  }

  return (
    <>
      <HStack spacing={2} flexWrap="wrap">
        <Button {...adminChipProps(filter === "offen")} onClick={() => setFilter("offen")}>
          Offen
          <AdminCount active={filter === "offen"}>{offen.length}</AdminCount>
        </Button>
        <Button {...adminChipProps(filter === "alle")} onClick={() => setFilter("alle")}>
          Alle
          <AdminCount active={filter === "alle"}>{items.length}</AdminCount>
        </Button>
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
              Lade Widerrufe…
            </Text>
          </Box>
        ) : sichtbar.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm">
              {filter === "offen" ? "Keine offenen Widerrufe." : "Noch keine Widerrufe über /widerrufen."}
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Eingang", "Person", "Vertrag", "Frist", "Status", ""].map((h) => (
                    <Th key={h || "aktion"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {sichtbar.map((w) => (
                  <Tr key={w.id} verticalAlign="top">
                    <Td>
                      <Text fontSize="sm" className="cc-num" color="var(--cc-text)" whiteSpace="nowrap">
                        {kurzZeit(w.eingegangen_am)}
                      </Text>
                      <Text
                        fontSize="xs"
                        className="cc-num"
                        color="var(--cc-text-3)"
                        title={formatEingang(w.eingegangen_am).komplett}
                      >
                        {referenzAus(w.id)}
                      </Text>
                    </Td>
                    <Td>
                      <Stack spacing={0} maxW="240px">
                        <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                          {w.name}
                        </Text>
                        <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
                          {w.email}
                        </Text>
                        {w.bestaetigung_email !== w.email ? (
                          <Text fontSize="xs" color="var(--cc-text-3)" noOfLines={1}>
                            Bestätigung an {w.bestaetigung_email}
                          </Text>
                        ) : null}
                        <Text fontSize="11px" color="var(--cc-text-3)">
                          {w.user_id ? (w.eingeloggt ? "Konto · eingeloggt" : "Konto zugeordnet") : "Kein Konto"}
                          {w.bestaetigung_gesendet_am ? "" : " · Bestätigung nicht versendet"}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>
                      <Stack spacing={0.5} maxW="240px">
                        <Text fontSize="sm" color="var(--cc-text)">
                          {w.vertrag_plan ? (PLAN_LABEL[w.vertrag_plan] ?? w.vertrag_plan) : "—"}
                        </Text>
                        {w.vertragsschluss_am ? (
                          <Text fontSize="xs" color="var(--cc-text-2)">
                            Abgeschlossen {formatTag(w.vertragsschluss_am)}
                          </Text>
                        ) : null}
                        {w.vertrag_angabe ? (
                          <Text fontSize="xs" color="var(--cc-text-3)" noOfLines={2} title={w.vertrag_angabe}>
                            Angabe: {w.vertrag_angabe}
                          </Text>
                        ) : null}
                        {w.stripe_subscription_id ? (
                          <Text fontSize="11px" className="cc-num" color="var(--cc-text-3)" noOfLines={1}>
                            {w.stripe_subscription_id}
                          </Text>
                        ) : null}
                      </Stack>
                    </Td>
                    <Td>
                      <Stack spacing={1} maxW="200px" align="flex-start">
                        {w.fristgerecht === null ? (
                          <StatusPill tone="neutral">Unbekannt</StatusPill>
                        ) : w.fristgerecht ? (
                          <StatusPill tone="success">In der Frist</StatusPill>
                        ) : (
                          <StatusPill tone="danger">Nach der Frist</StatusPill>
                        )}
                        {w.frist_ende ? (
                          <Text fontSize="xs" color="var(--cc-text-2)">
                            Frist bis {formatTag(w.frist_ende)}
                          </Text>
                        ) : null}
                        {OFFEN.has(w.status) ? (
                          <Text fontSize="xs" color="var(--cc-text-3)">
                            Erstattung bis {formatTag(erstattungFaelligBis(w.eingegangen_am))}
                          </Text>
                        ) : null}
                      </Stack>
                    </Td>
                    <Td>
                      <Stack spacing={1} maxW="300px" align="flex-start">
                        <StatusPill tone={TON[w.status]}>{STATUS_LABEL[w.status]}</StatusPill>
                        {w.pruef_hinweis ? (
                          <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={5} title={w.pruef_hinweis}>
                            {w.pruef_hinweis}
                          </Text>
                        ) : null}
                        {w.status === "erledigt" ? (
                          <Text fontSize="11px" color="var(--cc-text-3)">
                            erledigt {kurzZeit(w.erledigt_am)}
                            {w.erledigt_notiz ? ` · ${w.erledigt_notiz}` : ""}
                          </Text>
                        ) : null}
                      </Stack>
                    </Td>
                    <Td textAlign="right">
                      {OFFEN.has(w.status) ? (
                        offeneNotiz === w.id ? (
                          <Stack spacing={2} minW="220px" align="stretch">
                            <Input
                              {...adminInputProps}
                              size="sm"
                              autoFocus
                              maxLength={GRENZEN.notizMax}
                              placeholder="Entscheidung, z. B. „voll erstattet“"
                              value={notiz}
                              onChange={(e) => setNotiz(e.target.value)}
                            />
                            <HStack spacing={2} justify="flex-end">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                  setOffeneNotiz(null);
                                  setNotiz("");
                                }}
                              >
                                Abbrechen
                              </Button>
                              <Button
                                variant="line"
                                size="xs"
                                isLoading={markiert === w.id}
                                onClick={() => void erledigen(w.id)}
                              >
                                Speichern
                              </Button>
                            </HStack>
                          </Stack>
                        ) : (
                          <Button
                            variant="line"
                            size="xs"
                            whiteSpace="nowrap"
                            onClick={() => {
                              setOffeneNotiz(w.id);
                              setNotiz("");
                            }}
                          >
                            Als erledigt markieren
                          </Button>
                        )
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
        Jeder Widerruf löst zusätzlich eine Mail an das Betreiber-Postfach aus. „Als erledigt markieren“ erst, nachdem
        der Kunde die Entscheidung per E-Mail bekommen hat; die Notiz hält fest, was entschieden wurde.
      </Text>
    </>
  );
}
