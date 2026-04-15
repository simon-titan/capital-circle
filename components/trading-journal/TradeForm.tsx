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

const btnSx = (active: boolean) => ({
  variant: "outline" as const,
  borderColor: active ? "rgba(212, 175, 55, 0.55)" : "rgba(255,255,255,0.09)",
  bg: active ? "rgba(212, 175, 55, 0.12)" : "rgba(255,255,255,0.03)",
  color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
  _hover: { bg: active ? "rgba(212, 175, 55, 0.18)" : "rgba(255,255,255,0.06)" },
  className: "inter-medium",
});

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

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const section = (title: string) => (
    <Text fontSize="10px" color="var(--color-text-tertiary)" letterSpacing="0.1em" textTransform="uppercase" fontWeight={700} mt={6} mb={2} borderBottom="1px solid rgba(255,255,255,0.06)" pb={1}>
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
          bg="rgba(255,255,255,0.04)"
          borderColor="rgba(255,255,255,0.09)"
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
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Datum
          </Text>
          <Input type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)" />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Wochentag
          </Text>
          <Box
            px={3}
            py={2}
            borderRadius="md"
            border="1px solid rgba(255,255,255,0.09)"
            fontSize="sm"
            className="jetbrains-mono"
          >
            {weekdayFromDate(tradeDate)}
          </Box>
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Uhrzeit
          </Text>
          <Input type="time" value={tradeTime} onChange={(e) => setTradeTime(e.target.value)} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)" />
        </GridItem>
        {strategy !== "ocrr" ? (
          <GridItem>
            <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
              Session
            </Text>
            <Select value={session} onChange={(e) => setSession(e.target.value)} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)">
              <option>LONDON</option>
              <option>NEW YORK</option>
              <option>ASIA</option>
            </Select>
          </GridItem>
        ) : null}
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={3}>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Asset
          </Text>
          <Select value={asset} onChange={(e) => setAsset(e.target.value)} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)">
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
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Richtung
          </Text>
          <HStack>
            <Button
              flex={1}
              {...btnSx(direction === "long")}
              color={direction === "long" ? "var(--color-profit)" : undefined}
              onClick={() => setDirection("long")}
            >
              Long
            </Button>
            <Button
              flex={1}
              {...btnSx(direction === "short")}
              color={direction === "short" ? "var(--color-loss)" : undefined}
              onClick={() => setDirection("short")}
            >
              Short
            </Button>
          </HStack>
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Kontrakte
          </Text>
          <Input
            type="number"
            min={1}
            value={contracts}
            onChange={(e) => setContracts(e.target.value)}
            bg="rgba(255,255,255,0.04)"
            borderColor="rgba(255,255,255,0.09)"
            className="jetbrains-mono"
          />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Entry Preis
          </Text>
          <Input
            type="number"
            step="0.01"
            placeholder="z.B. 2650.50"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            bg="rgba(255,255,255,0.04)"
            borderColor="rgba(255,255,255,0.09)"
            className="jetbrains-mono"
          />
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={3}>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            SL (Ticks)
          </Text>
          <Input type="number" min={1} value={sl} onChange={(e) => setSl(e.target.value)} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)" className="jetbrains-mono" />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            TP (Ticks)
          </Text>
          <Input type="number" min={1} value={tp} onChange={(e) => setTp(e.target.value)} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)" className="jetbrains-mono" />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Ergebnis (Ticks)
          </Text>
          <Input
            type="number"
            step={1}
            value={resultTicks}
            onChange={(e) => setResultTicks(e.target.value)}
            bg="rgba(255,255,255,0.04)"
            borderColor="rgba(255,255,255,0.09)"
            className="jetbrains-mono"
          />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Ergebnis ($) — auto
          </Text>
          <Input isReadOnly value={resultDollar.toFixed(2)} bg="rgba(255,255,255,0.02)" borderColor="rgba(255,255,255,0.06)" className="jetbrains-mono" />
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3} mb={3}>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            RR erreicht — auto
          </Text>
          <Input isReadOnly value={rrStr} bg="rgba(255,255,255,0.02)" borderColor="rgba(255,255,255,0.06)" className="jetbrains-mono" />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Order-Ausführung
          </Text>
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
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            News Ausfall
          </Text>
          <Select value={newsResult} onChange={(e) => setNewsResult(e.target.value)} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)">
            <option value="">— Auswählen —</option>
            <option>Besser als erwartet (Bullish)</option>
            <option>Schlechter als erwartet (Bearish)</option>
            <option>Wie erwartet (Neutral)</option>
            <option>Kein News-Event</option>
          </Select>
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Trade Timing zu News
          </Text>
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

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={4}>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Notizen
          </Text>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} bg="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.09)" placeholder="Warum dieser Trade?" />
        </GridItem>
        <GridItem>
          <Text fontSize="xs" color="var(--color-text-secondary)" mb={1}>
            Screenshot
          </Text>
          <Flex
            border="2px dashed rgba(255,255,255,0.12)"
            borderRadius="md"
            p={6}
            align="center"
            justify="center"
            direction="column"
            cursor="pointer"
            onClick={() => document.getElementById("tj-sc-input")?.click()}
          >
            <Text fontSize="2xl" mb={1}>
              +
            </Text>
            <Text fontSize="sm" color="var(--color-text-tertiary)">
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
              <img src={previewUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
              <Button size="xs" position="absolute" top={2} right={2} onClick={() => setFile(null)}>
                ×
              </Button>
            </Box>
          ) : null}
        </GridItem>
      </Grid>

      <Button
        w="100%"
        py={6}
        bg="linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
        color="white"
        _hover={{ bg: "linear-gradient(135deg, #E8C547 0%, #D4AF37 100%)" }}
        onClick={() => void saveTrade()}
        className="inter-semibold"
      >
        TRADE SPEICHERN
      </Button>
    </VStack>
  );
}
