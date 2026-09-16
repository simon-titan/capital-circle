"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Input,
  Select,
  Text,
  Textarea,
  VStack,
  useToast,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ASSETS,
  NEWS_EVENTS,
  NAKED_BONUS_DEFAULTS,
  NAKED_VP,
  NAKED_ZONE_DEFAULTS,
  OCRR_BIAS,
  OCRR_CONF_DEFAULTS,
  OCRR_VOL,
  SCALP_PA_DEFAULTS,
  SCALP_ZONE_DEFAULTS,
  TICK_VALUE_USD,
  type StrategyKey,
  weekdayFromDate,
} from "@/components/trading-journal/constants";

function toggleInList(list: string[], tag: string): string[] {
  return list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
}

/** Umschalter/Tags: aktiv mit Gold-Verlauf von links und Gold-Haarlinie, inaktiv transparent. */
const btnSx = (active: boolean) => ({
  variant: "outline" as const,
  fontWeight: 500,
  borderRadius: "8px",
  borderColor: active ? "var(--cc-gold-line)" : "var(--cc-line-strong)",
  bg: active ? "linear-gradient(90deg, rgba(212, 176, 128, 0.16), rgba(212, 176, 128, 0.03))" : "transparent",
  color: active ? "var(--cc-gold-light)" : "var(--cc-text-2)",
  _hover: active
    ? { bg: "linear-gradient(90deg, rgba(212, 176, 128, 0.2), rgba(212, 176, 128, 0.05))", borderColor: "var(--cc-gold-line)" }
    : { bg: "rgba(255, 255, 255, 0.04)", borderColor: "var(--cc-gold-line)", color: "var(--cc-text)" },
  _active: { bg: "rgba(212, 176, 128, 0.12)" },
});

const inputSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--cc-gold-line)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

/** Berechnete Felder: zurückgenommen, damit klar ist, dass man sie nicht tippt. */
const readOnlySx = {
  ...inputSx,
  bg: "rgba(255, 255, 255, 0.015)",
  borderColor: "var(--cc-line)",
  color: "var(--cc-text-soft)",
  _hover: { borderColor: "var(--cc-line)" },
};

const selectSx = { ...inputSx, sx: { "& option, & optgroup": { background: "#0e1217" } } };

const fieldLabelProps = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--cc-text-2)",
  mb: 1.5,
};

type Props = {
  journalId: string;
  onSaved: () => void;
};

export function TradeForm({ journalId, onSaved }: Props) {
  const supabase = createClient();
  const toast = useToast();

  const [strategy, setStrategy] = useState<StrategyKey>("scalp");
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tradeTime, setTradeTime] = useState("");
  const [session, setSession] = useState("NEW YORK");
  const [asset, setAsset] = useState("NQ");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [contracts, setContracts] = useState("1");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [resultTicks, setResultTicks] = useState("");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [openPosition, setOpenPosition] = useState("");
  const [newsEvents, setNewsEvents] = useState<string[]>([]);
  const [newsResult, setNewsResult] = useState("");
  const [newsTiming, setNewsTiming] = useState("Vor News");
  const [emoB, setEmoB] = useState("Neutral");
  const [emoA, setEmoA] = useState("Neutral");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [scalpZones, setScalpZones] = useState<string[]>([]);
  const [scalpPa, setScalpPa] = useState<string[]>([]);
  const [extraScalpZ, setExtraScalpZ] = useState<string[]>([]);
  const [extraScalpPa, setExtraScalpPa] = useState<string[]>([]);
  const [ocrrBias, setOcrrBias] = useState<string[]>([]);
  const [ocrrConf, setOcrrConf] = useState<string[]>([]);
  const [extraOcrrConf, setExtraOcrrConf] = useState<string[]>([]);
  const [ocrrVol, setOcrrVol] = useState<string[]>([]);
  const [nakedZones, setNakedZones] = useState<string[]>([]);
  const [extraNakedZ, setExtraNakedZ] = useState<string[]>([]);
  const [nakedBonus, setNakedBonus] = useState<string[]>([]);
  const [extraNakedBonus, setExtraNakedBonus] = useState<string[]>([]);
  const [nakedVp, setNakedVp] = useState<string[]>([]);

  const [addZ, setAddZ] = useState("");
  const [addPa, setAddPa] = useState("");
  const [addConf, setAddConf] = useState("");
  const [addNz, setAddNz] = useState("");
  const [addNb, setAddNb] = useState("");

  const tv = TICK_VALUE_USD[asset] ?? 1;
  const c = parseFloat(contracts) || 1;
  const slN = parseFloat(sl) || 0;
  const rt = parseFloat(resultTicks) || 0;

  const { resultDollar, rrStr } = useMemo(() => {
    const rd = rt * tv * c;
    let rr = "";
    if (slN > 0 && rt !== 0) rr = `1 : ${(Math.abs(rt) / slN).toFixed(2)}`;
    return { resultDollar: rd, rrStr: rr };
  }, [rt, tv, c, slN]);

  /* eslint-disable react-hooks/set-state-in-effect -- Objekt-URL für die Vorschau anlegen und wieder freigeben */
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const section = (title: string) => (
    <Text
      fontSize="13px"
      lineHeight="18px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      color="var(--cc-text-soft)"
      mt={7}
      mb={3}
      pb={2}
      borderBottom="1px solid var(--cc-line)"
    >
      {title}
    </Text>
  );

  const saveTrade = async () => {
    if (!tradeDate || !sl || !tp) {
      toast({ title: "Bitte Datum, SL und TP ausfüllen.", status: "warning" });
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const slTicks = parseInt(sl, 10);
    const tpTicks = parseInt(tp, 10);
    const entryNum = entry.trim() ? parseFloat(entry) : null;

    const insertPayload = {
      journal_id: journalId,
      user_id: u.user.id,
      trade_date: tradeDate,
      trade_time: tradeTime.trim() || null,
      weekday: weekdayFromDate(tradeDate),
      strategy,
      asset,
      session: strategy === "ocrr" ? "NEW YORK" : session,
      direction,
      contracts: c,
      entry_price: entryNum,
      sl_ticks: slTicks,
      tp_ticks: tpTicks,
      result_ticks: rt,
      result_dollar: resultDollar,
      rr: rrStr || null,
      order_type: orderType,
      open_position: openPosition || null,
      news_events: newsEvents,
      news_result: newsResult || null,
      news_timing: newsTiming,
      emotion_before: emoB,
      emotion_after: emoA,
      notes: notes || null,
      scalp_zones: strategy === "scalp" ? scalpZones : [],
      scalp_pa: strategy === "scalp" ? scalpPa : [],
      ocrr_bias: strategy === "ocrr" ? ocrrBias : [],
      ocrr_conf: strategy === "ocrr" ? ocrrConf : [],
      ocrr_vol: strategy === "ocrr" ? ocrrVol : [],
      naked_zones: strategy === "naked" ? nakedZones : [],
      naked_bonus: strategy === "naked" ? nakedBonus : [],
      naked_vp: strategy === "naked" ? nakedVp : [],
    };

    const { data: inserted, error } = await supabase
      .from("trading_journal_trades")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      toast({ title: "Speichern fehlgeschlagen", description: error.message, status: "error" });
      return;
    }

    if (file && inserted?.id) {
      const qs = new URLSearchParams({
        tradeId: inserted.id,
        journalId,
        fileName: file.name,
        contentType: file.type || "image/jpeg",
      });
      const pres = await fetch(`/api/trading-journal/screenshot?${qs.toString()}`);
      const json = (await pres.json()) as { ok?: boolean; presignedUrl?: string; storageKey?: string; error?: string };
      if (json.ok && json.presignedUrl && json.storageKey) {
        const put = await fetch(json.presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
        if (put.ok) {
          await supabase.from("trading_journal_trades").update({ screenshot_storage_key: json.storageKey }).eq("id", inserted.id);
        }
      }
    }

    toast({ title: "Trade gespeichert", status: "success", duration: 3000 });
    setFile(null);
    setPreviewUrl(null);
    setNotes("");
    setResultTicks("");
    onSaved();
  };

  const tagRow = (
    label: string,
    pool: string[],
    selected: string[],
    setSelected: (s: string[]) => void,
    extra: string[],
    setExtra: (e: string[]) => void,
    addVal: string,
    setAddVal: (v: string) => void,
    onAdd: () => void,
  ) => (
    <Wrap spacing={2} mb={3}>
      {[...pool, ...extra].map((tag) => (
        <WrapItem key={tag}>
          <Button {...btnSx(selected.includes(tag))} onClick={() => setSelected(toggleInList(selected, tag))}>
            {tag}
          </Button>
        </WrapItem>
      ))}
      <WrapItem>
        <Button
          {...btnSx(false)}
          minW="36px"
          px={2}
          onClick={() => {
            const v = addVal.trim();
            if (!v) return;
            if (!extra.includes(v) && !pool.includes(v)) setExtra([...extra, v]);
            setSelected(toggleInList(selected, v));
            setAddVal("");
          }}
        >
          +
        </Button>
      </WrapItem>
      <WrapItem>
        <Input
          size="sm"
          maxW="160px"
          placeholder={label}
          value={addVal}
          onChange={(e) => setAddVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          {...inputSx}
        />
      </WrapItem>
    </Wrap>
  );

  return (
    <VStack align="stretch" spacing={0} maxW="100%">
      {section("Strategie")}
      <Grid templateColumns="repeat(3, 1fr)" gap={2} mb={6}>
        {(
          [
            ["scalp", "Scalping Balance Phasen"],
            ["ocrr", "NYSE OCRR"],
            ["naked", "Naked Zonen Scalping"],
          ] as const
        ).map(([k, lab]) => (
          <Button
            key={k}
            size="sm"
            {...btnSx(strategy === k)}
            py={3}
            h="auto"
            whiteSpace="normal"
            textAlign="center"
            onClick={() => setStrategy(k)}
          >
            {lab}
          </Button>
        ))}
      </Grid>

      {section("Trade Details")}
      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={3}>
        <GridItem>
          <Text {...fieldLabelProps}>Datum</Text>
          <Input type="date" className="cc-num" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} {...inputSx} />
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Wochentag</Text>
          <Flex
            h="40px"
            px={4}
            align="center"
            borderRadius="8px"
            border="1px solid var(--cc-line)"
            bg="rgba(255, 255, 255, 0.015)"
            fontSize="sm"
            color="var(--cc-text-soft)"
          >
            {weekdayFromDate(tradeDate)}
          </Flex>
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Uhrzeit</Text>
          <Input type="time" className="cc-num" value={tradeTime} onChange={(e) => setTradeTime(e.target.value)} {...inputSx} />
        </GridItem>
        {strategy !== "ocrr" ? (
          <GridItem>
            <Text {...fieldLabelProps}>Session</Text>
            <Select value={session} onChange={(e) => setSession(e.target.value)} {...selectSx}>
              <option>LONDON</option>
              <option>NEW YORK</option>
              <option>ASIA</option>
            </Select>
          </GridItem>
        ) : null}
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={3}>
        <GridItem>
          <Text {...fieldLabelProps}>Asset</Text>
          <Select value={asset} onChange={(e) => setAsset(e.target.value)} {...selectSx}>
            <optgroup label="Minis">
              {ASSETS.slice(0, 4).map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </optgroup>
            <optgroup label="Mikros">
              {ASSETS.slice(4).map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </optgroup>
          </Select>
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Richtung</Text>
          <HStack>
            <Button flex={1} {...btnSx(direction === "long")} onClick={() => setDirection("long")}>
              Long
            </Button>
            <Button flex={1} {...btnSx(direction === "short")} onClick={() => setDirection("short")}>
              Short
            </Button>
          </HStack>
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Kontrakte</Text>
          <Input type="number" min={1} value={contracts} onChange={(e) => setContracts(e.target.value)} className="cc-num" {...inputSx} />
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Entry Preis</Text>
          <Input
            type="number"
            step="0.01"
            placeholder="z.B. 2650.50"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="cc-num"
            {...inputSx}
          />
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={3}>
        <GridItem>
          <Text {...fieldLabelProps}>SL (Ticks)</Text>
          <Input type="number" min={1} value={sl} onChange={(e) => setSl(e.target.value)} className="cc-num" {...inputSx} />
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>TP (Ticks)</Text>
          <Input type="number" min={1} value={tp} onChange={(e) => setTp(e.target.value)} className="cc-num" {...inputSx} />
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Ergebnis (Ticks)</Text>
          <Input
            type="number"
            step={1}
            value={resultTicks}
            onChange={(e) => setResultTicks(e.target.value)}
            className="cc-num"
            {...inputSx}
          />
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Ergebnis ($) — auto</Text>
          <Input isReadOnly value={resultDollar.toFixed(2)} className="cc-num" {...readOnlySx} />
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <GridItem>
          <Text {...fieldLabelProps}>RR erreicht — auto</Text>
          <Input isReadOnly value={rrStr} className="cc-num" {...readOnlySx} />
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Order-Ausführung</Text>
          <HStack>
            <Button flex={1} {...btnSx(orderType === "limit")} onClick={() => setOrderType("limit")}>
              Limit Order
            </Button>
            <Button flex={1} {...btnSx(orderType === "market")} onClick={() => setOrderType("market")}>
              Market Execution
            </Button>
          </HStack>
        </GridItem>
      </Grid>

      {section("Marktöffnung")}
      <Grid templateColumns="repeat(3, 1fr)" gap={2} mb={4}>
        {["Im Value geöffnet", "Unter Value geöffnet", "Über Value geöffnet"].map((o) => (
          <Button key={o} {...btnSx(openPosition === o)} py={2} onClick={() => setOpenPosition(o)}>
            {o}
          </Button>
        ))}
      </Grid>

      {strategy === "scalp" ? (
        <>
          {section("Zonen")}
          {tagRow("Tag…", SCALP_ZONE_DEFAULTS, scalpZones, setScalpZones, extraScalpZ, setExtraScalpZ, addZ, setAddZ, () => {
            const v = addZ.trim();
            if (!v) return;
            if (!extraScalpZ.includes(v)) setExtraScalpZ([...extraScalpZ, v]);
            setScalpZones(toggleInList(scalpZones, v));
            setAddZ("");
          })}
          {section("PA Zone")}
          {tagRow("Tag…", SCALP_PA_DEFAULTS, scalpPa, setScalpPa, extraScalpPa, setExtraScalpPa, addPa, setAddPa, () => {
            const v = addPa.trim();
            if (!v) return;
            if (!extraScalpPa.includes(v)) setExtraScalpPa([...extraScalpPa, v]);
            setScalpPa(toggleInList(scalpPa, v));
            setAddPa("");
          })}
        </>
      ) : null}

      {strategy === "ocrr" ? (
        <>
          {section("Bias")}
          <Wrap spacing={2} mb={3}>
            {OCRR_BIAS.map((tag) => (
              <WrapItem key={tag}>
                <Button {...btnSx(ocrrBias.includes(tag))} onClick={() => setOcrrBias(toggleInList(ocrrBias, tag))}>
                  {tag}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
          {section("Confluences")}
          {tagRow("Confluence…", OCRR_CONF_DEFAULTS, ocrrConf, setOcrrConf, extraOcrrConf, setExtraOcrrConf, addConf, setAddConf, () => {
            const v = addConf.trim();
            if (!v) return;
            if (!extraOcrrConf.includes(v)) setExtraOcrrConf([...extraOcrrConf, v]);
            setOcrrConf(toggleInList(ocrrConf, v));
            setAddConf("");
          })}
          {section("Volumen über / unter Range")}
          <Wrap spacing={2} mb={3}>
            {OCRR_VOL.map((tag) => (
              <WrapItem key={tag}>
                <Button {...btnSx(ocrrVol.includes(tag))} onClick={() => setOcrrVol(toggleInList(ocrrVol, tag))}>
                  {tag}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
        </>
      ) : null}

      {strategy === "naked" ? (
        <>
          {section("Confluences — Zonen")}
          {tagRow("Zone…", NAKED_ZONE_DEFAULTS, nakedZones, setNakedZones, extraNakedZ, setExtraNakedZ, addNz, setAddNz, () => {
            const v = addNz.trim();
            if (!v) return;
            if (!extraNakedZ.includes(v)) setExtraNakedZ([...extraNakedZ, v]);
            setNakedZones(toggleInList(nakedZones, v));
            setAddNz("");
          })}
          {section("Bonus Confluences")}
          {tagRow("Confluence…", NAKED_BONUS_DEFAULTS, nakedBonus, setNakedBonus, extraNakedBonus, setExtraNakedBonus, addNb, setAddNb, () => {
            const v = addNb.trim();
            if (!v) return;
            if (!extraNakedBonus.includes(v)) setExtraNakedBonus([...extraNakedBonus, v]);
            setNakedBonus(toggleInList(nakedBonus, v));
            setAddNb("");
          })}
          {section("Volume Profile letzte NY Session")}
          <Wrap spacing={2} mb={3}>
            {NAKED_VP.map((tag) => (
              <WrapItem key={tag}>
                <Button {...btnSx(nakedVp.includes(tag))} onClick={() => setNakedVp(toggleInList(nakedVp, tag))}>
                  {tag}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
        </>
      ) : null}

      {section("News Events")}
      <Wrap spacing={2} mb={3}>
        {NEWS_EVENTS.map((tag) => (
          <WrapItem key={tag}>
            <Button {...btnSx(newsEvents.includes(tag))} onClick={() => setNewsEvents(toggleInList(newsEvents, tag))}>
              {tag}
            </Button>
          </WrapItem>
        ))}
      </Wrap>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3} mb={4}>
        <GridItem>
          <Text {...fieldLabelProps}>News Ausfall</Text>
          <Select value={newsResult} onChange={(e) => setNewsResult(e.target.value)} {...selectSx}>
            <option value="">— Auswählen —</option>
            <option>Besser als erwartet (Bullish)</option>
            <option>Schlechter als erwartet (Bearish)</option>
            <option>Wie erwartet (Neutral)</option>
            <option>Kein News-Event</option>
          </Select>
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Trade Timing zu News</Text>
          <Grid templateColumns="repeat(3, 1fr)" gap={1}>
            {["Vor News", "Während News", "Nach News"].map((t) => (
              <Button key={t} size="xs" {...btnSx(newsTiming === t)} onClick={() => setNewsTiming(t)}>
                {t}
              </Button>
            ))}
          </Grid>
        </GridItem>
      </Grid>

      {section("Emotionaler Zustand — Vor dem Trade")}
      <Grid templateColumns="repeat(5, 1fr)" gap={1} mb={4}>
        {["Sehr fokussiert", "Neutral", "Leicht gestresst", "Gierig", "Ängstlich"].map((t) => (
          <Button key={t} size="xs" whiteSpace="normal" h="auto" py={2} {...btnSx(emoB === t)} onClick={() => setEmoB(t)}>
            {t}
          </Button>
        ))}
      </Grid>
      {section("Emotionaler Zustand — Nach dem Trade")}
      <Grid templateColumns="repeat(5, 1fr)" gap={1} mb={4}>
        {["Zufrieden", "Neutral", "Frustriert", "Überrascht", "Reue"].map((t) => (
          <Button key={t} size="xs" whiteSpace="normal" h="auto" py={2} {...btnSx(emoA === t)} onClick={() => setEmoA(t)}>
            {t}
          </Button>
        ))}
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={6}>
        <GridItem>
          <Text {...fieldLabelProps}>Notizen</Text>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Warum dieser Trade?" {...inputSx} />
        </GridItem>
        <GridItem>
          <Text {...fieldLabelProps}>Screenshot</Text>
          <Flex
            border="1px dashed var(--cc-line-strong)"
            borderRadius="10px"
            bg="rgba(255, 255, 255, 0.02)"
            p={6}
            align="center"
            justify="center"
            direction="column"
            cursor="pointer"
            transition="border-color 180ms var(--cc-ease), background-color 180ms var(--cc-ease)"
            _hover={{ borderColor: "var(--cc-gold-line)", bg: "var(--cc-gold-wash)" }}
            onClick={() => document.getElementById("tj-sc-input")?.click()}
          >
            <Box color="var(--cc-gold-light)" mb={2}>
              <ImagePlus size={22} strokeWidth={1.75} aria-hidden />
            </Box>
            <Text fontSize="sm" color="var(--cc-text-2)">
              Chart-Screenshot ablegen oder klicken
            </Text>
            <input
              id="tj-sc-input"
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Flex>
          {previewUrl ? (
            <Box position="relative" mt={3}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                style={{ maxWidth: "100%", borderRadius: 10, border: "1px solid var(--cc-line-strong)" }}
              />
              <Button
                size="xs"
                variant="line"
                bg="rgba(14, 18, 23, 0.88)"
                px={1.5}
                position="absolute"
                top={2}
                right={2}
                aria-label="Screenshot entfernen"
                onClick={() => setFile(null)}
              >
                <X size={14} strokeWidth={1.75} />
              </Button>
            </Box>
          ) : null}
        </GridItem>
      </Grid>

      <Button
        variant="gold"
        w="100%"
        h="48px"
        fontSize="15px"
        letterSpacing="0.06em"
        onClick={() => void saveTrade()}
      >
        TRADE SPEICHERN
      </Button>
    </VStack>
  );
}
