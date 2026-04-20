/**
 * Slack-Notifications via Incoming-Webhook.
 *
 * Setup: In Slack einen "Incoming Webhook" anlegen → URL als
 * `SLACK_WEBHOOK_URL` in Vercel-Env setzen.
 *
 * Verhalten:
 *   - Kein Webhook konfiguriert → silent skip (nützlich in Dev/Preview).
 *   - Fehler beim POST werden geloggt, aber NIE als Exception geworfen,
 *     damit der aufrufende API-Handler nicht scheitert.
 */
export interface SlackPayload {
  text: string;
  /** Optionale Block-Kit-Blocks (https://api.slack.com/block-kit). */
  blocks?: unknown[];
}

export async function sendSlackNotification(
  message: string | SlackPayload,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { ok: true, skipped: true };
  }

  const payload: SlackPayload =
    typeof message === "string" ? { text: message } : message;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[slack] webhook failed:", res.status, body);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[slack] webhook error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
