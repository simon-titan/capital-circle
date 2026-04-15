"use client";

import {
  Box,
  Button,
  Grid,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { strategyLabel, TICK_VALUE_USD } from "@/components/trading-journal/constants";
import type { TradeRow } from "@/components/trading-journal/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  trade: TradeRow | null;
  journalId: string;
  onUpdated: () => void;
};

export function TradeDetailModal({ isOpen, onClose, trade, journalId, onUpdated }: Props) {
  const supabase = createClient();
  const toast = useToast();
  const [editMode, setEditMode] = useState(false);
  const [notes, setNotes] = useState("");
  const [resultTicks, setResultTicks] = useState("");

  useEffect(() => {
    if (trade) {
      setNotes(trade.notes || "");
      setResultTicks(String(trade.result_ticks));
      setEditMode(false);
    }
  }, [trade]);

  if (!trade) return null;

  const tv = TICK_VALUE_USD[trade.asset] ?? 1;
  const c = trade.contracts || 1;
  const rt = parseFloat(resultTicks) || 0;
  const resultDollar = rt * tv * c;
  const rrStr =
    trade.sl_ticks > 0 && rt !== 0 ? `1 : ${(Math.abs(rt) / trade.sl_ticks).toFixed(2)}` : trade.rr || "—";

  const saveEdit = async () => {
    const { error } = await supabase
      .from("trading_journal_trades")
      .update({
        notes: notes || null,
        result_ticks: rt,
        result_dollar: resultDollar,
        rr: trade.sl_ticks > 0 && rt !== 0 ? `1 : ${(Math.abs(rt) / trade.sl_ticks).toFixed(2)}` : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

    if (error) {
      toast({ title: "Speichern fehlgeschlagen", description: error.message, status: "error" });
      return;
    }
    toast({ title: "Gespeichert", status: "success" });
    setEditMode(false);
    onUpdated();
  };

  const deleteTrade = async () => {
    if (!window.confirm("Diesen Trade wirklich löschen?")) return;
    const { error } = await supabase.from("trading_journal_trades").delete().eq("id", trade.id);
    if (error) {
      toast({ title: "Löschen fehlgeschlagen", description: error.message, status: "error" });
      return;
    }
    onClose();
    onUpdated();
  };

  const uploadScreenshot = async (file: File) => {
    const qs = new URLSearchParams({
      tradeId: trade.id,
      journalId,
      fileName: file.name,
      contentType: file.type || "image/jpeg",
    });
    const pres = await fetch(`/api/trading-journal/screenshot?${qs.toString()}`);
    const json = (await pres.json()) as { ok?: boolean; presignedUrl?: string; storageKey?: string };
    if (!json.ok || !json.presignedUrl || !json.storageKey) {
      toast({ title: "Upload fehlgeschlagen", status: "error" });
      return;
    }
    const put = await fetch(json.presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
    if (!put.ok) {
      toast({ title: "Upload fehlgeschlagen", status: "error" });
      return;
    }
    await supabase.from("trading_journal_trades").update({ screenshot_storage_key: json.storageKey }).eq("id", trade.id);
    toast({ title: "Screenshot aktualisiert", status: "success" });
    onUpdated();
  };

  const deleteScreenshot = async () => {
    if (!window.confirm("Screenshot entfernen?")) return;
    await supabase.from("trading_journal_trades").update({ screenshot_storage_key: null }).eq("id", trade.id);
    onUpdated();
  };

  const imgSrc = trade.screenshot_storage_key?.trim()
    ? `/api/cover-url?key=${encodeURIComponent(trade.screenshot_storage_key.trim())}`
    : null;

  const detail = (label: string, value: ReactNode) => (
    <Box bg="rgba(255,255,255,0.04)" borderRadius="md" p={3}>
      <Text fontSize="10px" color="var(--color-text-tertiary)" textTransform="uppercase" letterSpacing="0.06em" mb={1}>
        {label}
      </Text>
      <Box fontSize="sm" fontWeight={700} className="jetbrains-mono">
        {value}
      </Box>
    </Box>
  );

  const pnlDisplay = editMode ? resultDollar : trade.result_dollar;
  const pnlColor = pnlDisplay >= 0 ? "var(--color-profit)" : "var(--color-loss)";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay bg="rgba(0,0,0,0.75)" backdropFilter="blur(4px)" />
      <ModalContent bg="rgba(10, 11, 14, 0.96)" border="1px solid rgba(255,255,255,0.09)" borderRadius="xl">
        <ModalHeader display="flex" flexDirection={{ base: "column", sm: "row" }} alignItems="flex-start" gap={3} pr={10}>
          <Text fontSize="md" className="inter-semibold" flex="1">
            Trade — {trade.trade_date} {trade.asset} {trade.direction === "long" ? "Long" : "Short"}
          </Text>
          <Button size="sm" variant={editMode ? "solid" : "outline"} mr={2} onClick={() => (editMode ? void saveEdit() : setEditMode(true))}>
            {editMode ? "Speichern" : "Bearbeiten"}
          </Button>
          <Button size="sm" colorScheme="red" variant="outline" onClick={() => void deleteTrade()}>
            Löschen
          </Button>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody pb={8}>
          {imgSrc ? (
            <Box position="relative" mb={6}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt="Screenshot" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
              <Button size="xs" position="absolute" top={2} right={2} onClick={() => void deleteScreenshot()}>
                Screenshot löschen
              </Button>
              <label style={{ position: "absolute", top: 8, right: 120 }}>
                <Button as="span" size="xs">
                  Ändern
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadScreenshot(f);
                  }}
                />
              </label>
            </Box>
          ) : (
            <Box mb={6} p={8} border="1px dashed rgba(255,255,255,0.12)" borderRadius="md" textAlign="center">
              <label>
                <Text fontSize="sm" color="var(--color-text-tertiary)" mb={2}>
                  Screenshot hinzufügen
                </Text>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadScreenshot(f);
                  }}
                />
              </label>
            </Box>
          )}

          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={4}>
            {detail("Datum & Zeit", `${trade.trade_date} ${trade.trade_time?.slice(0, 5) ?? ""}`)}
            {detail("Wochentag", trade.weekday || "—")}
            {detail("Strategie", strategyLabel(trade.strategy))}
            {detail("Asset", trade.asset)}
            {detail("Richtung", trade.direction === "long" ? "Long" : "Short")}
            {detail("Session", trade.session || "—")}
            {detail("Kontrakte", String(trade.contracts))}
            {detail("Entry", trade.entry_price != null ? String(trade.entry_price) : "—")}
            {detail("Stop Loss", `${trade.sl_ticks} Ticks`)}
            {detail("Take Profit", `${trade.tp_ticks} Ticks`)}
            {detail(
              "Ergebnis (Ticks)",
              editMode ? (
                <Input
                  type="number"
                  step={1}
                  value={resultTicks}
                  onChange={(e) => setResultTicks(e.target.value)}
                  size="sm"
                  maxW="120px"
                  className="jetbrains-mono"
                />
              ) : (
                `${trade.result_ticks >= 0 ? "+" : ""}${trade.result_ticks}`
              ),
            )}
            {detail(
              "P&L ($)",
              <Text as="span" color={pnlColor}>
                {pnlDisplay >= 0 ? "+" : "-"}${Math.abs(pnlDisplay).toFixed(2)}
              </Text>,
            )}
            {detail("RR", rrStr)}
            {detail("Order-Typ", trade.order_type || "—")}
            {detail("Marktöffnung", trade.open_position || "—")}
            {detail("Emotion Vor", trade.emotion_before || "—")}
            {detail("Emotion Nach", trade.emotion_after || "—")}
            {detail("News Timing", trade.news_timing || "—")}
          </Grid>

          <Text fontSize="xs" color="var(--color-text-tertiary)" mb={1}>
            Notizen
          </Text>
          {editMode ? (
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)" />
          ) : (
            <Text fontSize="sm" color="var(--color-text-secondary)" whiteSpace="pre-wrap">
              {trade.notes || "—"}
            </Text>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
