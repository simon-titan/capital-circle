"use client";

import { Box } from "@chakra-ui/react";
import { Check, ChevronLeft, ChevronRight, Gauge, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { SPEED_OPTIONS, formatSpeed, type QualityOption } from "./player-settings";

/** Wert für „Automatisch“ im Qualitätsmenü (sonst `QualityOption.key`). */
export const QUALITY_AUTO = "auto";

export type QualityMenuState = {
  options: QualityOption[];
  /** `QUALITY_AUTO` oder `QualityOption.key` */
  value: string;
  /** Stufe, die hls.js bei „Automatisch“ gerade abspielt (z. B. „720p“). */
  playingLabel: string | null;
  onChange: (value: string) => void;
};

type View = "main" | "speed" | "quality";

type PlayerSettingsMenuProps = {
  id: string;
  /** Zahnrad-Knopf: bekommt beim Schließen per Tastatur/Auswahl den Fokus zurück. */
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  /** Klick außerhalb des Menüs — der Player unterdrückt damit das Pausieren beim Tipp aufs Video. */
  onOutsidePointerDown?: (target: EventTarget | null) => void;
  speed: number;
  /** Fehlt → kein Geschwindigkeitseintrag (z. B. Pflichtvideo ohne Vorspulen). */
  onSpeedChange?: (rate: number) => void;
  /** Fehlt → kein Qualitätseintrag (natives HLS in Safari/iOS, MP4, nur eine Stufe). */
  quality?: QualityMenuState;
};

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"]';

function menuItems(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

/** Nur die Menüfläche scrollen, nie die Seite dahinter; die klebende Kopfzeile einrechnen. */
function focusInPanel(panel: HTMLElement, el: HTMLElement | undefined) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const head = panel.querySelector<HTMLElement>(".cc-pm-head");
  if (head?.contains(el)) return;
  const headHeight = head?.offsetHeight ?? 0;
  const top = el.offsetTop;
  const bottom = top + el.offsetHeight;
  if (top - headHeight < panel.scrollTop) panel.scrollTop = Math.max(0, top - headHeight - 6);
  else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight + 6;
}

/**
 * Einstellungsmenü wie bei YouTube: Hauptliste (Geschwindigkeit, Qualität) mit
 * Untermenüs, die die Liste ersetzen statt auszuklappen.
 *
 * Bewusst kein Chakra-`Menu`: Das rendert per Portal an den `body` und wäre im
 * Vollbild (Vollbild-Element = Player-Hülle) unsichtbar. Dieses Menü liegt in der
 * Bühne des Players und muss in einem positionierten Container stehen.
 *
 * Wird nur gerendert, solange es offen ist — Ansicht und Fokus starten so bei
 * jedem Öffnen frisch.
 *
 * Bedienung: Pfeil hoch/runter (mit Umlauf), Pos1/Ende, Pfeil rechts öffnet ein
 * Untermenü, Pfeil links geht zurück, Esc schließt, Tab schließt und gibt den
 * Fokus ans Zahnrad (von dort läuft Tab normal weiter). Klick außerhalb schließt.
 */
export function PlayerSettingsMenu({
  id,
  anchorRef,
  onClose,
  onOutsidePointerDown,
  speed,
  onSpeedChange,
  quality,
}: PlayerSettingsMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("main");
  /** Wohin der Fokus nach dem nächsten Ansichtswechsel springt. */
  const focusAfterViewRef = useRef<"first" | "checked" | View>("first");

  // Fehlt die Qualität plötzlich (Quelle neu geladen), zurück zur Hauptliste.
  const activeView: View = view === "quality" && !quality ? "main" : view;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const items = menuItems(panel);
    const want = focusAfterViewRef.current;
    let target: HTMLElement | undefined;
    if (want === "checked") target = items.find((el) => el.getAttribute("aria-checked") === "true");
    else if (want !== "first") target = items.find((el) => el.dataset.submenu === want);
    focusInPanel(panel, target ?? items[0]);
  }, [activeView]);

  useEffect(() => {
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      if (target && (panelRef.current?.contains(target) || anchorRef.current?.contains(target))) return;
      onOutsidePointerDown?.(ev.target);
      onClose();
    };
    // Capture-Phase: greift auch, wenn ein Element darunter die Weitergabe stoppt.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [anchorRef, onClose, onOutsidePointerDown]);

  const closeToAnchor = () => {
    anchorRef.current?.focus();
    onClose();
  };

  const openView = (next: "speed" | "quality") => {
    focusAfterViewRef.current = "checked";
    setView(next);
  };

  const goBack = () => {
    if (activeView === "main") return;
    focusAfterViewRef.current = activeView;
    setView("main");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const items = menuItems(panel);
    const current = document.activeElement as HTMLElement | null;
    const index = current ? items.indexOf(current) : -1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusInPanel(panel, items[(index + 1) % items.length]);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusInPanel(panel, items[(index - 1 + items.length) % items.length]);
        break;
      case "Home":
        e.preventDefault();
        focusInPanel(panel, items[0]);
        break;
      case "End":
        e.preventDefault();
        focusInPanel(panel, items[items.length - 1]);
        break;
      case "ArrowRight": {
        const sub = current?.dataset.submenu;
        if (sub === "speed" || sub === "quality") {
          e.preventDefault();
          openView(sub);
        }
        break;
      }
      case "ArrowLeft":
        if (activeView !== "main") {
          e.preventDefault();
          goBack();
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        closeToAnchor();
        break;
      case "Tab":
        // Kein preventDefault: Der Fokus steht danach auf dem Zahnrad, und der
        // Browser setzt die Tab-Bewegung von dort aus fort.
        closeToAnchor();
        break;
      default:
        break;
    }
  };

  const pickSpeed = (rate: number) => {
    onSpeedChange?.(rate);
    closeToAnchor();
  };

  const pickQuality = (value: string) => {
    quality?.onChange(value);
    closeToAnchor();
  };

  const qualityIsAuto = quality?.value === QUALITY_AUTO;
  const qualitySummary = quality
    ? qualityIsAuto
      ? `Automatisch${quality.playingLabel ? ` (${quality.playingLabel})` : ""}`
      : (quality.options.find((o) => o.key === quality.value)?.label ?? "Automatisch")
    : "";

  const title =
    activeView === "speed" ? "Wiedergabegeschwindigkeit" : activeView === "quality" ? "Qualität" : "Einstellungen";

  return (
    <Box
      ref={panelRef}
      id={id}
      role="menu"
      aria-label={title}
      aria-orientation="vertical"
      onKeyDown={onKeyDown}
      position="absolute"
      zIndex={7}
      right={{ base: "8px", md: "12px" }}
      // Mobil liegt das Menü über der Leiste (mehr Höhe für die Liste), ab md
      // wie bei YouTube direkt über dem Zeitstrahl.
      bottom={{ base: "8px", md: "74px" }}
      w={{ base: "min(288px, calc(100% - 16px))", md: "288px" }}
      maxH={{ base: "calc(100% - 16px)", md: "calc(100% - 86px)" }}
      overflowY="auto"
      overscrollBehavior="contain"
      p="6px"
      borderRadius="12px"
      border="1px solid rgba(255, 255, 255, 0.12)"
      // Fast deckend: Das Menü muss auf jedem Bildinhalt lesbar sein.
      bg="rgba(10, 12, 15, 0.96)"
      backdropFilter="blur(14px)"
      boxShadow="0 18px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      sx={{
        WebkitBackdropFilter: "blur(14px)",
        "& .cc-pm-item": {
          display: "flex",
          alignItems: "center",
          gap: "12px",
          width: "100%",
          minHeight: "44px",
          padding: "0 12px",
          border: 0,
          borderRadius: "8px",
          background: "transparent",
          color: "var(--cc-text)",
          fontSize: "14px",
          lineHeight: 1.3,
          textAlign: "left",
          cursor: "pointer",
          transition: "background-color 0.15s ease",
        },
        "@media (min-width: 48em)": {
          "& .cc-pm-item": { minHeight: "40px" },
        },
        "& .cc-pm-item:hover": { background: "rgba(255, 255, 255, 0.08)" },
        "& .cc-pm-item:focus": { outline: "none" },
        "& .cc-pm-item:focus-visible": {
          background: "rgba(255, 255, 255, 0.08)",
          outline: "2px solid var(--cc-gold-line)",
          outlineOffset: "-2px",
        },
        "& .cc-pm-item[aria-checked='true']": { fontWeight: 600 },
        "& .cc-pm-icon": { flexShrink: 0, color: "var(--cc-text-soft)" },
        "& .cc-pm-value": {
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          paddingLeft: "8px",
          color: "var(--cc-text-2)",
          fontSize: "13px",
          whiteSpace: "nowrap",
        },
        "& .cc-pm-check": {
          display: "inline-flex",
          width: "18px",
          flexShrink: 0,
          color: "var(--cc-gold-light)",
        },
        "& .cc-pm-back": { fontWeight: 600 },
        // Kopfzeile mit „Zurück“ bleibt stehen, wenn die Liste scrollt.
        "& .cc-pm-head": {
          position: "sticky",
          top: "-6px",
          zIndex: 1,
          margin: "-6px -6px 0",
          padding: "6px 6px 0",
          background: "rgb(10, 12, 15)",
        },
        /*
         * Niedriger Player (Handy hochkant, kleiner Funnel-Player): Auswahl als
         * Kachelraster statt Liste, damit alle Stufen ohne Scrollen passen —
         * Geschwindigkeit 4×2, Qualität mit „Automatisch“ über zwei Spalten.
         * Bezug ist die Bühne des Players (`container-name: cc-player`), nicht
         * das Fenster: Ein 720px-Player auf dem Desktop ist genauso knapp.
         */
        "@container cc-player (max-height: 480px)": {
          "& .cc-pm-choices": {
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "4px",
          },
          "& .cc-pm-choices .cc-pm-item": {
            justifyContent: "center",
            gap: "6px",
            padding: "0 6px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
          "& .cc-pm-choices .cc-pm-check, & .cc-pm-choices .cc-pm-value": { display: "none" },
          "& .cc-pm-choices .cc-pm-wide": { gridColumn: "span 2" },
          // Ohne Haken: Auswahl über Gold-Kante und Gold-Schrift (aktiver Zustand).
          "& .cc-pm-choices .cc-pm-item[aria-checked='true']": {
            background: "var(--cc-gold-wash)",
            borderColor: "var(--cc-gold-line)",
            color: "var(--cc-gold-light)",
          },
        },
      }}
    >
      {activeView === "main" ? (
        <>
          {onSpeedChange ? (
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              data-submenu="speed"
              aria-label={`Geschwindigkeit: ${formatSpeed(speed)}`}
              className="cc-pm-item"
              onClick={() => openView("speed")}
            >
              <Gauge size={18} strokeWidth={1.75} className="cc-pm-icon" aria-hidden />
              <span>Geschwindigkeit</span>
              <span className="cc-pm-value">
                {formatSpeed(speed)}
                <ChevronRight size={16} aria-hidden />
              </span>
            </button>
          ) : null}
          {quality ? (
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              data-submenu="quality"
              aria-label={`Qualität: ${qualitySummary}`}
              className="cc-pm-item"
              onClick={() => openView("quality")}
            >
              <SlidersHorizontal size={18} strokeWidth={1.75} className="cc-pm-icon" aria-hidden />
              <span>Qualität</span>
              <span className="cc-pm-value">
                {qualitySummary}
                <ChevronRight size={16} aria-hidden />
              </span>
            </button>
          ) : null}
        </>
      ) : (
        <>
          <div className="cc-pm-head">
            <button
              type="button"
              role="menuitem"
              className="cc-pm-item cc-pm-back"
              aria-label={`Zurück zu den Einstellungen, ${title}`}
              onClick={goBack}
            >
              <ChevronLeft size={18} aria-hidden />
              <span>{title}</span>
            </button>
            <Box aria-hidden h="1px" mx="-6px" mt="5px" mb="5px" bg="rgba(255, 255, 255, 0.1)" />
          </div>
          <Box role="group" aria-label={title} className="cc-pm-choices">
            {activeView === "speed"
              ? SPEED_OPTIONS.map((rate) => {
                  const checked = Math.abs(rate - speed) < 0.001;
                  return (
                    <button
                      key={rate}
                      type="button"
                      role="menuitemradio"
                      aria-checked={checked}
                      className="cc-pm-item"
                      onClick={() => pickSpeed(rate)}
                    >
                      <span className="cc-pm-check">{checked ? <Check size={16} strokeWidth={2.25} aria-hidden /> : null}</span>
                      <span className="cc-num">{formatSpeed(rate)}</span>
                    </button>
                  );
                })
              : null}
            {activeView === "quality" && quality ? (
              <>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={qualityIsAuto}
                  aria-label={qualityIsAuto && quality.playingLabel ? `Automatisch, gerade ${quality.playingLabel}` : "Automatisch"}
                  className="cc-pm-item cc-pm-wide"
                  onClick={() => pickQuality(QUALITY_AUTO)}
                >
                  <span className="cc-pm-check">{qualityIsAuto ? <Check size={16} strokeWidth={2.25} aria-hidden /> : null}</span>
                  <span>Automatisch</span>
                  {qualityIsAuto && quality.playingLabel ? (
                    <span className="cc-pm-value cc-num">{quality.playingLabel}</span>
                  ) : null}
                </button>
                {quality.options.map((option) => {
                  const checked = quality.value === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={checked}
                      className="cc-pm-item"
                      onClick={() => pickQuality(option.key)}
                    >
                      <span className="cc-pm-check">{checked ? <Check size={16} strokeWidth={2.25} aria-hidden /> : null}</span>
                      <span className="cc-num">{option.label}</span>
                    </button>
                  );
                })}
              </>
            ) : null}
          </Box>
        </>
      )}
    </Box>
  );
}
