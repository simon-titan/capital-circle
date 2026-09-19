"use client";

import { Alert, AlertIcon, Box, Button, HStack, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, useToast } from "@chakra-ui/react";
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
import {
  formatEingang,
  formatTag,
  PLAN_LABEL,
  referenzAus,
  STATUS_LABEL,
  type KuendigungsStatus,
} from "@/lib/kuendigung/shared";

interface Kuendigung {
  id: string;
  eingegangen_am: string;
  name: string;
  email: string;
  bestaetigung_email: string;
  user_id: string | null;
  eingeloggt: boolean;
  art: "ordentlich" | "ausserordentlich";
  grund: string | null;
  zeitpunkt_wunsch: string | null;
  vertrag_angabe: string | null;
  vertrag_plan: string | null;
  stripe_subscription_id: string | null;
  wirksam_zum: string | null;
  status: KuendigungsStatus;
  pruef_hinweis: string | null;
  ausgefuehrt_am: string | null;
  erledigt_am: string | null;
  bestaetigung_gesendet_am: string | null;
}

const OFFEN: ReadonlySet<KuendigungsStatus> = new Set(["eingegangen", "manuell_pruefen", "kein_vertrag"]);

const TON: Record<KuendigungsStatus, AdminTone> = {
  eingegangen: "attention",
  manuell_pruefen: "attention",
  kein_vertrag: "attention",
  ausgefuehrt: "success",
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
 * Leseliste der Kündigungen aus `/kuendigen` — schlank mit Absicht: sehen,
 * was offen ist, und es abhaken. Bearbeitet wird die Kündigung selbst bei
 * Stripe bzw. per Mail an den Kunden; die Zeile ist der Beleg und bleibt
 * inhaltlich unverändert.
 */
export function AdminKuendigungenManager() {
  const [items, setItems] = useState<Kuendigung[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("offen");
  const [markiert, setMarkiert] = useState<string | null>(null);
  const toast = useToast();

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/kuendigungen", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; items?: Kuendigung[]; error?: string };
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

  const offen = useMemo(() => items.filter((k) => OFFEN.has(k.status)), [items]);
  const sichtbar = filter === "offen" ? offen : items;

  async function erledigen(id: string) {
    setMarkiert(id);
    try {
      const res = await fetch(`/api/admin/kuendigungen/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "erledigt" }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; item?: { erledigt_am: string } };
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Speichern.");
      setItems((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, status: "erledigt", erledigt_am: json.item?.erledigt_am ?? new Date().toISOString() } : k,
        ),
      );
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
              Lade Kündigungen…
            </Text>
          </Box>
        ) : sichtbar.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm">
              {filter === "offen" ? "Keine offenen Kündigungen." : "Noch keine Kündigungen über /kuendigen."}
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Eingang", "Kündigende Person", "Art & Zeitpunkt", "Vertrag", "Status", ""].map((h) => (
                    <Th key={h || "aktion"}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {sichtbar.map((k) => (
                  <Tr key={k.id} verticalAlign="top">
                    <Td>
                      <Text fontSize="sm" className="cc-num" color="var(--cc-text)" whiteSpace="nowrap">
                        {kurzZeit(k.eingegangen_am)}
                      </Text>
                      <Text
                        fontSize="xs"
                        className="cc-num"
                        color="var(--cc-text-3)"
                        title={formatEingang(k.eingegangen_am).komplett}
                      >
                        {referenzAus(k.id)}
                      </Text>
                    </Td>
                    <Td>
                      <Stack spacing={0} maxW="240px">
                        <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                          {k.name}
                        </Text>
                        <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
                          {k.email}
                        </Text>
                        {k.bestaetigung_email !== k.email ? (
                          <Text fontSize="xs" color="var(--cc-text-3)" noOfLines={1}>
                            Bestätigung an {k.bestaetigung_email}
                          </Text>
                        ) : null}
                        <Text fontSize="11px" color="var(--cc-text-3)">
                          {k.user_id ? (k.eingeloggt ? "Konto · eingeloggt" : "Konto zugeordnet") : "Kein Konto"}
                          {k.bestaetigung_gesendet_am ? "" : " · Bestätigung nicht versendet"}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>
                      <Stack spacing={0.5} maxW="260px">
                        <Text fontSize="sm" color="var(--cc-text)">
                          {k.art === "ordentlich" ? "Ordentlich" : "Außerordentlich"}
                        </Text>
                        {k.grund ? (
                          <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={3} title={k.grund}>
                            {k.grund}
                          </Text>
                        ) : null}
                        <Text fontSize="xs" color="var(--cc-text-3)">
                          {k.zeitpunkt_wunsch ? `Zum ${formatTag(k.zeitpunkt_wunsch)}` : "Nächstmöglich"}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>
                      <Stack spacing={0.5} maxW="220px">
                        <Text fontSize="sm" color="var(--cc-text)">
                          {k.vertrag_plan ? (PLAN_LABEL[k.vertrag_plan] ?? k.vertrag_plan) : "—"}
                        </Text>
                        {k.wirksam_zum ? (
                          <Text fontSize="xs" color="var(--cc-text-2)">
                            Endet {formatTag(k.wirksam_zum)}
                          </Text>
                        ) : null}
                        {k.vertrag_angabe ? (
                          <Text fontSize="xs" color="var(--cc-text-3)" noOfLines={2} title={k.vertrag_angabe}>
                            Angabe: {k.vertrag_angabe}
                          </Text>
                        ) : null}
                        {k.stripe_subscription_id ? (
                          <Text fontSize="11px" className="cc-num" color="var(--cc-text-3)" noOfLines={1}>
                            {k.stripe_subscription_id}
                          </Text>
                        ) : null}
                      </Stack>
                    </Td>
                    <Td>
                      <Stack spacing={1} maxW="280px" align="flex-start">
                        <StatusPill tone={TON[k.status]}>{STATUS_LABEL[k.status]}</StatusPill>
                        {k.pruef_hinweis ? (
                          <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={4} title={k.pruef_hinweis}>
                            {k.pruef_hinweis}
                          </Text>
                        ) : null}
                        {k.status === "erledigt" && k.erledigt_am ? (
                          <Text fontSize="11px" color="var(--cc-text-3)">
                            erledigt {kurzZeit(k.erledigt_am)}
                          </Text>
                        ) : null}
                      </Stack>
                    </Td>
                    <Td textAlign="right">
                      {OFFEN.has(k.status) ? (
                        <Button
                          variant="line"
                          size="xs"
                          whiteSpace="nowrap"
                          isLoading={markiert === k.id}
                          onClick={() => void erledigen(k.id)}
                        >
                          Als erledigt markieren
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
        Jede Kündigung löst zusätzlich eine Mail an das Betreiber-Postfach aus. „Als erledigt markieren“ erst, nachdem
        der Kunde den Beendigungszeitpunkt per E-Mail bestätigt bekommen hat.
      </Text>
    </>
  );
}
