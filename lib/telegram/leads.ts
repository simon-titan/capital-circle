/**
 * Lead-Erfassung für den Telegram-Bot (`public.telegram_leads`).
 *
 * Schreibzugriff läuft ausschließlich über service-role (umgeht RLS) — die
 * Tabelle hat bewusst keine public-Policies, nur Admin-Read.
 *
 * SERVER-ONLY.
 */
import { createServiceClient } from "@/lib/supabase/service";

/** Ausschnitt aus dem Telegram-`User`-Objekt, den wir speichern. */
export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  language_code?: string | null;
};

type LeadRow = {
  id: string;
  start_count: number | null;
  source: string | null;
};

/**
 * Legt den Lead an oder aktualisiert ihn.
 *
 * - `source` wird NUR beim ersten Mal gesetzt (First-Touch-Attribution): wer
 *   über den Instagram-Deep-Link kommt und später ohne Payload neu startet,
 *   bleibt Instagram zugeordnet.
 * - `start_count` zählt jede Interaktion; ein Race zwischen zwei parallelen
 *   Updates kostet höchstens einen Zähler und ist bewusst nicht abgesichert.
 * - `blocked` wird zurückgesetzt, sobald sich der Nutzer wieder meldet.
 */
export async function recordStart(params: {
  from: TelegramUser;
  chatId: number;
  source: string | null;
}): Promise<void> {
  const { from, chatId, source } = params;
  const service = createServiceClient();
  const now = new Date().toISOString();

  const { data, error: selectError } = await service
    .from("telegram_leads")
    .select("id, start_count, source")
    .eq("telegram_id", from.id)
    .maybeSingle();

  // supabase-js WIRFT nicht — Fehler stehen in `error`. Ohne diesen Check würde
  // z. B. eine fehlende Migration unbemerkt bleiben.
  if (selectError) throw new Error(`select failed: ${selectError.message}`);

  const existing = data as LeadRow | null;

  const identity = {
    chat_id: chatId,
    username: from.username ?? null,
    first_name: from.first_name ?? null,
    last_name: from.last_name ?? null,
    language_code: from.language_code ?? null,
  };

  if (existing) {
    const { error } = await service
      .from("telegram_leads")
      .update({
        ...identity,
        // First-Touch: bestehende Quelle nie überschreiben.
        source: existing.source ?? source,
        start_count: (existing.start_count ?? 0) + 1,
        blocked: false,
        last_start_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) throw new Error(`update failed: ${error.message}`);
    return;
  }

  const { error } = await service.from("telegram_leads").insert({
    telegram_id: from.id,
    ...identity,
    source,
    start_count: 1,
    last_start_at: now,
  });
  if (error) throw new Error(`insert failed: ${error.message}`);
}

/** Markiert einen Lead, der den Bot blockiert hat (403 der Bot-API). */
export async function markBlocked(telegramId: number): Promise<void> {
  const service = createServiceClient();
  await service
    .from("telegram_leads")
    .update({ blocked: true, updated_at: new Date().toISOString() })
    .eq("telegram_id", telegramId);
}
