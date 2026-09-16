"use client";

import { Box, IconButton } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Runde Pfeile im Line-Stil: deckendes Graphit, Haarlinie, Gold-Kante beim Hover. */
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
  bg: "var(--cc-panel-solid)",
  border: "1px solid var(--cc-line-strong)",
  color: "var(--cc-text)",
  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.4)",
  transition: "border-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)",
  _hover: {
    bg: "var(--cc-panel-solid)",
    borderColor: "var(--cc-gold-line)",
    boxShadow: "0 0 18px rgba(212, 176, 128, 0.14)",
  },
  _active: { bg: "var(--cc-surface-2)" },
  _disabled: {
    opacity: 0.35,
    cursor: "not-allowed",
    boxShadow: "none",
  },
};

/** Horizontal Scroll der Codex-Säulen: gut sichtbarer Scrollbalken (Mobile) + Pfeile. */
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

  /** Nächste/vorherige Säule — exakt zentriert (entspricht scroll-snap-align: center). */
  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    if (items.length === 0) return;

    const cRect = el.getBoundingClientRect();
    const viewCenterX = cRect.left + cRect.width / 2;

    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const d = Math.abs(mid - viewCenterX);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const nextIdx = Math.min(items.length - 1, Math.max(0, bestIdx + dir));
    if (nextIdx === bestIdx) return;

    const target = items[nextIdx];
    const tRect = target.getBoundingClientRect();
    const delta = tRect.left + tRect.width / 2 - viewCenterX;
    el.scrollTo({ left: el.scrollLeft + delta, behavior: "smooth" });
  };

  return (
    <Box position="relative" w="full">
      {hasOverflow && (
        <>
          <IconButton
            {...arrowButtonSx}
            left={{ base: 0, lg: undefined }}
            icon={<ChevronLeft size={20} strokeWidth={1.75} />}
            aria-label="Vorherige Säule"
            onClick={() => scrollByDir(-1)}
            isDisabled={!canLeft}
          />
          <IconButton
            {...arrowButtonSx}
            right={{ base: 0, lg: undefined }}
            icon={<ChevronRight size={20} strokeWidth={1.75} />}
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
          // Neutraler Balken in Datentinte auf der Spur (keine zweite Gold-Fläche).
          scrollbarColor: "rgba(209, 208, 212, 0.5) rgba(255, 255, 255, 0.07)",
          "&::-webkit-scrollbar": {
            height: "10px",
          },
          "&::-webkit-scrollbar-track": {
            background: "rgba(255, 255, 255, 0.07)",
            borderRadius: "999px",
            marginLeft: "10px",
            marginRight: "10px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(209, 208, 212, 0.5)",
            borderRadius: "999px",
            border: "2px solid transparent",
            backgroundClip: "padding-box",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "rgba(209, 208, 212, 0.7)",
            backgroundClip: "padding-box",
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
