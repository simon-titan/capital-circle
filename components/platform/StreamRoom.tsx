"use client";

import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { Radio, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type StreamStatus = {
  isLive: boolean;
  streamId: string | null;
  title: string;
  startedAt: string | null;
  updatedAt: string | null;
};

type Props = {
  initialStatus: StreamStatus;
  /** Cloudflare-Customer-Subdomain (z. B. "customer-abc123") — ohne Protokoll. */
  customerSubdomain: string;
};

const POLL_INTERVAL_MS = 15_000;
const ELAPSED_TICK_MS = 30_000;

/**
 * StreamRoom — Client-seitiger Live-Stream-Viewer.
 *
 * - Pollt alle 15 s /api/stream/status und aktualisiert den Live-Zustand.
 * - Rendert den Cloudflare-Stream-iframe wenn is_live + streamId vorliegen.
 */
export function StreamRoom({ initialStatus, customerSubdomain }: Props) {
  const [status, setStatus] = useState<StreamStatus>(initialStatus);
  const [elapsedMin, setElapsedMin] = useState<number>(() => computeElapsedMin(initialStatus.startedAt));
  // Verhindert State-Update nach Unmount.
  const mountedRef = useRef(true);

  // 15s-Polling des Live-Status.
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/stream/status", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { ok: boolean; status?: StreamStatus };
        if (!json.ok || !json.status) return;
        if (cancelled || !mountedRef.current) return;
        setStatus(json.status);
      } catch {
        // Netz- / Auth-Fehler ignorieren — naechster Tick versucht's erneut.
      }
    }

    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Elapsed-Timer (grob, nur Minuten-Genauigkeit reicht fuer die Anzeige).
  useEffect(() => {
    setElapsedMin(computeElapsedMin(status.startedAt));
    if (!status.isLive || !status.startedAt) return;
    const tick = setInterval(() => {
      setElapsedMin(computeElapsedMin(status.startedAt));
    }, ELAPSED_TICK_MS);
    return () => clearInterval(tick);
  }, [status.isLive, status.startedAt]);

  const iframeSrc = useMemo(() => {
    if (!status.streamId || !customerSubdomain) return null;
    // Defensiv: falls die Subdomain versehentlich mit ".cloudflarestream.com" eingetragen wurde, kuerzen.
    const subdomain = customerSubdomain
      .replace(/\.cloudflarestream\.com\/?$/i, "")
      .trim();
    // autoplay erlaubt nur mit muted=true (Browser-Policy). Nutzer kann im Player entmuten.
    // poster wird weggelassen — ein leerer String ist kein gueltiger URL-Wert (Cloudflare-Fehler).
    const params = new URLSearchParams({
      autoplay: "true",
      muted: "true",
      preload: "auto",
      controls: "true",
    });
    return `https://${subdomain}.cloudflarestream.com/${status.streamId}/iframe?${params.toString()}`;
  }, [status.streamId, customerSubdomain]);

  const envMissing = customerSubdomain.trim().length === 0;
  const canShowPlayer = status.isLive && Boolean(status.streamId) && !envMissing;

  return (
    <Box w="100%">
      {canShowPlayer ? (
        <LivePlayer
          src={iframeSrc!}
          title={status.title}
          elapsedMin={elapsedMin}
        />
      ) : (
        <OfflineCard
          reason={envMissing ? "env-missing" : status.isLive ? "no-uid" : "offline"}
        />
      )}
    </Box>
  );
}

/** Live-Player mit 16:9-Glas-Frame und Overlay-Controls. */
function LivePlayer({
  src,
  title,
  elapsedMin,
}: {
  src: string;
  title: string;
  elapsedMin: number;
}) {
  return (
    <Box
      position="relative"
      w="full"
      borderRadius="20px"
      overflow="clip"
      borderWidth="1px"
      borderColor="rgba(255, 255, 255, 0.09)"
      boxShadow="0 0 40px rgba(74, 144, 217, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
      bg="#000"
      sx={{ aspectRatio: "16 / 9" }}
    >
      <iframe
        src={src}
        title={title}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "0",
          display: "block",
        }}
      />
      {/* Live-Badge oben links */}
      <Flex
        position="absolute"
        top={{ base: 3, md: 4 }}
        left={{ base: 3, md: 4 }}
        align="center"
        gap={2}
        px={3}
        py={1.5}
        borderRadius="999px"
        bg="rgba(0, 0, 0, 0.55)"
        backdropFilter="blur(10px)"
        borderWidth="1px"
        borderColor="rgba(255, 255, 255, 0.08)"
        pointerEvents="none"
      >
        <Box
          w="8px"
          h="8px"
          borderRadius="full"
          bg="#ef4444"
          boxShadow="0 0 10px rgba(239, 68, 68, 0.8)"
          sx={{
            animation: "streamPulse 1.6s ease-in-out infinite",
            "@keyframes streamPulse": {
              "0%, 100%": { opacity: 1, transform: "scale(1)" },
              "50%": { opacity: 0.55, transform: "scale(0.85)" },
            },
          }}
        />
        <Text
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          className="inter-semibold"
          color="white"
        >
          Live
        </Text>
        <Text fontSize="xs" color="rgba(255,255,255,0.55)">
          •
        </Text>
        <Text fontSize="xs" className="jetbrains-mono" color="rgba(255,255,255,0.85)">
          seit {formatElapsed(elapsedMin)}
        </Text>
      </Flex>

      {/* Titel-Chip oben rechts (auf groesseren Screens) */}
      <Flex
        position="absolute"
        top={{ base: 3, md: 4 }}
        right={{ base: 3, md: 4 }}
        align="center"
        gap={2}
        display={{ base: "none", md: "flex" }}
        pointerEvents="none"
      >
        <Box
          px={3}
          py={1.5}
          borderRadius="999px"
          bg="rgba(0, 0, 0, 0.55)"
          backdropFilter="blur(10px)"
          borderWidth="1px"
          borderColor="rgba(255, 255, 255, 0.08)"
          maxW="320px"
        >
          <Text
            fontSize="xs"
            className="inter-semibold"
            color="rgba(255,255,255,0.88)"
            noOfLines={1}
            title={title}
          >
            {title}
          </Text>
        </Box>
      </Flex>

    </Box>
  );
}

/** Offline-Karte — wenn kein Stream aktiv. */
function OfflineCard({ reason }: { reason: "offline" | "no-uid" | "env-missing" }) {
  const headline =
    reason === "env-missing"
      ? "Stream-Konfiguration unvollstaendig"
      : reason === "no-uid"
      ? "Stream wird vorbereitet…"
      : "Kein Live-Event aktiv";

  const subtext =
    reason === "env-missing"
      ? "Die Cloudflare-Customer-Subdomain fehlt in der Konfiguration. Bitte Admin kontaktieren."
      : reason === "no-uid"
      ? "Der Stream ist eingeschaltet, aber die Video-UID wurde noch nicht gesetzt. Einen Moment bitte."
      : "Sobald Emre live geht, siehst du es hier automatisch — diese Seite aktualisiert sich im Hintergrund alle 15 Sekunden.";

  return (
    <Box
      position="relative"
      w="full"
      borderRadius="20px"
      overflow="hidden"
      borderWidth="1px"
      borderColor="rgba(255, 255, 255, 0.08)"
      bg="rgba(15, 18, 24, 0.72)"
      backdropFilter="blur(16px)"
      boxShadow="0 0 60px rgba(74, 144, 217, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
      sx={{ aspectRatio: "16 / 9" }}
    >
      {/* Dekorativer Glow */}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        bg="radial-gradient(ellipse at center, rgba(74, 144, 217, 0.10) 0%, rgba(0,0,0,0) 60%)"
      />
      <Flex
        position="absolute"
        inset={0}
        align="center"
        justify="center"
        direction="column"
        textAlign="center"
        px={{ base: 6, md: 12 }}
        gap={5}
      >
        <Flex
          align="center"
          justify="center"
          w={{ base: "72px", md: "88px" }}
          h={{ base: "72px", md: "88px" }}
          borderRadius="50%"
          bg="linear-gradient(145deg, rgba(74, 144, 217, 0.30), rgba(30, 58, 138, 0.18))"
          borderWidth="1px"
          borderColor="rgba(100, 170, 240, 0.42)"
          boxShadow="0 0 34px rgba(74, 144, 217, 0.24)"
        >
          <Radio size={36} strokeWidth={1.6} aria-hidden style={{ color: "white" }} />
        </Flex>
        <Stack gap={2} maxW="520px">
          <Text
            as="h2"
            className="radley-regular"
            fontSize={{ base: "xl", md: "2xl" }}
            color="var(--color-text-primary)"
          >
            {headline}
          </Text>
          <Text className="inter" fontSize="sm" color="var(--color-text-muted)" lineHeight="1.6">
            {subtext}
          </Text>
        </Stack>
        <Flex align="center" gap={2} color="rgba(255,255,255,0.4)">
          <RefreshCw
            size={12}
            aria-hidden
            style={{
              animation: "streamSpin 3s linear infinite",
            }}
          />
          <Text fontSize="xs" className="inter" letterSpacing="0.06em">
            Auto-Refresh alle 15 s
          </Text>
        </Flex>
      </Flex>
      <Box
        sx={{
          "@keyframes streamSpin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" },
          },
        }}
      />
    </Box>
  );
}

/** Formatierter Elapsed-String: "3 Min", "1 h 12 Min". */
function formatElapsed(minutes: number): string {
  if (minutes <= 0) return "< 1 Min";
  if (minutes < 60) return `${minutes} Min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} Min`;
}

function computeElapsedMin(startedAt: string | null): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 0;
  const diffMs = Date.now() - start;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 60_000);
}
