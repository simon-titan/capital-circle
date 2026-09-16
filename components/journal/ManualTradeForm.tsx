"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { POINT_VALUE_USD } from "@/lib/journal/instruments";
import { createClient } from "@/lib/supabase/client";
import { MANUAL_SYMBOLS } from "./constants";
import { formatMoney, pnlColor } from "./format";

/**
 * Schlankes Erfassungsformular für das neue Journal.
 *
 * Es bildet exakt das ab, was ein geschlossener Round-Trip braucht — keine
 * Strategie-Tags, keine Emotionen. Wer das will, nutzt das klassische Journal.
 */

const inputSx = {
  bg: "var(--j-panel-raised)",
  borderColor: "var(--j-line)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--j-line-strong)" },
  _focusVisible: { borderColor: "var(--j-accent)", boxShadow: "0 0 0 1px var(--j-accent)" },
};

/** `datetime-local` liefert Ortszeit ohne Zone — als solche interpretieren. */
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isoToTradeDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ManualTradeForm({ accountId, onSaved }: { accountId: string; onSaved: () => void }) {
  const supabase = useMemo(() => createClient(), []);

  const [symbol, setSymbol] = useState<string>("MNQ");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [qty, setQty] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [fees, setFees] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pointValue = POINT_VALUE_USD[symbol] ?? 0;

  const preview = useMemo(() => {
    const q = Number(qty);
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    if (!q || !entry || !exit || !pointValue) return null;
    const sign = direction === "long" ? 1 : -1;
    const gross = (exit - entry) * sign * q * pointValue;
    const net = gross - (Number(fees) || 0);
    return { gross, net };
  }, [qty, entryPrice, exitPrice, direction, pointValue, fees]);

  const save = async () => {
    setError(null);

    const q = Number(qty);
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    const entryIso = localInputToIso(entryTime);
    const exitIso = localInputToIso(exitTime);

    if (!q || q <= 0) return setError("Bitte eine Stückzahl größer als 0 eingeben.");
    if (!entry || !exit) return setError("Bitte Einstiegs- und Ausstiegspreis eingeben.");
    if (!entryIso || !exitIso) return setError("Bitte Einstiegs- und Ausstiegszeit eingeben.");
    if (new Date(exitIso) < new Date(entryIso)) return setError("Der Ausstieg liegt vor dem Einstieg.");
    if (!pointValue) return setError(`Für ${symbol} ist kein Punktwert hinterlegt.`);

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      return setError("Sitzung abgelaufen. Bitte neu anmelden.");
    }

    const sign = direction === "long" ? 1 : -1;
    const grossPnl = Math.round((exit - entry) * sign * q * pointValue * 100) / 100;

    const { error: insertError } = await supabase.from("journal_trades").insert({
      user_id: auth.user.id,
      account_id: accountId,
      source: "manual",
      symbol,
      direction,
      qty: q,
      entry_price: entry,
      exit_price: exit,
      entry_time: entryIso,
      exit_time: exitIso,
      trade_date: isoToTradeDate(exitIso),
      point_value: pointValue,
      gross_pnl: grossPnl,
      fees: fees ? Number(fees) : null,
      notes: notes.trim() || null,
    });

    setSaving(false);
    if (insertError) return setError(insertError.message);
    onSaved();
  };

  return (
    <Stack gap={5}>
      {error && (
        <Alert status="error" bg="rgba(239,68,68,0.12)" borderRadius="md" color="var(--cc-text)">
          <AlertIcon color="var(--color-loss)" />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}

      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }} gap={{ base: 3, md: 4 }}>
        <FormControl>
          <FormLabel fontSize="sm" color="var(--cc-text-2)">Instrument</FormLabel>
          <Select value={symbol} onChange={(e) => setSymbol(e.target.value)} sx={inputSx}>
            {MANUAL_SYMBOLS.map((s) => (
              <option key={s} value={s} style={{ background: "#0e1217" }}>
                {s} · {POINT_VALUE_USD[s]} $/Punkt
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="var(--cc-text-2)">Richtung</FormLabel>
          <Select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "long" | "short")}
            sx={inputSx}
          >
            <option value="long" style={{ background: "#0e1217" }}>Long</option>
            <option value="short" style={{ background: "#0e1217" }}>Short</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="var(--cc-text-2)">Kontrakte</FormLabel>
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} sx={inputSx} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="var(--cc-text-2)">Einstiegspreis</FormLabel>
          <Input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="cc-num"
            sx={inputSx}
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="var(--cc-text-2)">Ausstiegspreis</FormLabel>
          <Input
            type="number"
            step="any"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            className="cc-num"
            sx={inputSx}
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm" color="var(--cc-text-2)">Gebühren (optional)</FormLabel>
          <Input type="number" step="any" value={fees} onChange={(e) => setFees(e.target.value)} sx={inputSx} />
        </FormControl>

        {/* datetime-local braucht die volle Breite, sonst wird das Feld beschnitten. */}
        <GridItem colSpan={{ base: 2, md: 1 }}>
          <FormControl>
            <FormLabel fontSize="sm" color="var(--cc-text-2)">Einstieg</FormLabel>
            <Input type="datetime-local" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} sx={inputSx} />
          </FormControl>
        </GridItem>

        <GridItem colSpan={{ base: 2, md: 1 }}>
          <FormControl>
            <FormLabel fontSize="sm" color="var(--cc-text-2)">Ausstieg</FormLabel>
            <Input type="datetime-local" value={exitTime} onChange={(e) => setExitTime(e.target.value)} sx={inputSx} />
          </FormControl>
        </GridItem>
      </Grid>

      <FormControl>
        <FormLabel fontSize="sm" color="var(--cc-text-2)">Notizen (optional)</FormLabel>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} sx={inputSx} />
      </FormControl>

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Text fontSize="xs" color="var(--cc-text-3)">Vorschau Netto-P&amp;L</Text>
          <Text className="cc-num" fontSize="xl" color={preview ? pnlColor(preview.net) : "var(--cc-text-3)"}>
            {preview ? formatMoney(preview.net) : "—"}
          </Text>
        </Box>
        <Button
          onClick={() => void save()}
          isLoading={saving}
          variant="gold"
        >
          Trade speichern
        </Button>
      </HStack>
    </Stack>
  );
}
