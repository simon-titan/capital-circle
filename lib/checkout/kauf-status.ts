import { getStripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/service";
import { findeUserIdZuEmail } from "./user-lookup";

/**
 * Wie lange eine Checkout-Session als Ausweis taugt.
 *
 * Sie ist nicht erratbar und steht nur im Browser des Käufers — damit taugt sie
 * als Nachweis „ich bin der, der eben bezahlt hat". Das Fenster begrenzt den
 * Schaden, falls die URL später doch irgendwo landet.
 */
export const GAST_FENSTER_MS = 24 * 60 * 60 * 1000;

export type KaufFehler =
  | "missing_session"
  | "session_unknown"
  | "not_paid"
  | "session_expired"
  | "no_email"
  /** Der Webhook hat das Konto noch nicht angelegt — Wettlauf, kein Fehler. */
  | "account_pending";

export interface KaufOffen {
  ok: false;
  grund: KaufFehler;
}

export interface KaufBekannt {
  ok: true;
  email: string;
  userId: string;
  /** `membership_tier` aus dem Profil, sobald der Webhook es gesetzt hat. */
  tier: string | null;
  /**
   * Es gab an diesem Konto schon einmal eine Anmeldung. Dient als
   * **Einmal-Sperre** für die Zugangsaktivierung: Danach ist die Checkout-URL
   * kein Ausweis mehr, mit dem sich ein Passwort setzen ließe.
   */
  zugangAktiv: boolean;
}

export type KaufStatus = KaufOffen | KaufBekannt;

/**
 * Wer hat gekauft, und wie weit ist die Einrichtung?
 *
 * ── Warum an einer Stelle ───────────────────────────────────────────────────
 * Zwei Aufrufer brauchen dieselbe Auskunft: die Erfolgsseite, um den richtigen
 * Zustand anzuzeigen, und `POST /api/checkout/zugang`, um zu entscheiden, ob
 * ein Passwort gesetzt werden darf. Liefen die Prüfungen auseinander, entstünde
 * genau die gefährliche Kombination — die Seite zeigt das Formular, der
 * Endpunkt lässt es durch, obwohl eine der Bedingungen nicht mehr gilt.
 *
 * ── Die drei Bedingungen ────────────────────────────────────────────────────
 *   1. Die Session ist bezahlt.
 *   2. Sie ist höchstens 24 Stunden alt.
 *   3. Es gab an dem Konto noch nie eine Anmeldung (`zugangAktiv === false`).
 *
 * Die dritte ist die eigentliche Sperre. Ohne sie könnte jemand, der die URL in
 * die Hände bekommt, das Passwort eines fremden, bezahlten Kontos
 * überschreiben.
 */
export async function ladeKaufStatus(sessionId: string | undefined | null): Promise<KaufStatus> {
  const id = sessionId?.trim();
  if (!id?.startsWith("cs_")) return { ok: false, grund: "missing_session" };

  let email: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(id);
    const bezahlt = session.status === "complete" || session.payment_status === "paid";
    if (!bezahlt) return { ok: false, grund: "not_paid" };
    // `created` ist ein Unix-Zeitstempel in Sekunden.
    if (Date.now() - session.created * 1000 > GAST_FENSTER_MS) {
      return { ok: false, grund: "session_expired" };
    }
    email = session.customer_details?.email ?? session.customer_email ?? null;
  } catch (err) {
    console.error("[kauf-status] Checkout-Session nicht abrufbar:", err);
    return { ok: false, grund: "session_unknown" };
  }

  if (!email) return { ok: false, grund: "no_email" };

  const service = createServiceClient();
  const userId = await findeUserIdZuEmail(service, email);
  if (!userId) return { ok: false, grund: "account_pending" };

  const { data: profil, error: profilFehler } = await service
    .from("profiles")
    .select("membership_tier")
    .eq("id", userId)
    .maybeSingle();

  // supabase-js wirft nicht, es liefert `error` zurück. Ein stiller Fehler
  // wäre hier nicht schlimm (das Tier ist nur Anzeige), soll aber sichtbar sein.
  if (profilFehler) {
    console.warn(`[kauf-status] Profil ${userId} nicht lesbar: ${profilFehler.message}`);
  }

  // `last_sign_in_at` steht in `auth.users`, nicht auf `profiles` — deshalb
  // über die Admin-API.
  const { data: authUser } = await service.auth.admin.getUserById(userId);

  return {
    ok: true,
    email,
    userId,
    tier: (profil as { membership_tier?: string | null } | null)?.membership_tier ?? null,
    zugangAktiv: Boolean(authUser?.user?.last_sign_in_at),
  };
}
