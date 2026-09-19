"use client";

import { Button } from "@chakra-ui/react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Abmelden und zur Anmeldung — für den Fall, dass auf `/checkout/success` in
 * diesem Browser jemand anderes angemeldet ist als der Käufer.
 *
 * `scope: "local"` meldet nur diesen Browser ab. Der Standard (`global`)
 * beendete jede Sitzung des Kontos auf allen Geräten — für einen Kontowechsel
 * am Kaufrechner wäre das eine Nebenwirkung, mit der niemand rechnet.
 */
export function KontoWechseln() {
  const [laeuft, setLaeuft] = useState(false);

  async function wechseln() {
    setLaeuft(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
    } finally {
      // Volle Navigation, damit `proxy.ts` den abgemeldeten Zustand sieht.
      window.location.assign("/login");
    }
  }

  return (
    <Button variant="gold" h="48px" px={6} alignSelf="flex-start" isLoading={laeuft} onClick={wechseln}>
      Abmelden und neu anmelden
    </Button>
  );
}
