"use client";

import { Box, IconButton } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const arrowButtonSx = {
  display: { base: "flex", lg: "none" },
  position: "absolute" as const,
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 2,
  size: "md",
  isRound: true,
  minW: "44px",
  minH: "44px",
  bg: "rgba(212, 175, 55, 0.22)",
  borderWidth: "1px",
  borderColor: "rgba(232, 197, 71, 0.45)",
  color: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(12px)",
  sx: { WebkitBackdropFilter: "blur(12px)" },
  boxShadow: "0 4px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
  _hover: {
    bg: "rgba(212, 175, 55, 0.38)",
    borderColor: "rgba(232, 197, 71, 0.65)",
  },
  _disabled: {
    opacity: 0.35,
    cursor: "not-allowed",
    bg: "rgba(212, 175, 55, 0.12)",
  },
};

/** Horizontal Scroll der Codex-Säulen: starker Scrollbalken (Mobile) + Pfeile. */
export function CodexPillarsScroll({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 2;
    setHasOverflow(overflow);
    if (!overflow) {
      setCanLeft(false);
      setCanRight(false);
      return;
    }
    setCanLeft(scrollLeft > 6);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.82, 120);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <Box position="relative" w="full">
      {hasOverflow && (
        <>
          <IconButton
            {...arrowButtonSx}
            left={{ base: 0, lg: undefined }}
            icon={<ChevronLeft size={20} strokeWidth={2.25} />}
            aria-label="Vorherige Säule"
            onClick={() => scrollByDir(-1)}
            isDisabled={!canLeft}
          />
          <IconButton
            {...arrowButtonSx}
            right={{ base: 0, lg: undefined }}
            icon={<ChevronRight size={20} strokeWidth={2.25} />}
            aria-label="Nächste Säule"
            onClick={() => scrollByDir(1)}
            isDisabled={!canRight}
          />
        </>
      )}

      <Box
        ref={scrollRef}
        display={{ base: "flex", lg: "grid" }}
        gridTemplateColumns={{ lg: "repeat(3, minmax(0, 1fr))" }}
        overflowX={{ base: "auto", lg: "visible" }}
        overflowY={{ base: "visible", lg: "visible" }}
        scrollSnapType={{ base: "x mandatory", lg: "none" }}
        gap={{ base: 6, lg: 6 }}
        alignItems="flex-start"
        pb={{ base: 3, lg: 2 }}
        mx={{ base: -2, lg: 0 }}
        px={{ base: 2, lg: 0 }}
        sx={{
          scrollPaddingInline: { base: "48px", lg: "0" },
          WebkitOverflowScrolling: "touch",
          scrollbarGutter: "stable",
          scrollbarWidth: "auto",
          scrollbarColor: "rgba(212, 175, 55, 0.65) rgba(255, 255, 255, 0.1)",
          "&::-webkit-scrollbar": {
            height: "14px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "999px",
            marginLeft: "10px",
            marginRight: "10px",
          },
          "&::-webkit-scrollbar-thumb": {
            background:
              "linear-gradient(180deg, rgba(212, 175, 55, 0.85) 0%, rgba(166, 124, 0, 0.9) 100%)",
            borderRadius: "999px",
            border: "3px solid rgba(15, 18, 24, 0.85)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background:
              "linear-gradient(180deg, rgba(232, 197, 71, 0.95) 0%, rgba(212, 175, 55, 0.95) 100%)",
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
