/**
 * Cloudflare Turnstile — Server-Side-Verify.
 *
 * Endpunkt: https://challenges.cloudflare.com/turnstile/v0/siteverify
 *
 * Strategie:
 *   - Wenn `TURNSTILE_SECRET_KEY` fehlt, gilt das als "Captcha deaktiviert"
 *     (Dev/Preview ohne Secret) → wir geben `{ ok: true, skipped: true }` zurück.
 *     Production-Deployments MÜSSEN den Key setzen.
 *   - Bei gesetztem Secret ist `token` Pflicht; fehlt er → `{ ok: false }`.
 *
 * Doku: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export interface TurnstileVerifyResult {
  ok: boolean;
  skipped?: boolean;
  errorCodes?: string[];
}

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true, skipped: true };
  }
  if (!token) {
    return { ok: false, errorCodes: ["missing-input-response"] };
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  if (remoteIp) params.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: params,
    });
    const json = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (json.success) return { ok: true };
    return { ok: false, errorCodes: json["error-codes"] ?? [] };
  } catch (err) {
    return {
      ok: false,
      errorCodes: ["fetch-failed", err instanceof Error ? err.message : "unknown"],
    };
  }
}
