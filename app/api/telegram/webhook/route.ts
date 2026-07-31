import { NextResponse, type NextRequest } from "next/server";
import { TelegramApiError, sendWelcome } from "@/lib/telegram/client";
import { markBlocked, recordStart, type TelegramUser } from "@/lib/telegram/leads";

/**
 * Telegram-Webhook: jede Nachricht an den Bot landet hier.
 *
 * PFLICHT: nodejs-Runtime (Supabase-Service-Client) und `force-dynamic`, damit
 * Vercel die Route weder cached noch pre-rendert.
 *
 * Registriert wird der Webhook mit `npm run telegram:setup` — inkl.
 * `secret_token`, das Telegram bei jedem Request als Header mitschickt.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ausschnitt aus dem Telegram-`Update`, den wir auswerten. */
type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    caption?: string;
    chat?: { id?: number; type?: string };
    from?: TelegramUser;
  };
};

/**
 * Prüft den `X-Telegram-Bot-Api-Secret-Token`-Header.
 *
 * Ohne gesetztes `TELEGRAM_WEBHOOK_SECRET` (lokale Entwicklung) lassen wir alle
 * Aufrufe durch — analog zu `isAuthorizedCron` in `lib/cron/auth.ts`.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

/**
 * Deep-Link-Payload aus `/start <payload>` (z. B. `https://t.me/bot?start=ig_bio`).
 * Auf `[a-z0-9_-]` normalisiert und auf 64 Zeichen begrenzt, damit nichts
 * Beliebiges in der Attributions-Spalte landet.
 */
function parseStartPayload(text: string): string | null {
  const [command, ...rest] = text.trim().split(/\s+/);
  // `/start@meinbot` kommt in Gruppen vor — Bot-Suffix abschneiden.
  if (command.split("@")[0]?.toLowerCase() !== "/start") return null;
  const raw = rest.join(" ").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return raw ? raw.slice(0, 64) : null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate | null = null;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const message = update?.message;
  const chatId = message?.chat?.id;
  const from = message?.from;

  // Nur private 1:1-Chats beantworten — in Gruppen/Kanälen bleibt der Bot still.
  if (!message || !chatId || !from?.id || message.chat?.type !== "private" || from.is_bot) {
    return NextResponse.json({ ok: true, status: "ignored" });
  }

  const text = message.text ?? message.caption ?? "";
  const source = parseStartPayload(text);

  // Ein DB-Fehler darf die Antwort an den Nutzer NIE verhindern.
  try {
    await recordStart({ from, chatId, source });
  } catch (err) {
    console.error("[telegram] recordStart failed", err);
  }

  try {
    await sendWelcome(chatId);
  } catch (err) {
    if (err instanceof TelegramApiError && err.isBlockedByUser) {
      await markBlocked(from.id).catch(() => {});
    } else {
      console.error("[telegram] sendWelcome failed", err);
    }
  }

  // IMMER 200 — ein Fehlercode löst bei Telegram Retries für dasselbe Update aus.
  return NextResponse.json({ ok: true });
}
