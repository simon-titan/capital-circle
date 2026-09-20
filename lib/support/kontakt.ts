import { createHmac } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export * from "./kontakt-shared";

/**
 * IP-Adresse als HMAC statt im Klartext, mit eigenem Zweck-Präfix, damit der
 * Hash nirgends sonst passt. Gleiche Herleitung des Geheimnisses wie beim
 * Widerruf (`lib/widerruf/verarbeiten.ts`).
 */
export function kontaktIpHash(ip: string | null): string | null {
  if (!ip) return null;
  const secret =
    process.env.KUENDIGUNG_IP_SECRET?.trim() ||
    process.env.UNSUBSCRIBE_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`kontakt-ip:${ip}`).digest("hex").slice(0, 32);
}

/** Höchstens so viele Anfragen je Stunde. `gesamt` ist die Notbremse gegen verteilte Fluten. */
export const KONTAKT_DROSSEL = {
  proEmail: 3,
  proIp: 5,
  gesamt: 60,
  fensterMs: 60 * 60 * 1000,
  /** Nachrichten im Verlauf eines Tickets je Stunde. */
  antwortenProStunde: 10,
} as const;

/**
 * Drosselung über die Tabelle selbst. Schlägt eine Abfrage fehl — etwa weil
 * Migration 102 noch fehlt —, wird nicht gesperrt: Eine Anfrage abzuweisen
 * wiegt schwerer als ein paar zu viel.
 */
export async function kontaktGedrosselt({
  email,
  ipHashWert,
}: {
  email: string;
  ipHashWert: string | null;
}): Promise<boolean> {
  const service = createServiceClient();
  const seit = new Date(Date.now() - KONTAKT_DROSSEL.fensterMs).toISOString();

  const zaehle = async (spalte: string, wert: string) => {
    const { count, error } = await service
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq(spalte, wert)
      .gte("created_at", seit);
    if (error) {
      console.error(`[kontakt] Drosselung (${spalte}) nicht prüfbar:`, error.message);
      return 0;
    }
    return count ?? 0;
  };

  const zaehleAlle = async () => {
    const { count, error } = await service
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("quelle", "kontakt")
      .gte("created_at", seit);
    if (error) {
      console.error("[kontakt] Drosselung (gesamt) nicht prüfbar:", error.message);
      return 0;
    }
    return count ?? 0;
  };

  const [proEmail, proIp, gesamt] = await Promise.all([
    zaehle("contact_email", email),
    ipHashWert ? zaehle("ip_hash", ipHashWert) : Promise.resolve(0),
    zaehleAlle(),
  ]);

  return proEmail >= KONTAKT_DROSSEL.proEmail || proIp >= KONTAKT_DROSSEL.proIp || gesamt >= KONTAKT_DROSSEL.gesamt;
}
