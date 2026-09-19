"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Alle drei Sekunden, höchstens eine Minute lang. */
const ABSTAND_MS = 3000;
const MAX_VERSUCHE = 20;

/**
 * Lädt die Erfolgsseite neu, solange der Webhook das Konto noch anlegt.
 *
 * Stripe leitet sofort nach der Zahlung hierher, das Konto entsteht parallel
 * im Webhook. Kommt der Käufer schneller an als das Ereignis, sieht er
 * „Dein Konto wird gerade angelegt" — und bis 19.09.2026 blieb es dabei, bis
 * er selbst neu lud. Für einen Gast ist diese Seite aber der einzige Weg zum
 * Passwort, solange die Willkommensmail nicht zuverlässig ankommt; wer hier
 * weiterklickt, steht ohne Zugang da.
 *
 * `router.refresh()` rendert die Serverkomponente neu, ohne den Zustand der
 * Seite zu verlieren. Sobald `ladeKaufStatus` das Konto findet, zeigt die
 * Seite das Passwort-Formular, und diese Komponente ist nicht mehr im Baum.
 */
export function KontoWarten() {
  const router = useRouter();

  useEffect(() => {
    let versuche = 0;
    const takt = window.setInterval(() => {
      versuche += 1;
      if (versuche > MAX_VERSUCHE) {
        window.clearInterval(takt);
        return;
      }
      router.refresh();
    }, ABSTAND_MS);
    return () => window.clearInterval(takt);
  }, [router]);

  return null;
}
