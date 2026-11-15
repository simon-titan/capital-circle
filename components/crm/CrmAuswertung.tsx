"use client";

import { Box, Flex, Grid, Input, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { CircleCheck, Trophy, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { ADMIN_CARD_CLASS, adminCardPadding, adminInputProps, adminTableSx } from "@/components/admin/adminUi";
import type { CloserStat } from "@/lib/crm/daten";
import { SeitenKopf } from "./CrmRahmen";
import { CrmProvision } from "./CrmProvision";
import { Kennzahl, dunklesFeld } from "./ui";
import { euro } from "./gemeinsam";

/**
 * Umsatz und Quoten je Closer im Zeitraum (Standard: dieser Monat). Die Käufe
 * zählen für den beim Kauf eingefrorenen Verkaufs-Credit (Migration 114), ohne
 * ihn für den Closer am Kassenlink bzw. den zugewiesenen Closer des Kontakts.
 * Vertragswert = voller Preis, bezahlt = bisher eingegangene Raten. Darunter
 * Teamvergleich nach Playbook-Definitionen und die eigene Provision.
 */
export function CrmAuswertung() {
  const heute = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const [von, setVon] = useState(`${heute.getFullYear()}-${p(heute.getMonth() + 1)}-01`);
  const [bis, setBis] = useState(`${heute.getFullYear()}-${p(heute.getMonth() + 1)}-${p(heute.getDate())}`);
  const [stats, setStats] = useState<CloserStat[] | null>(null);

  useEffect(() => {
    void fetch(`/api/crm/auswertung?von=${von}&bis=${bis}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok: boolean; stats?: CloserStat[] }) => setStats(j.stats ?? []))
      .catch(() => setStats([]));
  }, [von, bis]);

  const quote = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
  const summe = (stats ?? []).reduce(
    (s, x) => ({ wert: s.wert + x.wertCents, bezahlt: s.bezahlt + x.bezahltCents, gewonnen: s.gewonnen + x.gewonnen }),
    { wert: 0, bezahlt: 0, gewonnen: 0 },
  );

  return (
    <Stack gap={4}>
      <SeitenKopf
        titel="Auswertung"
        unter="Umsatz und Quoten je Closer im Zeitraum"
        rechts={
          <Flex gap={2} align="center">
            <Input type="date" size="sm" h="32px" maxW="160px" value={von} onChange={(e) => setVon(e.target.value)} {...adminInputProps} {...dunklesFeld} aria-label="Von" />
            <Text color="var(--cc-text-3)" fontSize="13px">
              bis
            </Text>
            <Input type="date" size="sm" h="32px" maxW="160px" value={bis} onChange={(e) => setBis(e.target.value)} {...adminInputProps} {...dunklesFeld} aria-label="Bis" />
          </Flex>
        }
      />

      <Grid templateColumns={{ base: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" }} gap={{ base: 3, md: 4 }}>
        <Kennzahl icon={Trophy} label="Abschlüsse" wert={stats ? summe.gewonnen : "–"} />
        <Kennzahl icon={Wallet} label="Vertragswert" wert={stats ? euro(summe.wert) : "–"} ton={summe.wert ? "gold" : "neutral"} />
        <Kennzahl icon={CircleCheck} label="Davon bezahlt" wert={stats ? euro(summe.bezahlt) : "–"} />
      </Grid>

      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} overflowX="auto">
        <Table size="sm" sx={adminTableSx}>
          <Thead>
            <Tr>
              <Th>Closer</Th>
              <Th isNumeric>Neue Kontakte</Th>
              <Th isNumeric>Termine</Th>
              <Th isNumeric>Geführt</Th>
              <Th isNumeric>No-Show</Th>
              <Th isNumeric>Show-Rate</Th>
              <Th isNumeric>Abschlüsse</Th>
              <Th isNumeric>Abschlussquote</Th>
              <Th isNumeric>Main 3.000 €</Th>
              <Th isNumeric>Premium 5.000 €</Th>
              <Th isNumeric>Ausbildung</Th>
              <Th isNumeric>Vertragswert</Th>
              <Th isNumeric>Bezahlt</Th>
              <Th isNumeric>Verloren</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(stats ?? []).map((s) => {
              const p = (id: string) => s.wertJeProdukt[id];
              const zelle = (id: string) => (p(id) ? `${p(id)!.anzahl} · ${euro(p(id)!.cents)}` : "—");
              return (
                <Tr key={s.closerId ?? "pool"}>
                  <Td fontWeight={500}>{s.name}</Td>
                  <Td isNumeric className="cc-num">{s.kontakte}</Td>
                  <Td isNumeric className="cc-num">{s.termine}</Td>
                  <Td isNumeric className="cc-num">{s.gefuehrt}</Td>
                  <Td isNumeric className="cc-num">{s.noShow}</Td>
                  <Td isNumeric className="cc-num">{quote(s.gefuehrt, s.gefuehrt + s.noShow)}</Td>
                  <Td isNumeric className="cc-num">{s.gewonnen}</Td>
                  <Td isNumeric className="cc-num">{quote(s.gewonnen, s.gefuehrt)}</Td>
                  <Td isNumeric className="cc-num">{zelle("main")}</Td>
                  <Td isNumeric className="cc-num">{zelle("premium")}</Td>
                  <Td isNumeric className="cc-num">{zelle("ausbildung")}</Td>
                  <Td isNumeric className="cc-num" fontWeight={600}>{euro(s.wertCents)}</Td>
                  <Td isNumeric className="cc-num">{euro(s.bezahltCents)}</Td>
                  <Td isNumeric className="cc-num">{s.verloren}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
        {stats === null ? (
          <Text fontSize="sm" color="var(--cc-text-3)" mt={3}>
            Lädt …
          </Text>
        ) : null}
      </Box>

      <CrmProvision />
    </Stack>
  );
}
