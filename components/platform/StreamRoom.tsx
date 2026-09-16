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
  // Uhr für die Laufzeit-Anzeige; die Minuten werden daraus abgeleitet (kein setState im Effekt-Körper).
  const [now, setNow] = useState<number>(() => Date.now());
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
        setNow(Date.now());
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
    if (!status.isLive || !status.startedAt) return;
    const tick = setInterval(() => {
      setNow(Date.now());
    }, ELAPSED_TICK_MS);
    return () => clearInterval(tick);
  }, [status.isLive, status.startedAt]);
  const elapsedMin = computeElapsedMin(status.startedAt, now);

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
    <Box w="100%" className="cc-rise" style={{ animationDelay: "150ms" }}>
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

/** Champagner-Punkt mit sich ausbreitendem Ring (`.cc-ping`) — wie auf der Live-Karte im Dashboard. */
function LiveDot() {
  return (
    <Box as="span" position="relative" display="inline-flex" w="8px" h="8px" flexShrink={0} aria-hidden>
      <Box as="span" className="cc-ping" position="absolute" inset={0} borderRadius="full" bg="var(--cc-gold)" />
      <Box
        as="span"
        position="relative"
        w="8px"
        h="8px"
        borderRadius="full"
        bg="var(--cc-gold-light)"
        boxShadow="0 0 10px rgba(232, 192, 148, 0.85)"
      />
    </Box>
  );
}

/** Glas-Pille über dem Video (Live-Status, Titel). */
const OVERLAY_PILL = {
  px: 3,
  py: 1.5,
  borderRadius: "full",
  bg: "rgba(18, 23, 28, 0.72)",
  backdropFilter: "blur(10px)",
  borderWidth: "1px",
  borderStyle: "solid",
} as const;

/** Live-Player: Medienrahmen (10px) mit Gold-Rand und Gold-Schein, Overlay-Status oben. */
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
      borderRadius="10px"
      overflow="clip"
      border="1px solid rgba(212, 176, 128, 0.28)"
      boxShadow="0 10px 28px rgba(0, 0, 0, 0.45), 0 0 40px rgba(212, 176, 128, 0.14)"
      bg="var(--cc-bg)"
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
        {...OVERLAY_PILL}
        borderColor="rgba(212, 176, 128, 0.35)"
        pointerEvents="none"
      >
        <LiveDot />
        <Text fontSize="12px" fontWeight={600} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-gold-light)">
          Live
        </Text>
        <Text fontSize="12px" color="var(--cc-text-3)" aria-hidden>
          ·
        </Text>
        <Text fontSize="12px" className="cc-num" color="var(--cc-text-soft)">
          seit {formatElapsed(elapsedMin)}
        </Text>
      </Flex>

      {/* Titel-Chip oben rechts (auf groesseren Screens) */}
      <Box
        position="absolute"
        top={{ base: 3, md: 4 }}
        right={{ base: 3, md: 4 }}
        display={{ base: "none", md: "block" }}
        maxW="320px"
        {...OVERLAY_PILL}
        borderColor="var(--cc-line-strong)"
        pointerEvents="none"
      >
        <Text fontSize="12px" fontWeight={500} color="var(--cc-text-soft)" noOfLines={1} title={title}>
          {title}
        </Text>
      </Box>
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
    <Flex
      className="cc-card cc-card--still"
      w="full"
      direction="column"
      align="center"
      justify="center"
      textAlign="center"
      gap={5}
      px={{ base: 5, md: 12 }}
      py={{ base: 10, md: 12 }}
      aspectRatio={{ base: "auto", md: "16 / 9" }}
    >
      {/* Weicher Champagner-Schein hinter dem Inhalt */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="inherit"
        pointerEvents="none"
        bg="radial-gradient(ellipse 60% 55% at 50% 45%, rgba(212, 176, 128, 0.08) 0%, transparent 70%)"
        aria-hidden
      />
      <Flex
        position="relative"
        align="center"
        justify="center"
        w={{ base: "64px", md: "80px" }}
        h={{ base: "64px", md: "80px" }}
        borderRadius="full"
        border="1px solid var(--cc-line-strong)"
        bg="rgba(255, 255, 255, 0.02)"
        boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.05)"
        color="var(--cc-text)"
      >
        <Radio size={32} strokeWidth={1.5} aria-hidden />
      </Flex>
      <Stack position="relative" spacing={2} maxW="520px">
        <Text
          as="h2"
          fontSize={{ base: "20px", md: "24px" }}
          fontWeight={600}
          lineHeight={1.25}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
        >
          {headline}
        </Text>
        <Text fontSize={{ base: "14px", md: "15px" }} lineHeight={1.6} color="var(--cc-text-2)">
          {subtext}
        </Text>
      </Stack>
      <Flex position="relative" align="center" gap={2} color="var(--cc-text-3)">
        <Box
          as="span"
          display="inline-flex"
          sx={{
            animation: "cc-stream-spin 3s linear infinite",
            "@keyframes cc-stream-spin": {
              from: { transform: "rotate(0deg)" },
              to: { transform: "rotate(360deg)" },
            },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        >
          <RefreshCw size={12} aria-hidden />
        </Box>
        <Text fontSize="12px" letterSpacing="0.06em" className="cc-num">
          Auto-Refresh alle 15 s
        </Text>
      </Flex>
    </Flex>
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

function computeElapsedMin(startedAt: string | null, now: number): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 0;
  const diffMs = now - start;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 60_000);
}
