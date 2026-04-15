"use client";

import {
  Box,
  Input,
  Select,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Wrap,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { strategyLabel } from "@/components/trading-journal/constants";
import type { TradeRow } from "@/components/trading-journal/types";

function allTags(t: TradeRow): string[] {
  const arrs = [
    t.scalp_zones,
    t.scalp_pa,
    t.ocrr_bias,
    t.ocrr_conf,
    t.ocrr_vol,
    t.naked_zones,
    t.naked_bonus,
    t.naked_vp,
    t.news_events,
  ] as unknown[];
  const out: string[] = [];
  for (const a of arrs) {
    if (Array.isArray(a)) out.push(...(a.filter((x) => typeof x === "string") as string[]));
  }
  return out;
}

type Props = {
  trades: TradeRow[];
  onOpenTrade: (id: string) => void;
};

export function TradeHistory({ trades, onOpenTrade }: Props) {
  const [fStrat, setFStrat] = useState("");
  const [fAsset, setFAsset] = useState("");
  const [fDir, setFDir] = useState("");
  const [fRes, setFRes] = useState("");
  const [fWd, setFWd] = useState("");
  const [fSess, setFSess] = useState("");
  const [fDate, setFDate] = useState("");
  const [fZone, setFZone] = useState("");
  const [fNews, setFNews] = useState("");
  const [fOpen, setFOpen] = useState("");

  const zoneOpts = useMemo(() => {
    const s = new Set<string>();
    trades.forEach((t) => allTags(t).forEach((z) => s.add(z)));
    return [...s].sort();
  }, [trades]);

  const newsOpts = useMemo(() => {
    const s = new Set<string>();
    trades.forEach((t) => {
      const ev = t.news_events;
      if (!Array.isArray(ev)) return;
      for (const n of ev) {
        if (typeof n === "string") s.add(n);
      }
    });
    return [...s].sort();
  }, [trades]);

  const filtered = useMemo(() => {
    let f = trades;
    if (fStrat) f = f.filter((t) => t.strategy === fStrat);
    if (fAsset) f = f.filter((t) => t.asset === fAsset);
    if (fDir) f = f.filter((t) => t.direction === fDir);
    if (fRes === "win") f = f.filter((t) => t.result_dollar > 0);
    if (fRes === "loss") f = f.filter((t) => t.result_dollar < 0);
    if (fWd) f = f.filter((t) => t.weekday === fWd);
    if (fSess) f = f.filter((t) => (t.session || "") === fSess);
    if (fDate) f = f.filter((t) => t.trade_date === fDate);
    if (fZone) f = f.filter((t) => allTags(t).includes(fZone));
    if (fNews)
      f = f.filter((t) => Array.isArray(t.news_events) && (t.news_events as string[]).includes(fNews));
    if (fOpen) f = f.filter((t) => (t.open_position || "") === fOpen);
    return f;
  }, [trades, fStrat, fAsset, fDir, fRes, fWd, fSess, fDate, fZone, fNews, fOpen]);

  const selProps = {
    size: "sm" as const,
    bg: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.09)",
    maxW: { base: "100%", md: "160px" },
  };
  const dateInputProps = {
    bg: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.09)",
    maxW: { base: "100%", md: "160px" },
  };

  return (
    <Box>
      <Wrap spacing={2} mb={3}>
        <Select {...selProps} placeholder="Alle Strategien" value={fStrat} onChange={(e) => setFStrat(e.target.value)}>
          <option value="">Alle Strategien</option>
          <option value="scalp">Scalping Balance</option>
          <option value="ocrr">NYSE OCRR</option>
          <option value="naked">Naked Zonen</option>
        </Select>
        <Select {...selProps} value={fAsset} onChange={(e) => setFAsset(e.target.value)}>
          <option value="">Alle Assets</option>
          <option>NQ</option>
          <option>MNQ</option>
          <option>ES</option>
          <option>MES</option>
          <option>GC</option>
          <option>MGC</option>
          <option>CL</option>
          <option>MCL</option>
        </Select>
        <Select {...selProps} value={fDir} onChange={(e) => setFDir(e.target.value)}>
          <option value="">Long & Short</option>
          <option value="long">Nur Long</option>
          <option value="short">Nur Short</option>
        </Select>
        <Select {...selProps} value={fRes} onChange={(e) => setFRes(e.target.value)}>
          <option value="">Alle Ergebnisse</option>
          <option value="win">TP</option>
          <option value="loss">SL</option>
        </Select>
        <Select {...selProps} value={fWd} onChange={(e) => setFWd(e.target.value)}>
          <option value="">Alle Wochentage</option>
          <option>Montag</option>
          <option>Dienstag</option>
          <option>Mittwoch</option>
          <option>Donnerstag</option>
          <option>Freitag</option>
        </Select>
        <Select {...selProps} value={fSess} onChange={(e) => setFSess(e.target.value)}>
          <option value="">Alle Sessions</option>
          <option>LONDON</option>
          <option>NEW YORK</option>
          <option>ASIA</option>
        </Select>
        <Input type="date" size="sm" {...dateInputProps} value={fDate} onChange={(e) => setFDate(e.target.value)} />
      </Wrap>
      <Wrap spacing={2} mb={4} align="center">
        <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter-semibold">
          Zonen:
        </Text>
        <Select {...selProps} value={fZone} onChange={(e) => setFZone(e.target.value)}>
          <option value="">Alle Zonen</option>
          {zoneOpts.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
        <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter-semibold">
          News:
        </Text>
        <Select {...selProps} value={fNews} onChange={(e) => setFNews(e.target.value)}>
          <option value="">Alle News</option>
          {newsOpts.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
        <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter-semibold">
          Marktöffnung:
        </Text>
        <Select {...selProps} value={fOpen} onChange={(e) => setFOpen(e.target.value)}>
          <option value="">Alle</option>
          <option>Im Value geöffnet</option>
          <option>Unter Value geöffnet</option>
          <option>Über Value geöffnet</option>
        </Select>
      </Wrap>

      <Text fontSize="xs" color="var(--color-text-tertiary)" mb={2}>
        {filtered.length} Trades · Klicke für Details
      </Text>

      <TableContainer overflowX="auto" borderRadius="md" border="1px solid rgba(255,255,255,0.08)">
        <Table size="sm">
          <Thead bg="rgba(255,255,255,0.03)">
            <Tr>
              {["Datum", "Tag", "Strat", "Asset", "Session", "Dir", "Kontr.", "SL", "TP", "Erg.(T)", "P&L $", "RR", "Emo V", "Emo N", "Tags"].map((h) => (
                <Th key={h} color="var(--color-text-tertiary)" fontSize="10px" textTransform="uppercase" letterSpacing="0.06em" whiteSpace="nowrap">
                  {h}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {filtered.length === 0 ? (
              <Tr>
                <Td colSpan={15} textAlign="center" py={10} color="var(--color-text-tertiary)">
                  Keine Trades.
                </Td>
              </Tr>
            ) : (
              filtered.map((t) => {
                const tags = allTags(t).slice(0, 4);
                const more = allTags(t).length - tags.length;
                return (
                  <Tr
                    key={t.id}
                    _hover={{ bg: "rgba(255,255,255,0.04)", cursor: "pointer" }}
                    onClick={() => onOpenTrade(t.id)}
                  >
                    <Td whiteSpace="nowrap" className="jetbrains-mono" fontSize="xs">
                      {t.trade_date} {t.trade_time?.slice(0, 5) ?? ""}
                    </Td>
                    <Td fontWeight={600} fontSize="xs">
                      {t.weekday || "—"}
                    </Td>
                    <Td fontSize="xs">{strategyLabel(t.strategy)}</Td>
                    <Td fontWeight={700} fontSize="xs">
                      {t.asset}
                    </Td>
                    <Td fontSize="11px">{t.session || "—"}</Td>
                    <Td fontSize="xs" color={t.direction === "long" ? "var(--color-profit)" : "var(--color-loss)"}>
                      {t.direction === "long" ? "Long" : "Short"}
                    </Td>
                    <Td className="jetbrains-mono" fontSize="xs">
                      {t.contracts}
                    </Td>
                    <Td className="jetbrains-mono" fontSize="xs">
                      {t.sl_ticks}
                    </Td>
                    <Td className="jetbrains-mono" fontSize="xs">
                      {t.tp_ticks}
                    </Td>
                    <Td
                      fontSize="xs"
                      fontWeight={700}
                      color={t.result_ticks >= 0 ? "var(--color-profit)" : "var(--color-loss)"}
                      className="jetbrains-mono"
                    >
                      {t.result_ticks >= 0 ? "+" : ""}
                      {t.result_ticks}T
                    </Td>
                    <Td
                      fontSize="xs"
                      fontWeight={700}
                      color={t.result_dollar >= 0 ? "var(--color-profit)" : "var(--color-loss)"}
                      className="jetbrains-mono"
                    >
                      {t.result_dollar >= 0 ? "+" : ""}$
                      {Math.abs(t.result_dollar).toFixed(2)}
                    </Td>
                    <Td fontSize="xs" className="jetbrains-mono">
                      {t.rr || "—"}
                    </Td>
                    <Td fontSize="11px">{t.emotion_before || "—"}</Td>
                    <Td fontSize="11px">{t.emotion_after || "—"}</Td>
                    <Td fontSize="10px" maxW="140px">
                      {tags.map((x) => (
                        <Box as="span" key={x} display="inline-block" px={1} py={0.5} mr={1} mb={1} borderRadius="sm" bg="rgba(255,255,255,0.06)">
                          {x}
                        </Box>
                      ))}
                      {more > 0 ? <Text as="span" color="var(--color-text-tertiary)">+{more}</Text> : null}
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
