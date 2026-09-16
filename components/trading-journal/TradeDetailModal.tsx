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

const inputSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--cc-gold-line)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

/** Destruktive Aktion: Line-Button in Rot statt Gold-Kante. */
const dangerLineSx = {
  variant: "line" as const,
  color: "var(--cc-danger)",
  borderColor: "rgba(248, 113, 113, 0.35)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.6)", boxShadow: "none" },
  _active: { bg: "rgba(248, 113, 113, 0.12)" },
};

/** Buttons, die auf dem Screenshot liegen, brauchen einen deckenden Grund. */
const overlayBtnBg = "rgba(14, 18, 23, 0.88)";

export function TradeDetailModal({ isOpen, onClose, trade, journalId, onUpdated }: Props) {
  const supabase = createClient();
  const toast = useToast();
  const [editMode, setEditMode] = useState(false);
  const [notes, setNotes] = useState("");
  const [resultTicks, setResultTicks] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- Formular beim Trade-Wechsel auf dessen Werte zurücksetzen */
  useEffect(() => {
    if (trade) {
      setNotes(trade.notes || "");
      setResultTicks(String(trade.result_ticks));
      setEditMode(false);
    }
  }, [trade]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    <Box bg="rgba(255, 255, 255, 0.03)" border="1px solid var(--cc-line)" borderRadius="10px" p={3}>
      <Text fontSize="11px" fontWeight={500} color="var(--cc-text-2)" textTransform="uppercase" letterSpacing="0.08em" mb={1}>
        {label}
      </Text>
      <Box fontSize="sm" fontWeight={600} color="var(--cc-text)" className="cc-num">
        {value}
      </Box>
    </Box>
  );

  const pnlDisplay = editMode ? resultDollar : trade.result_dollar;
  const pnlColor = pnlDisplay >= 0 ? "var(--color-profit)" : "var(--color-loss)";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay bg="rgba(5, 7, 10, 0.7)" backdropFilter="blur(6px)" />
      <ModalContent
        bg="var(--cc-panel-solid)"
        border="1px solid var(--cc-gold-line)"
        borderRadius="14px"
        boxShadow="0 24px 64px rgba(0, 0, 0, 0.6), 0 0 32px rgba(212, 176, 128, 0.08)"
        color="var(--cc-text)"
      >
        <ModalHeader
          display="flex"
          flexDirection={{ base: "column", sm: "row" }}
          alignItems="flex-start"
          gap={3}
          pr={10}
          borderBottom="1px solid var(--cc-line)"
        >
          <Text fontSize="16px" fontWeight={600} color="var(--cc-text)" flex="1" className="cc-num">
            Trade — {trade.trade_date} {trade.asset} {trade.direction === "long" ? "Long" : "Short"}
          </Text>
          <Button
            size="sm"
            variant={editMode ? "gold" : "line"}
            mr={2}
            onClick={() => (editMode ? void saveEdit() : setEditMode(true))}
          >
            {editMode ? "Speichern" : "Bearbeiten"}
          </Button>
          <Button size="sm" {...dangerLineSx} onClick={() => void deleteTrade()}>
            Löschen
          </Button>
          <ModalCloseButton color="var(--cc-text-2)" _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.05)" }} />
        </ModalHeader>
        <ModalBody pt={5} pb={8}>
          {imgSrc ? (
            <Box position="relative" mb={6}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt="Screenshot"
                style={{ maxWidth: "100%", borderRadius: 10, border: "1px solid var(--cc-line-strong)" }}
              />
              <Button
                size="xs"
                {...dangerLineSx}
                bg={overlayBtnBg}
                position="absolute"
                top={2}
                right={2}
                onClick={() => void deleteScreenshot()}
              >
                Screenshot löschen
              </Button>
              <label style={{ position: "absolute", top: 8, right: 120 }}>
                <Button as="span" size="xs" variant="line" bg={overlayBtnBg} cursor="pointer">
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
            <Box
              mb={6}
              p={8}
              border="1px dashed var(--cc-line-strong)"
              borderRadius="10px"
              bg="rgba(255, 255, 255, 0.02)"
              textAlign="center"
              color="var(--cc-text-2)"
              fontSize="sm"
            >
              <label>
                <Text fontSize="sm" color="var(--cc-text-2)" mb={2}>
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

          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={5}>
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
                  className="cc-num"
                  {...inputSx}
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

          <Text
            fontSize="13px"
            lineHeight="18px"
            fontWeight={500}
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="var(--cc-text-soft)"
            mb={2}
          >
            Notizen
          </Text>
          {editMode ? (
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} {...inputSx} />
          ) : (
            <Text fontSize="sm" color="var(--cc-text-soft)" lineHeight={1.6} whiteSpace="pre-wrap">
              {trade.notes || "—"}
            </Text>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
