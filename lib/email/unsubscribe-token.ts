import { createHmac, timingSafeEqual } from "crypto";

/**
 * HMAC-basiertes Unsubscribe-Token.
 *
 * Vorteile gegenüber DB-Token-Tabelle:
 *   - Stateless: keine Migration, keine Cleanups, kein DB-Round-Trip
 *   - Selbst-validierend: Manipulation am userId-Teil bricht die Signatur
 *   - Token bleibt gültig solange das Secret konstant bleibt
 *
 * Secret-Reihenfolge:
 *   1. `UNSUBSCRIBE_TOKEN_SECRET` (empfohlen, Production)
 *   2. `SUPABASE_SERVICE_ROLE_KEY` (Fallback — ohnehin secret)
 */
function getSecret(): string {
  const secret =
    process.env.UNSUBSCRIBE_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error(
      "UNSUBSCRIBE_TOKEN_SECRET (oder SUPABASE_SERVICE_ROLE_KEY) missing",
    );
  }
  return secret;
}

/**
 * Konstanter Purpose-String, damit derselbe userId nicht versehentlich für
 * andere Token-Zwecke missbraucht werden kann (z. B. Cancellation-Survey
 * sollte einen eigenen Purpose nutzen).
 */
const PURPOSE = "unsubscribe";

function sign(userId: string, purpose: string): string {
  return createHmac("sha256", getSecret())
    .update(`${userId}:${purpose}`)
    .digest("base64url");
}

/**
 * Erzeugt ein URL-sicheres Token, das `userId` + HMAC-Signatur encoded.
 * Format: base64url(JSON({userId, sig}))
 */
export function generateUnsubscribeToken(userId: string): string {
  const sig = sign(userId, PURPOSE);
  return Buffer.from(JSON.stringify({ userId, sig })).toString("base64url");
}

/**
 * Liefert die `userId` zurück wenn das Token gültig ist, sonst `null`.
 * Verwendet `timingSafeEqual` gegen Timing-Attacken.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as { userId?: unknown; sig?: unknown };

    if (typeof decoded.userId !== "string" || typeof decoded.sig !== "string") {
      return null;
    }

    const expected = sign(decoded.userId, PURPOSE);
    const a = Buffer.from(decoded.sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }
    return decoded.userId;
  } catch {
    return null;
  }
}

/**
 * Variante für Cancellation-Survey-Links (`/survey/cancellation?token=...`).
 * Eigener Purpose-String, damit Unsubscribe-Tokens nicht im Survey gültig sind.
 */
export function generateSurveyToken(userId: string): string {
  const sig = createHmac("sha256", getSecret())
    .update(`${userId}:survey`)
    .digest("base64url");
  return Buffer.from(JSON.stringify({ userId, sig })).toString("base64url");
}

export function verifySurveyToken(token: string): string | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as { userId?: unknown; sig?: unknown };

    if (typeof decoded.userId !== "string" || typeof decoded.sig !== "string") {
      return null;
    }

    const expected = createHmac("sha256", getSecret())
      .update(`${decoded.userId}:survey`)
      .digest("base64url");
    const a = Buffer.from(decoded.sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }
    return decoded.userId;
  } catch {
    return null;
  }
}
