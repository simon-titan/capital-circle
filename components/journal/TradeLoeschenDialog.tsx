"use client";

import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Text,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { formatDate } from "./format";
import { useJournal } from "./JournalProvider";
import type { JournalTradeRow } from "./types";

/**
 * Rückfrage vor dem Löschen eines Trades. Der Aufrufer hält nur fest, welcher
 * Trade gerade gefragt ist (`trade`, sonst `null`); Löschen, State-Update und
 * Fehlertext erledigt der Dialog selbst. `onGeloescht` z. B. für die
 * Detailansicht, die danach zur Liste zurückspringt.
 */
export function TradeLoeschenDialog({
  trade,
  onClose,
  onGeloescht,
}: {
  trade: JournalTradeRow | null;
  onClose: () => void;
  onGeloescht?: () => void;
}) {
  const { removeTrade } = useJournal();
  const abbrechenRef = useRef<HTMLButtonElement>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const schliessen = () => {
    if (laeuft) return;
    setFehler(null);
    onClose();
  };

  const loeschen = async () => {
    if (!trade) return;
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch(`/api/journal/trades/${trade.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !json?.ok) {
        setFehler("Der Trade konnte nicht gelöscht werden. Bitte versuch es noch einmal.");
        return;
      }
      removeTrade(trade.id);
      onClose();
      onGeloescht?.();
    } catch {
      setFehler("Keine Verbindung. Bitte versuch es noch einmal.");
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <AlertDialog isOpen={trade !== null} leastDestructiveRef={abbrechenRef} onClose={schliessen} isCentered>
      <AlertDialogOverlay bg="rgba(8, 10, 12, 0.72)">
        <AlertDialogContent
          bg="var(--cc-panel-solid)"
          border="1px solid var(--cc-line)"
          borderRadius="var(--cc-radius)"
          mx={4}
        >
          <AlertDialogHeader fontSize="18px" fontWeight={600} color="var(--cc-text)">
            Möchtest du diesen Trade wirklich löschen?
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
              {trade ? (
                <>
                  {trade.symbol} {trade.direction === "long" ? "Long" : "Short"} vom{" "}
                  <span className="cc-num">{formatDate(trade.trade_date)}</span> wird mit Notizen und Bildern
                  entfernt. Das lässt sich nicht rückgängig machen.
                </>
              ) : null}
            </Text>
            {trade?.source === "tradovate_csv" ? (
              <Text fontSize="13px" color="var(--cc-text-3)" mt={3}>
                Auch ein erneuter Import derselben Datei holt ihn nicht zurück.
              </Text>
            ) : null}
            {fehler ? (
              <Text fontSize="13px" color="var(--cc-danger)" mt={3}>
                {fehler}
              </Text>
            ) : null}
          </AlertDialogBody>
          <AlertDialogFooter gap={3}>
            <Button ref={abbrechenRef} variant="line" onClick={schliessen} isDisabled={laeuft}>
              Abbrechen
            </Button>
            <Button
              bg="rgba(248, 113, 113, 0.14)"
              color="var(--cc-danger)"
              border="1px solid rgba(248, 113, 113, 0.45)"
              _hover={{ bg: "rgba(248, 113, 113, 0.22)" }}
              _active={{ bg: "rgba(248, 113, 113, 0.3)" }}
              onClick={() => void loeschen()}
              isLoading={laeuft}
              loadingText="Wird gelöscht…"
            >
              Löschen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
