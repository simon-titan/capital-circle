/**
 * Minimaler Telegram-Bot-API-Client.
 *
 * Die Bot-API ist reines HTTPS + JSON — deshalb bewusst KEINE Dependency
 * (grammY/telegraf). `fetch` reicht und hält das Bundle klein.
 *
 * Der Token wird LAZY gelesen (wie `getStripe()`), damit Builds ohne Secret
 * (Preview-Deployments) nicht beim Import scheitern.
 *
 * SERVER-ONLY — der Bot-Token darf niemals in einem Client-Bundle landen.
 */
import { TELEGRAM_BOT } from "@/config/telegram-bot";

const API_BASE = "https://api.telegram.org";

/** Fehler einer Bot-API-Antwort mit `ok: false`. */
export class TelegramApiError extends Error {
  readonly method: string;
  readonly errorCode: number;
  readonly description: string;

  constructor(method: string, errorCode: number, description: string) {
    super(`Telegram ${method} failed (${errorCode}): ${description}`);
    this.name = "TelegramApiError";
    this.method = method;
    this.errorCode = errorCode;
    this.description = description;
  }

  /**
   * Nutzer hat den Bot blockiert oder den Chat gelöscht. Kein echter Fehler —
   * wir markieren den Lead und hören auf, ihn anzuschreiben.
   */
  get isBlockedByUser(): boolean {
    return (
      this.errorCode === 403 ||
      /bot was blocked|user is deactivated|chat not found/i.test(this.description)
    );
  }
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN fehlt.");
  return token;
}

type TelegramResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error_code?: number; description?: string };

/** Ruft eine Bot-API-Methode auf und wirft bei `ok: false`. */
export async function callTelegram<T>(
  method: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${getBotToken()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as TelegramResponse<T> | null;

  if (!json) {
    throw new TelegramApiError(method, res.status, "invalid JSON response");
  }
  if (!json.ok) {
    throw new TelegramApiError(
      method,
      json.error_code ?? res.status,
      json.description ?? "unknown error",
    );
  }
  return json.result;
}

/**
 * Willkommensnachricht mit GENAU EINEM Inline-Button („JETZT BEITRETEN").
 *
 * `link_preview_options.is_disabled` verhindert, dass Telegram unter der
 * Nachricht zusätzlich eine Whop-Vorschaukarte rendert, falls der Text später
 * mal einen Link enthält.
 */
export async function sendWelcome(chatId: number): Promise<void> {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: TELEGRAM_BOT.welcomeText,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [
        [{ text: TELEGRAM_BOT.buttonLabel, url: TELEGRAM_BOT.joinUrl }],
      ],
    },
  });
}
