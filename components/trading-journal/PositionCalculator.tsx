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

const secLabelSx = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--color-text-tertiary)",
  mb: 2,
};

const inputWrapSx = {
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "10px",
  bg: "rgba(255,255,255,0.04)",
  _focusWithin: { borderColor: "rgba(212, 175, 55, 0.55)", boxShadow: "0 0 0 1px rgba(212, 175, 55, 0.12)" },
};

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
    <Box
      bg="rgba(255,255,255,0.04)"
      borderRadius="10px"
      border="1px solid rgba(255,255,255,0.08)"
      p={4}
    >
      <Text fontSize="12px" color="var(--color-text-tertiary)" mb={1.5}>
        {label}
      </Text>
      <Text fontSize="xl" fontWeight={500} color={valueColor ?? "var(--color-text-primary)"} className="jetbrains-mono">
        {value}
      </Text>
    </Box>
  );

  return (
    <VStack align="stretch" spacing={0} maxW="620px" py={6} w="100%" mx="auto">
      <Text {...secLabelSx}>Instrument</Text>

      <Button
        w="100%"
        justifyContent="space-between"
        size="sm"
        variant="outline"
        borderColor="rgba(255,255,255,0.09)"
        bg="rgba(255,255,255,0.03)"
        onClick={miniOpen.onToggle}
        rightIcon={
          <Text as="span" fontSize="10px" transform={miniOpen.isOpen ? "rotate(180deg)" : undefined} transition="transform 0.2s">
            ▼
          </Text>
        }
        className="inter-medium"
        mb={1.5}
      >
        Minis
      </Button>
      <Collapse in={miniOpen.isOpen} animateOpacity>
        <Grid templateColumns="repeat(4, 1fr)" gap={2} mb={2.5}>
          {(["NQ", "ES", "GC", "CL"] as const).map((key) => (
            <Button
              key={key}
              size="sm"
              py={2.5}
              variant="outline"
              flexDirection="column"
              h="auto"
              borderWidth={cur === key ? "2px" : "1px"}
              borderColor={cur === key ? "rgba(212, 175, 55, 0.65)" : "rgba(255,255,255,0.09)"}
              bg={cur === key ? "rgba(212, 175, 55, 0.08)" : "rgba(255,255,255,0.03)"}
              color={cur === key ? "var(--color-text-primary)" : "var(--color-text-secondary)"}
              onClick={() => setCur(key)}
              className="inter-medium"
            >
              {key}
              <Text as="span" fontSize="10px" fontWeight={400} color="var(--color-text-tertiary)" display="block" mt={0.5}>
                ${ASSETS[key].tickVal} / tick
              </Text>
            </Button>
          ))}
        </Grid>
      </Collapse>

      <Button
        w="100%"
        justifyContent="space-between"
        size="sm"
        variant="outline"
        borderColor="rgba(255,255,255,0.09)"
        bg="rgba(255,255,255,0.03)"
        onClick={microOpen.onToggle}
        rightIcon={
          <Text as="span" fontSize="10px" transform={microOpen.isOpen ? "rotate(180deg)" : undefined} transition="transform 0.2s">
            ▼
          </Text>
        }
        className="inter-medium"
        mb={1.5}
      >
        Mikros
      </Button>
      <Collapse in={microOpen.isOpen} animateOpacity>
        <Grid templateColumns="repeat(4, 1fr)" gap={2} mb={2.5}>
          {(["MNQ", "MES", "MGC", "MCL"] as const).map((key) => (
            <Button
              key={key}
              size="sm"
              py={2.5}
              variant="outline"
              flexDirection="column"
              h="auto"
              borderWidth={cur === key ? "2px" : "1px"}
              borderColor={cur === key ? "rgba(212, 175, 55, 0.65)" : "rgba(255,255,255,0.09)"}
              bg={cur === key ? "rgba(212, 175, 55, 0.08)" : "rgba(255,255,255,0.03)"}
              color={cur === key ? "var(--color-text-primary)" : "var(--color-text-secondary)"}
              onClick={() => setCur(key)}
              className="inter-medium"
            >
              {key}
              <Text as="span" fontSize="10px" fontWeight={400} color="var(--color-text-tertiary)" display="block" mt={0.5}>
                ${ASSETS[key].tickVal} / tick
              </Text>
            </Button>
          ))}
        </Grid>
      </Collapse>

      <Box borderTop="1px solid rgba(255,255,255,0.06)" my={5} />

      <Text {...secLabelSx}>Modus</Text>
      <HStack gap={2} mb={5}>
        <Button
          flex={1}
          size="sm"
          variant={mode === 1 ? "solid" : "outline"}
          {...(mode === 1
            ? {
                bg: "linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)",
                color: "white",
                _hover: { bg: "linear-gradient(135deg, #E8C547 0%, #D4AF37 100%)" },
              }
            : { borderColor: "rgba(255,255,255,0.09)" })}
          onClick={() => setMode(1)}
          className="inter-medium"
        >
          Ticks eingeben
        </Button>
        <Button
          flex={1}
          size="sm"
          variant={mode === 2 ? "solid" : "outline"}
          {...(mode === 2
            ? {
                bg: "linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)",
                color: "white",
                _hover: { bg: "linear-gradient(135deg, #E8C547 0%, #D4AF37 100%)" },
              }
            : { borderColor: "rgba(255,255,255,0.09)" })}
          onClick={() => setMode(2)}
          className="inter-medium"
        >
          Account-basiert rechnen
        </Button>
      </HStack>

      {mode === 1 ? (
        <>
          <Grid templateColumns="1fr 1fr" gap={3} mb={5}>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                Kontrakte
              </Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={contracts1}
                onChange={(e) => setContracts1(e.target.value)}
                sx={inputWrapSx}
                className="jetbrains-mono"
              />
            </GridItem>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                Stop Loss (Ticks)
              </Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={sl1}
                onChange={(e) => setSl1(e.target.value)}
                sx={inputWrapSx}
                className="jetbrains-mono"
              />
            </GridItem>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                Take Profit (Ticks)
              </Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={tp1}
                onChange={(e) => setTp1(e.target.value)}
                sx={inputWrapSx}
                className="jetbrains-mono"
              />
            </GridItem>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                RR eingeben → TP Ticks berechnen
              </Text>
              <HStack>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  placeholder="z.B. 2.5"
                  value={rrIn}
                  onChange={(e) => setRrIn(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcFromRR()}
                  sx={inputWrapSx}
                  className="jetbrains-mono"
                />
              </HStack>
            </GridItem>
          </Grid>
        </>
      ) : (
        <>
          <Grid templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap={3} mb={5}>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                Account Größe ($)
              </Text>
              <Input
                type="number"
                min={1}
                step={100}
                value={acc}
                onChange={(e) => setAcc(e.target.value)}
                sx={inputWrapSx}
                className="jetbrains-mono"
              />
            </GridItem>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                Risiko (%)
              </Text>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                sx={inputWrapSx}
                className="jetbrains-mono"
              />
            </GridItem>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                Kontrakte
              </Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={contracts2}
                onChange={(e) => setContracts2(e.target.value)}
                sx={inputWrapSx}
                className="jetbrains-mono"
              />
            </GridItem>
          </Grid>
          <Grid templateColumns="1fr 1fr" gap={3} mb={5}>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                Take Profit (Ticks)
              </Text>
              <Input
                type="number"
                min={1}
                step={1}
                value={tp2}
                onChange={(e) => setTp2(e.target.value)}
                sx={inputWrapSx}
                className="jetbrains-mono"
              />
            </GridItem>
            <GridItem>
              <Text fontSize="sm" color="var(--color-text-secondary)" mb={1.5}>
                RR eingeben → TP Ticks berechnen
              </Text>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                placeholder="z.B. 2.5"
                value={rrIn2}
                onChange={(e) => setRrIn2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && calcFromRR2()}
                sx={inputWrapSx}
                className="jetbrains-mono"
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
        bg="rgba(255,255,255,0.04)"
        borderRadius="10px"
        border="1px solid rgba(255,255,255,0.06)"
        mb={5}
        fontSize="sm"
        color="var(--color-text-secondary)"
      >
        <Box>
          Asset:{" "}
          <Text as="span" color="var(--color-text-primary)" fontWeight={500} className="jetbrains-mono">
            {cur}
          </Text>
        </Box>
        <Box>
          Tick-Größe:{" "}
          <Text as="span" color="var(--color-text-primary)" fontWeight={500} className="jetbrains-mono">
            {a.tickSize}
          </Text>
        </Box>
        <Box>
          Tick-Wert:{" "}
          <Text as="span" color="var(--color-text-primary)" fontWeight={500} className="jetbrains-mono">
            ${a.tickVal.toFixed(2)}
          </Text>
        </Box>
        <Box>
          Wert je Kontrakt/Tick:{" "}
          <Text as="span" color="var(--color-text-primary)" fontWeight={500} className="jetbrains-mono">
            ${fmt(derived.perTick)}
          </Text>
        </Box>
      </HStack>

      <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={3}>
        {resultBox("Risiko (SL)", `$${fmt(derived.loss)}`, "var(--color-loss)")}
        {resultBox("Potenz. Gewinn (TP)", `$${fmt(derived.profit)}`, "var(--color-profit)")}
        {resultBox("RR Ratio", derived.rrStr, "rgba(212, 175, 55, 0.95)")}
      </Grid>

      <Grid templateColumns="repeat(3, 1fr)" gap={3} mb={3}>
        {resultBox("SL in Ticks", `${derived.slTicks} Ticks`)}
        {resultBox("TP in Ticks", `${derived.tpTicks} Ticks`)}
        {resultBox("Wert je Tick", `$${fmt(derived.perTick)}`)}
      </Grid>

      {mode === 2 && derived.maxRisk != null && derived.slTicksCalc != null ? (
        <Grid templateColumns="repeat(2, 1fr)" gap={3} mb={2}>
          {resultBox("Max. Risiko in $", `$${fmt(derived.maxRisk)}`, "var(--color-loss)")}
          {resultBox("Empfohlener SL", `${derived.slTicksCalc} Ticks`, "var(--color-warning)")}
        </Grid>
      ) : null}
    </VStack>
  );
}
