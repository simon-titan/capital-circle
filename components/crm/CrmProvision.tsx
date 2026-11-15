"use client";

import { Box, Flex, Grid, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { ADMIN_CARD_CLASS, AdminCardTitle, StatusPill, adminCardPadding, adminTableSx } from "@/components/admin/adminUi";
import { Chip } from "./ui";
import { euroText, quoteText } from "@/lib/finanzen/geld";

type TeamZeile = {
  closerId: string | null;
  name: string;
  ich: boolean;
  gebucht: number;
  held: number;
  noShow: number;
  showUp: number | null;
  closeRate: number | null;
  closeZaehler: number;
  closeNenner: number | null;
  orders: number;
  verkaufBruttoCents: number;
};
type Eintrag = { id: string; art: string; produkt: string | null; betragCents: number; basisNettoCents: number; status: string; periode: string; entstandenAm: string; ausgezahltAm: string | null };
type Antwort = {
  ok: boolean;
  migration114: boolean;
  istCloser: boolean;
  team: TeamZeile[];
  eigene: Eintrag[];
  summe: { offenCents: number; freigegebenCents: number; ausgezahltCents: number } | null;
};

/**
 * Closer-Sicht nach Tracking-Playbook 3: Teamvergleich nach den Playbook-
 * Definitionen (Show-up operational, Close Rate der Call-Kohorte, Verkaufssumme
 * nach Verkaufs-Credit) und die **eigene** Provision. Zahlungseingänge und die
 * Provision anderer bleiben im Admin.
 */
export function CrmProvision() {
  const [zeitraum, setZeitraum] = useState("30");
  const [d, setD] = useState<Antwort | null>(null);

  useEffect(() => {
    void fetch(`/api/crm/provision?zeitraum=${zeitraum}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Antwort) => setD(j))
      .catch(() => setD(null));
  }, [zeitraum]);

  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} overflowX="auto">
      <Flex align="center" gap={2} mb={3} wrap="wrap">
        <AdminCardTitle flex="1">Teamvergleich und meine Provision</AdminCardTitle>
        {[
          ["7", "7 Tage"],
          ["30", "30 Tage"],
          ["90", "90 Tage"],
          ["gesamt", "Gesamt"],
        ].map(([id, label]) => (
          <Chip key={id} klein aktiv={zeitraum === id} onClick={() => setZeitraum(id!)}>
            {label}
          </Chip>
        ))}
      </Flex>
      {!d ? (
        <Text fontSize="sm" color="var(--cc-text-3)">
          Lädt …
        </Text>
      ) : !d.migration114 ? (
        <Text fontSize="sm" color="var(--cc-gold-light)">
          Migration 114 ist noch nicht eingespielt.
        </Text>
      ) : (
        <>
          <Table size="sm" sx={adminTableSx}>
            <Thead>
              <Tr>
                <Th>Closer</Th>
                <Th isNumeric>Gebucht</Th>
                <Th isNumeric>Geführt</Th>
                <Th isNumeric>No-Show</Th>
                <Th isNumeric>Show-up</Th>
                <Th isNumeric>Close 30 T.</Th>
                <Th isNumeric>Orders</Th>
                <Th isNumeric>Verkaufssumme</Th>
              </Tr>
            </Thead>
            <Tbody>
              {d.team.map((c) => (
                <Tr key={c.closerId ?? "pool"}>
                  <Td fontWeight={c.ich ? 600 : 400}>{c.name}{c.ich ? " (du)" : ""}</Td>
                  <Td isNumeric className="cc-num">{c.gebucht}</Td>
                  <Td isNumeric className="cc-num">{c.held}</Td>
                  <Td isNumeric className="cc-num">{c.noShow}</Td>
                  <Td isNumeric className="cc-num">{quoteText(c.showUp)}</Td>
                  <Td isNumeric className="cc-num">{quoteText(c.closeRate)}</Td>
                  <Td isNumeric className="cc-num">{c.orders}</Td>
                  <Td isNumeric className="cc-num">{euroText(c.verkaufBruttoCents)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
            Show-up = geführt / (geführt + No-Show). Close = Neukunden mit Zahlung binnen 30 Tagen / geführte Erstgespräche. Verkaufssumme nach Verkaufs-Credit (Closer des geführten Calls).
          </Text>

          {d.istCloser ? (
            <Box mt={5}>
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={3} mb={3}>
                {[
                  { label: "Anspruch (noch nicht freigegeben)", wert: d.summe?.offenCents ?? 0 },
                  { label: "Freigegeben", wert: d.summe?.freigegebenCents ?? 0 },
                  { label: "Ausgezahlt", wert: d.summe?.ausgezahltCents ?? 0 },
                ].map((k) => (
                  <Box key={k.label} p={3} border="1px solid var(--cc-line)" borderRadius="10px">
                    <Text fontSize="xs" color="var(--cc-text-2)">
                      {k.label}
                    </Text>
                    <Text className="cc-num" fontSize="20px" fontWeight={600}>
                      {euroText(k.wert)}
                    </Text>
                  </Box>
                ))}
              </Grid>
              {d.eigene.length === 0 ? (
                <Text fontSize="sm" color="var(--cc-text-3)">
                  Keine Provisionseinträge im Zeitraum.
                </Text>
              ) : (
                <Table size="sm" sx={adminTableSx}>
                  <Thead>
                    <Tr>
                      <Th>Datum</Th>
                      <Th>Art</Th>
                      <Th>Produkt</Th>
                      <Th isNumeric>Netto-Basis</Th>
                      <Th isNumeric>Provision</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {d.eigene.map((p) => (
                      <Tr key={p.id}>
                        <Td className="cc-num">{new Date(p.entstandenAm).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</Td>
                        <Td>{p.art === "anspruch" ? "Zahlung" : "Korrektur"}</Td>
                        <Td>{p.produkt ?? "—"}</Td>
                        <Td isNumeric className="cc-num">{euroText(p.basisNettoCents)}</Td>
                        <Td isNumeric className="cc-num" color={p.betragCents < 0 ? "var(--cc-danger)" : undefined}>
                          {euroText(p.betragCents)}
                        </Td>
                        <Td>
                          <StatusPill tone={p.status === "paid" ? "success" : p.status === "approved" ? "attention" : "neutral"}>
                            {p.status === "paid" ? "ausgezahlt" : p.status === "approved" ? "freigegeben" : p.status === "reversed" ? "storniert" : "Anspruch"}
                          </StatusPill>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
              <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
                15 % vom tatsächlich eingegangenen Netto je Zahlung; Erstattungen und verlorene Chargebacks werden als negative Einträge verrechnet.
              </Text>
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}
