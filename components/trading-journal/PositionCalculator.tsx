"use client";

import {
  Box,
  Button,
  Collapse,
  Grid,
  GridItem,
  HStack,
  Input,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

const ASSETS = {
  NQ: { tickSize: 0.25, tickVal: 5 },
  MNQ: { tickSize: 0.25, tickVal: 0.5 },
  ES: { tickSize: 0.25, tickVal: 12.5 },
  MES: { tickSize: 0.25, tickVal: 1.25 },
  GC: { tickSize: 0.1, tickVal: 10 },
  MGC: { tickSize: 0.1, tickVal: 1 },
  CL: { tickSize: 0.01, tickVal: 10 },
  MCL: { tickSize: 0.01, tickVal: 1 },
} as const;

type AssetKey = keyof typeof ASSETS;

function fmt(v: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

/** Abschnittstitel wie Kartentitel: klein, gesperrt, versal. */
const secLabelSx = {
  fontSize: "13px",
  lineHeight: "18px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--cc-text-soft)",
  mb: 3,
};

const inputSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--cc-gold-line)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

const fieldLabelProps = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--cc-text-2)",
  mb: 1.5,
};

/** Umschalter: aktiv mit Gold-Verlauf von links und Gold-Haarlinie, inaktiv transparent. */
const toggleSx = (active: boolean) => ({
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

/** Segment-Umschalter ohne eigene Kontur (die trägt der Rahmen darum). */
const segmentSx = (active: boolean) => ({
  ...toggleSx(active),
  borderColor: active ? "var(--cc-gold-line)" : "transparent",
  boxShadow: active ? "0 0 14px rgba(212, 176, 128, 0.1)" : "none",
});

export function PositionCalculator() {
  const [cur, setCur] = useState<AssetKey>("NQ");
  const [mode, setMode] = useState<1 | 2>(1);
  const miniOpen = useDisclosure({ defaultIsOpen: true });
  const microOpen = useDisclosure();

  const [contracts1, setContracts1] = useState("1");
  const [sl1, setSl1] = useState("10");
  const [tp1, setTp1] = useState("20");
  const [rrIn, setRrIn] = useState("");

  const [acc, setAcc] = useState("50000");
  const [riskPct, setRiskPct] = useState("0.5");
  const [contracts2, setContracts2] = useState("1");
  const [tp2, setTp2] = useState("20");
  const [rrIn2, setRrIn2] = useState("");

  const a = ASSETS[cur];

  const derived = useMemo(() => {
    const c1 = parseFloat(contracts1) || 0;
    const sl = parseFloat(sl1) || 0;
    const tp = parseFloat(tp1) || 0;
    const c2 = parseFloat(contracts2) || 1;
    const accN = parseFloat(acc) || 0;
    const pct = parseFloat(riskPct) || 0;
    const tpM2 = parseFloat(tp2) || 0;

    const perTick = a.tickVal * (mode === 1 ? c1 : c2);

    if (mode === 1) {
      const loss = sl * perTick;
      const profit = tp * perTick;
      const rr = sl > 0 ? tp / sl : 0;
      return {
        perTick,
        loss,
        profit,
        rrStr: sl > 0 ? `1 : ${rr.toFixed(2)}` : "—",
        slTicks: sl,
        tpTicks: tp,
        maxRisk: null as number | null,
        slTicksCalc: null as number | null,
      };
    }

    const perTick2 = a.tickVal * c2;
    const maxRisk = accN * (pct / 100);
    const slTicksCalc = perTick2 > 0 ? Math.floor(maxRisk / perTick2) : 0;
    const loss = slTicksCalc * perTick2;
    const profit = tpM2 * perTick2;
    const rr = slTicksCalc > 0 ? tpM2 / slTicksCalc : 0;
    return {
      perTick: perTick2,
      loss,
      profit,
      rrStr: slTicksCalc > 0 ? `1 : ${rr.toFixed(2)}` : "—",
      slTicks: slTicksCalc,
      tpTicks: tpM2,
      maxRisk,
      slTicksCalc,
    };
  }, [a, mode, contracts1, sl1, tp1, acc, riskPct, contracts2, tp2]);

  const calcFromRR = () => {
    const rr = parseFloat(rrIn);
    const sl = parseFloat(sl1);
    if (!rr || !sl) return;
    setTp1(String(Math.round(sl * rr)));
    setRrIn("");
  };

  const calcFromRR2 = () => {
    const rr = parseFloat(rrIn2);
    const accN = parseFloat(acc) || 0;
    const pct = parseFloat(riskPct) || 0;
    const c = parseFloat(contracts2) || 1;
    const perTick = a.tickVal * c;
    const maxRisk = accN * (pct / 100);
    const slTicks = perTick > 0 ? Math.floor(maxRisk / perTick) : 0;
    if (!rr || !slTicks) return;
    setTp2(String(Math.round(slTicks * rr)));
    setRrIn2("");
  };

  const resultBox = (label: string, value: string, valueColor?: string) => (
    <Box bg="rgba(255, 255, 255, 0.03)" borderRadius="10px" border="1px solid var(--cc-line)" p={4}>
      <Text fontSize="12px" color="var(--cc-text-2)" mb={1.5}>
        {label}
      </Text>
      <Text fontSize="xl" fontWeight={600} letterSpacing="-0.01em" color={valueColor ?? "var(--cc-text)"} className="cc-num">
        {value}
      </Text>
    </Box>
  );

  const groupToggle = (label: string, open: boolean, onToggle: () => void) => (
    <Button
      w="100%"
      justifyContent="space-between"
      size="sm"
      variant="line"
      onClick={onToggle}
      rightIcon={
        <Box
          as="span"
          display="inline-flex"
          color="var(--cc-text-2)"
          transform={open ? "rotate(180deg)" : undefined}
          transition="transform 0.2s"
        >
          <ChevronDown size={16} strokeWidth={1.75} />
        </Box>
      }
      mb={2}
    >
      {label}
    </Button>
  );

  const assetTile = (key: AssetKey) => (
    <Button
      key={key}
      size="sm"
      py={2.5}
      flexDirection="column"
      h="auto"
      {...toggleSx(cur === key)}
      onClick={() => setCur(key)}
    >
      {key}
      <Text
        as="span"
        fontSize="10px"
        fontWeight={400}
        color={cur === key ? "var(--cc-text-2)" : "var(--cc-text-3)"}
        display="block"
        mt={0.5}
        className="cc-num"
      >
        ${ASSETS[key].tickVal} / tick
      </Text>
    </Button>
  );

  return (
    <VStack align="stretch" spacing={0} maxW="620px" w="100%" mx="auto">
      <Text {...secLabelSx}>Instrument</Text>

      {groupToggle("Minis", miniOpen.isOpen, miniOpen.onToggle)}
      <Collapse in={miniOpen.isOpen} animateOpacity>
        <Grid templateColumns="repeat(4, 1fr)" gap={2} mb={3}>
          {(["NQ", "ES", "GC", "CL"] as const).map(assetTile)}
        </Grid>
      </Collapse>

      {groupToggle("Mikros", microOpen.isOpen, microOpen.onToggle)}
      <Collapse in={microOpen.isOpen} animateOpacity>
        <Grid templateColumns="repeat(4, 1fr)" gap={2} mb={3}>
          {(["MNQ", "MES", "MGC", "MCL"] as const).map(assetTile)}
        </Grid>
      </Collapse>

      <Box borderTop="1px solid var(--cc-line)" my={5} />

      <Text {...secLabelSx}>Modus</Text>
      <HStack
        gap={1}
        p={1}
        mb={5}
        border="1px solid var(--cc-line)"
        borderRadius="10px"
        bg="rgba(255, 255, 255, 0.02)"
      >
        <Button flex={1} size="sm" {...segmentSx(mode === 1)} onClick={() => setMode(1)}>
          Ticks eingeben
        </Button>
        <Button flex={1} size="sm" {...segmentSx(mode === 2)} onClick={() => setMode(2)}>
          Account-basiert rechnen
        </Button>
      </HStack>

      {mode === 1 ? (
        <>
          <Grid templateColumns="1fr 1fr" gap={3} mb={5}>
            <GridItem>
              <Text {...fieldLabelProps}>Kontrakte</Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={contracts1}
                onChange={(e) => setContracts1(e.target.value)}
                {...inputSx}
                className="cc-num"
              />
            </GridItem>
            <GridItem>
              <Text {...fieldLabelProps}>Stop Loss (Ticks)</Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={sl1}
                onChange={(e) => setSl1(e.target.value)}
                {...inputSx}
                className="cc-num"
              />
            </GridItem>
            <GridItem>
              <Text {...fieldLabelProps}>Take Profit (Ticks)</Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={tp1}
                onChange={(e) => setTp1(e.target.value)}
                {...inputSx}
                className="cc-num"
              />
            </GridItem>
            <GridItem>
              <Text {...fieldLabelProps}>RR eingeben → TP Ticks berechnen</Text>
              <HStack>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  placeholder="z.B. 2.5"
                  value={rrIn}
                  onChange={(e) => setRrIn(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcFromRR()}
                  {...inputSx}
                  className="cc-num"
                />
              </HStack>
            </GridItem>
          </Grid>
        </>
      ) : (
        <>
          <Grid templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap={3} mb={5}>
            <GridItem>
              <Text {...fieldLabelProps}>Account Größe ($)</Text>
              <Input
                type="number"
                min={1}
                step={100}
                value={acc}
                onChange={(e) => setAcc(e.target.value)}
                {...inputSx}
                className="cc-num"
              />
            </GridItem>
            <GridItem>
              <Text {...fieldLabelProps}>Risiko (%)</Text>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                {...inputSx}
                className="cc-num"
              />
            </GridItem>
            <GridItem>
              <Text {...fieldLabelProps}>Kontrakte</Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={contracts2}
                onChange={(e) => setContracts2(e.target.value)}
                {...inputSx}
                className="cc-num"
              />
            </GridItem>
          </Grid>
          <Grid templateColumns="1fr 1fr" gap={3} mb={5}>
            <GridItem>
              <Text {...fieldLabelProps}>Take Profit (Ticks)</Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={tp2}
                onChange={(e) => setTp2(e.target.value)}
                {...inputSx}
                className="cc-num"
              />
            </GridItem>
            <GridItem>
              <Text {...fieldLabelProps}>RR eingeben → TP Ticks berechnen</Text>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                placeholder="z.B. 2.5"
                value={rrIn2}
                onChange={(e) => setRrIn2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && calcFromRR2()}
                {...inputSx}
                className="cc-num"
              />
            </GridItem>
          </Grid>
        </>
      )}

      <HStack
        flexWrap="wrap"
        gap={4}
        py={2.5}
        px={3.5}
        bg="rgba(255, 255, 255, 0.03)"
        borderRadius="10px"
        border="1px solid var(--cc-line)"
        mb={5}
        fontSize="sm"
        color="var(--cc-text-2)"
      >
        <Box>
          Asset:{" "}
          <Text as="span" color="var(--cc-text)" fontWeight={500}>
            {cur}
          </Text>
        </Box>
        <Box>
          Tick-Größe:{" "}
          <Text as="span" color="var(--cc-text)" fontWeight={500} className="cc-num">
            {a.tickSize}
          </Text>
        </Box>
        <Box>
          Tick-Wert:{" "}
          <Text as="span" color="var(--cc-text)" fontWeight={500} className="cc-num">
            ${a.tickVal.toFixed(2)}
          </Text>
        </Box>
        <Box>
          Wert je Kontrakt/Tick:{" "}
          <Text as="span" color="var(--cc-text)" fontWeight={500} className="cc-num">
            ${fmt(derived.perTick)}
          </Text>
        </Box>
      </HStack>

      <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={3}>
        {resultBox("Risiko (SL)", `$${fmt(derived.loss)}`, "var(--color-loss)")}
        {resultBox("Potenz. Gewinn (TP)", `$${fmt(derived.profit)}`, "var(--color-profit)")}
        {resultBox("RR Ratio", derived.rrStr, "var(--cc-gold-light)")}
      </Grid>

      <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={3}>
        {resultBox("SL in Ticks", `${derived.slTicks} Ticks`)}
        {resultBox("TP in Ticks", `${derived.tpTicks} Ticks`)}
        {resultBox("Wert je Tick", `$${fmt(derived.perTick)}`)}
      </Grid>

      {mode === 2 && derived.maxRisk != null && derived.slTicksCalc != null ? (
        <Grid templateColumns="repeat(2, 1fr)" gap={3} mb={2}>
          {resultBox("Max. Risiko in $", `$${fmt(derived.maxRisk)}`, "var(--color-loss)")}
          {resultBox("Empfohlener SL", `${derived.slTicksCalc} Ticks`, "var(--cc-gold-light)")}
        </Grid>
      ) : null}
    </VStack>
  );
}
