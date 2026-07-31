/**
 * Telegram-Webhook registrieren (Einmal-Setup nach jedem URL-Wechsel).
 *
 * Meldet die Route `/api/telegram/webhook` bei Telegram an, setzt das
 * `secret_token` (das Telegram bei jedem Request als Header mitschickt) und
 * registriert den /start-Befehl im Bot-Menü.
 *
 * Bewusst ein Skript statt einer öffentlichen Route — kein zusätzlicher
 * Endpoint im Deployment, der Token bleibt lokal.
 *
 * Nutzung:
 *   npm run telegram:setup                     # Webhook auf NEXT_PUBLIC_APP_URL setzen
 *   npm run telegram:setup -- --url=https://…  # abweichende Basis-URL (z. B. ngrok)
 *   npm run telegram:setup -- --info           # nur Status ausgeben
 *   npm run telegram:setup -- --delete         # Webhook abmelden (lokal per Polling testen)
 *
 * Benötigte ENV (.env.local):
 *   TELEGRAM_BOT_TOKEN       Token von @BotFather
 *   TELEGRAM_WEBHOOK_SECRET  frei gewählter Zufallsstring (identisch in Vercel!)
 *   NEXT_PUBLIC_APP_URL      z. B. https://capital-circle.de
 */
import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";

/* ── Env laden (.env.local, dann .env) ─────────────────────────────────────── */
for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error("✗ TELEGRAM_BOT_TOKEN fehlt (.env.local).");
  process.exit(1);
}
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

/* ── Argumente parsen ──────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name) => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
};

async function call(method, payload = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error(`✗ ${method}: ${json.description ?? res.status}`);
    process.exit(1);
  }
  return json.result;
}

async function printInfo() {
  const info = await call("getWebhookInfo");
  console.log("\n── Webhook-Status ──────────────────────────────");
  console.log(`  URL:              ${info.url || "(keiner gesetzt)"}`);
  console.log(`  Pending Updates:  ${info.pending_update_count ?? 0}`);
  if (info.last_error_message) {
    console.log(`  ⚠ Letzter Fehler: ${info.last_error_message}`);
  }
  console.log("");
}

/* ── Ausführen ─────────────────────────────────────────────────────────────── */
const me = await call("getMe");
console.log(`✓ Bot: @${me.username} (${me.first_name})`);

if (has("--info")) {
  await printInfo();
  process.exit(0);
}

if (has("--delete")) {
  await call("deleteWebhook", { drop_pending_updates: true });
  console.log("✓ Webhook abgemeldet.");
  await printInfo();
  process.exit(0);
}

const baseUrl = (valueOf("--url") ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
if (!baseUrl) {
  console.error("✗ Keine Basis-URL — NEXT_PUBLIC_APP_URL setzen oder --url=https://… übergeben.");
  process.exit(1);
}
if (!baseUrl.startsWith("https://")) {
  console.error("✗ Telegram akzeptiert nur HTTPS-Webhooks.");
  process.exit(1);
}
if (!secret) {
  console.error("✗ TELEGRAM_WEBHOOK_SECRET fehlt — ohne Secret wäre der Endpoint offen.");
  process.exit(1);
}

const webhookUrl = `${baseUrl}/api/telegram/webhook`;

await call("setWebhook", {
  url: webhookUrl,
  secret_token: secret,
  // Nur Nachrichten — keine Edits, Reactions, Chat-Member-Events.
  allowed_updates: ["message"],
  drop_pending_updates: true,
});
console.log(`✓ Webhook gesetzt: ${webhookUrl}`);

await call("setMyCommands", {
  commands: [{ command: "start", description: "Willkommen & Zugang" }],
});
console.log("✓ Befehlsmenü gesetzt (/start).");

await printInfo();
console.log(`Deep-Link mit Quelle: https://t.me/${me.username}?start=ig_bio\n`);
