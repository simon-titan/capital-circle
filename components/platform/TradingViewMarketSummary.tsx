"use client";

import { Box } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js";
const SCRIPT_ID = "tv-ticker-tape-module";

/** Kommagetrennte Symbole wie im TradingView-Embed `symbols="..."`. */
export const TV_TICKER_SYMBOLS =
  "FOREXCOM:SPXUSD,FOREXCOM:NSXUSD,FOREXCOM:DJI,BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,CMCMARKETS:GOLD";

function loadTickerTapeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("TradingView-Script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "module";
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error("TradingView-Script"));
    document.body.appendChild(script);
  });
}

/**
 * TradingView „Ticker Tape“ — volle Breite unter der TopBar.
 * Registriert das Modul-Script einmal und mountet `tv-ticker-tape`.
 */
export function TradingViewMarketSummary() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let widget: Element | null = null;

    void (async () => {
      try {
        await loadTickerTapeScript();
        if (cancelled || !hostRef.current) return;

        await customElements.whenDefined("tv-ticker-tape");

        const el = document.createElement("tv-ticker-tape");
        el.setAttribute("symbols", TV_TICKER_SYMBOLS);
        /** Ohne `theme` folgt das Widget der Seite (`color-scheme`) — die ist oft nicht gesetzt → wirkt hell. */
        el.setAttribute("theme", "dark");
        host.appendChild(el);
        widget = el;
      } catch {
        /* externes Widget — bei Fehler leise ignorieren */
      }
    })();

    return () => {
      cancelled = true;
      widget?.remove();
    };
  }, []);

  return (
    <Box
      className="tv-ticker-strip"
      w="100%"
      maxW="100%"
      borderBottom="1px solid rgba(212, 175, 55, 0.22)"
      bg="transparent"
      sx={{
        /* TradingView liest --tv-widget-* von Vorfahren (siehe widget-docs / theme-builder) */
        "--tv-widget-background-color": "transparent",
        "& tv-ticker-tape": {
          display: "block",
          width: "100%",
        },
      }}
    >
      <Box ref={hostRef} w="100%" minH={{ base: "36px", md: "44px" }} />
    </Box>
  );
}
