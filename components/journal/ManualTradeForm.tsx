"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
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
import { useMemo, useRef, useState } from "react";
import { POINT_VALUE_USD } from "@/lib/journal/instruments";
import { createClient } from "@/lib/supabase/client";
import { MANUAL_SYMBOLS } from "./constants";
import { formatMoney, pnlColor } from "./format";

/**
 * Schlankes Erfassungsformular für das neue Journal.
 *
 * Es bildet exakt das ab, was ein geschlossener Round-Trip braucht — keine
 * Strategie-Tags, keine Emotionen. Das klassische Journal, das beides konnte,
 * ist seit 17.09.2026 aus der Oberfläche genommen.
 */

const inputSx = {
  bg: "var(--j-panel-raised)",
  borderColor: "var(--j-line)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--j-line-strong)" },
  _focusVisible: { borderColor: "var(--j-accent)", boxShadow: "0 0 0 1px var(--j-accent)" },
};

/**
 * `datetime-local` liefert Ortszeit ohne Zone — als solche interpretieren.
 *
 * Bewusst von Hand geparst statt über `new Date(value)`: sekundenlose Werte wie
 * "2026-09-17T12:30" ergeben in WebKit `Invalid Date`, und selbst dort, wo der
 * Konstruktor sie versteht, entscheidet die Engine über die Zeitzone. Der Regex
 * liest überall dasselbe und baut daraus ausdrücklich Ortszeit.
 */
function localInputToIso(value: string): string | null {
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, hh, mm, ss] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss ?? 0));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Ortszeit im Format, das `datetime-local` erwartet — für die Startwerte. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  // Vorbelegt, damit nie ein leeres Zeitfeld abgeschickt wird: Einstieg = vor einer
  // Stunde, Ausstieg = jetzt. Das ist für einen gerade geschlossenen Trade meist
  // ohnehin nah dran und spart das fehleranfällige Tippen von Hand.
  const [entryTime, setEntryTime] = useState(() => toLocalInput(new Date(Date.now() - 60 * 60 * 1000)));
  const [exitTime, setExitTime] = useState(() => toLocalInput(new Date()));
  const [fees, setFees] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ entryTime?: string; exitTime?: string }>({});

  /**
   * Zweite Absicherung gegen den Bug: Solange nicht alle Segmente eines
   * `datetime-local` gültig sind, liefert der Browser `""` — die Ziffern stehen
   * sichtbar im Feld, der React-State ist aber leer. Beim Speichern lesen wir
   * deshalb notfalls direkt am DOM-Knoten nach.
   */
  const entryRef = useRef<HTMLInputElement>(null);
  const exitRef = useRef<HTMLInputElement>(null);

  /** Meldet am Feld, wenn der Browser eine unvollständige Eingabe verschluckt. */
  const checkTimeField = (key: "entryTime" | "exitTime", input: HTMLInputElement) => {
    const unvollstaendig = input.validity.badInput || !input.value;
    setFieldErrors((prev) => ({
      ...prev,
      [key]: unvollstaendig ? "Datum und Uhrzeit bitte vollständig eingeben." : undefined,
    }));
  };

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
    setFieldErrors({});

    const q = Number(qty);
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    // Der State gewinnt; steht er leer, zählt der Rohwert am Eingabefeld.
    const entryIso = localInputToIso(entryTime || entryRef.current?.value || "");
    const exitIso = localInputToIso(exitTime || exitRef.current?.value || "");

    if (!q || q <= 0) return setError("Bitte eine Stückzahl größer als 0 eingeben.");
    if (!entry || !exit) return setError("Bitte Einstiegs- und Ausstiegspreis eingeben.");
    if (!entryIso || !exitIso) {
      // Getrennt melden, damit sichtbar wird, welches der beiden Felder klemmt.
      setFieldErrors({
        entryTime: entryIso ? undefined : "Bitte Einstiegszeit vollständig eingeben.",
        exitTime: exitIso ? undefined : "Bitte Ausstiegszeit vollständig eingeben.",
      });
      return setError(
        !entryIso && !exitIso
          ? "Bitte Einstiegs- und Ausstiegszeit eingeben."
          : `Bitte ${entryIso ? "Ausstiegszeit" : "Einstiegszeit"} eingeben.`,
      );
    }
    if (new Date(exitIso) < new Date(entryIso)) {
      setFieldErrors({ exitTime: "Liegt vor dem Einstieg." });
      return setError("Der Ausstieg liegt vor dem Einstieg.");
    }
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
          <FormControl isInvalid={Boolean(fieldErrors.entryTime)}>
            <FormLabel fontSize="sm" color="var(--cc-text-2)">Einstieg</FormLabel>
            <Input
              ref={entryRef}
              type="datetime-local"
              step="60"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              onBlur={(e) => checkTimeField("entryTime", e.target)}
              sx={inputSx}
            />
            <FormErrorMessage fontSize="xs">{fieldErrors.entryTime}</FormErrorMessage>
          </FormControl>
        </GridItem>

        <GridItem colSpan={{ base: 2, md: 1 }}>
          <FormControl isInvalid={Boolean(fieldErrors.exitTime)}>
            <FormLabel fontSize="sm" color="var(--cc-text-2)">Ausstieg</FormLabel>
            <Input
              ref={exitRef}
              type="datetime-local"
              step="60"
              value={exitTime}
              onChange={(e) => setExitTime(e.target.value)}
              onBlur={(e) => checkTimeField("exitTime", e.target)}
              sx={inputSx}
            />
            <FormErrorMessage fontSize="xs">{fieldErrors.exitTime}</FormErrorMessage>
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
