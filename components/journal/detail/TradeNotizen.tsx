"use client";

import { Text, Textarea } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionCard } from "../SectionCard";
import type { JournalTradeRow } from "../types";

/** Leitfragen aus der Vorgabe — als Platzhalter, nicht als Pflichtfelder. */
const PLATZHALTER = [
  "Warum habe ich den Trade genommen?",
  "Was war mein Bias?",
  "Was habe ich gut gemacht, was falsch?",
  "Habe ich meine Regeln eingehalten?",
  "Was mache ich beim nächsten Mal anders?",
].join("\n");

const WARTEZEIT_MS = 800;

type Status = "ruhe" | "ungespeichert" | "speichert" | "gespeichert" | "fehler";

/**
 * Freies Notizfeld pro Trade. Speichert von selbst: 800 ms nach der letzten
 * Eingabe, beim Verlassen des Felds und beim Verlassen der Seite (dort per
 * `keepalive`, damit der Request den Seitenwechsel überlebt).
 */
export function TradeNotizen({
  trade,
  onGespeichert,
}: {
  trade: JournalTradeRow;
  onGespeichert: (row: JournalTradeRow) => void;
}) {
  const [text, setText] = useState(trade.notes ?? "");
  const [status, setStatus] = useState<Status>("ruhe");

  // Refs, damit Timer und Unmount-Handler immer den neuesten Stand sehen.
  const textRef = useRef(text);
  const gespeichertRef = useRef(trade.notes ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onGespeichertRef = useRef(onGespeichert);
  const tradeRef = useRef(trade);
  useEffect(() => {
    onGespeichertRef.current = onGespeichert;
    tradeRef.current = trade;
  }, [onGespeichert, trade]);

  const speichern = useCallback(
    async (opts?: { keepalive?: boolean }) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const inhalt = textRef.current;
      if (inhalt === gespeichertRef.current) return;

      if (!opts?.keepalive) setStatus("speichert");
      try {
        const res = await fetch(`/api/journal/trades/${trade.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: inhalt }),
          keepalive: opts?.keepalive,
        });
        if (opts?.keepalive) {
          // Die Antwort wartet niemand mehr ab — den Stand im Journal trotzdem
          // nachziehen, sonst zeigt ein Zurückkommen die alte Notiz.
          gespeichertRef.current = inhalt;
          onGespeichertRef.current({ ...tradeRef.current, notes: inhalt.trim() ? inhalt : null });
          return;
        }
        const json = (await res.json().catch(() => null)) as { ok?: boolean; trade?: JournalTradeRow } | null;
        if (!res.ok || !json?.ok || !json.trade) {
          setStatus("fehler");
          return;
        }
        gespeichertRef.current = inhalt;
        onGespeichertRef.current(json.trade);
        // Während des Speicherns weitergetippt? Dann bleibt es ungespeichert.
        setStatus(textRef.current === inhalt ? "gespeichert" : "ungespeichert");
      } catch {
        if (!opts?.keepalive) setStatus("fehler");
      }
    },
    [trade.id],
  );

  // Seite verlassen oder Trade wechseln: offenen Stand noch mitnehmen.
  useEffect(() => {
    const vorDemVerlassen = () => void speichern({ keepalive: true });
    window.addEventListener("pagehide", vorDemVerlassen);
    return () => {
      window.removeEventListener("pagehide", vorDemVerlassen);
      void speichern({ keepalive: true });
    };
  }, [speichern]);

  const statusText: Record<Status, string> = {
    ruhe: "",
    ungespeichert: "Nicht gespeichert",
    speichert: "Speichert …",
    gespeichert: "Gespeichert",
    fehler: "Speichern fehlgeschlagen",
  };

  return (
    <SectionCard
      title="Notizen"
      action={
        <Text
          fontSize="xs"
          color={status === "fehler" ? "var(--cc-danger)" : "var(--cc-text-3)"}
          aria-live="polite"
          whiteSpace="nowrap"
        >
          {statusText[status]}
        </Text>
      }
    >
      <Textarea
        value={text}
        onChange={(e) => {
          const neu = e.target.value;
          setText(neu);
          textRef.current = neu;
          setStatus("ungespeichert");
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => void speichern(), WARTEZEIT_MS);
        }}
        onBlur={() => void speichern()}
        placeholder={PLATZHALTER}
        aria-label="Notizen zu diesem Trade"
        minH="220px"
        resize="vertical"
        fontSize="15px"
        lineHeight={1.6}
        bg="var(--j-panel-raised)"
        borderColor="var(--j-line)"
        borderRadius="10px"
        color="var(--cc-text)"
        _placeholder={{ color: "var(--cc-text-3)" }}
        _hover={{ borderColor: "var(--j-line-strong)" }}
        _focusVisible={{ borderColor: "var(--j-accent)", boxShadow: "0 0 0 1px var(--j-accent)" }}
        maxLength={20000}
      />
    </SectionCard>
  );
}
