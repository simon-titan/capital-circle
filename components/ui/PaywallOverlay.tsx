"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { GlowButton } from "@/components/ui/GlowButton";

interface PaywallOverlayProps {
  /** When true the overlay blocks interactions and shows the paywall card. */
  active: boolean;
  children: ReactNode;
}

/**
 * Wraps page content so free users can *see* the full layout but cannot
 * interact with it.  A draggable glass-card dialog floats on top with a
 * single CTA that links to /bewerbung.
 *
 * Scrolling the page underneath still works (pointer-events: none on the
 * content wrapper lets wheel / touch-scroll through to the body).
 */
export function PaywallOverlay({ active, children }: PaywallOverlayProps) {
  const dragging = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (active) {
      setOffset({ x: 0, y: 0 });
      // Move keyboard focus into the dialog so Tab / Enter works immediately
      requestAnimationFrame(() => ctaRef.current?.focus());
    }
  }, [active]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("a, button")) return;
      dragging.current = true;
      origin.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [offset],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      setOffset({
        x: e.clientX - origin.current.x,
        y: e.clientY - origin.current.y,
      });
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!active) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      {/* Page content — visible but completely non-interactive */}
      <div
        style={{ pointerEvents: "none", userSelect: "none" }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Visual dimming layer — starts below the sticky TopBar (zIndex 10000) */}
      <Box
        position="fixed"
        inset={0}
        bg="rgba(7, 8, 10, 0.55)"
        zIndex={9998}
        pointerEvents="none"
      />

      {/* ── Draggable paywall card ────────────────────────────────── */}
      <Box
        className="glass-card-highlight"
        role="dialog"
        aria-modal="true"
        aria-label="Nur für vollwertige Member"
        position="fixed"
        left={`calc(50% + ${offset.x}px)`}
        top={`calc(50% + ${offset.y}px)`}
        transform="translate(-50%, -50%)"
        zIndex={9999}
        pointerEvents="auto"
        w={{ base: "88vw", sm: "370px", md: "430px" }}
        maxW="92vw"
        p={{ base: 5, md: 7 }}
        cursor="grab"
        sx={{
          touchAction: "none",
          _active: { cursor: "grabbing" },
          animation: "paywall-enter 0.35s ease-out both",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <Stack spacing={{ base: 3, md: 4 }} align="stretch">
          {/* Gold accent line */}
          <Box
            h="2px"
            w="55%"
            mx="auto"
            borderRadius="full"
            bg="linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(232,197,71,0.85) 45%, rgba(212,175,55,0.2) 100%)"
            boxShadow="0 0 16px rgba(212,175,55,0.22)"
            mb={1}
          />

          <Heading
            as="h2"
            size={{ base: "sm", md: "md" }}
            className="inter-semibold"
            fontWeight={600}
            color="var(--color-text-primary)"
            textAlign="center"
          >
            Nur für vollwertige Member
          </Heading>

          <Text
            className="inter"
            color="var(--color-text-muted)"
            fontSize={{ base: "xs", md: "sm" }}
            lineHeight={1.7}
            textAlign="center"
          >
            Dieser Inhalt steht ausschließlich Membern aus dem Capital Circle
            zur Verfügung. Bewirb dich jetzt für eine Mitgliedschaft.
          </Text>

          <Box mt={1}>
            <Link ref={ctaRef} href="/bewerbung" style={{ display: "block", outline: "none" }}>
              <GlowButton w="100%" size={{ base: "md", md: "lg" }}>
                Jetzt bewerben
              </GlowButton>
            </Link>
          </Box>
        </Stack>
      </Box>
    </div>
  );
}
