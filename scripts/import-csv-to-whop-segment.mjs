/**
 * Importiert Kontakte aus einer beliebigen CSV (z. B. Whop-Export „Capital
 * Circle Free Discord") in dasselbe Resend-Segment wie
 * `sync-whop-campaign-segment.mjs` — für Mitglieder, die NUR in Whop/Discord
 * existieren und keine `profiles`-Zeile in unserer DB haben.
 *
 * Erwartet Spalten `Email` und `Name` im Header (case-insensitiv gesucht,
 * exakt wie im Whop-Export). Andere Spalten werden ignoriert.
 *
 * Nutzung:
 *   npm run import:csv-to-whop-segment -- "C:/Pfad/zur/Datei.csv"
 *   npm run import:csv-to-whop-segment -- "C:/Pfad/zur/Datei.csv" --dry-run
 *
 * ENV:
 *   RESEND_API_KEY            erforderlich
 *   RESEND_WHOP_SEGMENT_ID    erforderlich — dasselbe Segment wie beim
 *                              DB-Sync, sonst landen die Kontakte in zwei
 *                              getrennten Listen.
 */
import { Resend } from "resend";
import dotenv from "dotenv";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!csvPath) {
  console.error("Usage: npm run import:csv-to-whop-segment -- <path-to-csv> [--dry-run]");
  process.exit(1);
}
if (!existsSync(csvPath)) {
  console.error(`✗ Datei nicht gefunden: ${csvPath}`);
  process.exit(1);
}

const resendKey = process.env.RESEND_API_KEY?.trim();
const segmentId = process.env.RESEND_WHOP_SEGMENT_ID?.trim();
if (!resendKey) {
  console.error("✗ RESEND_API_KEY fehlt.");
  process.exit(1);
}
if (!segmentId && !dryRun) {
  console.error(
    "✗ RESEND_WHOP_SEGMENT_ID fehlt — erst `npm run sync:whop-segment` laufen lassen (legt das Segment an).",
  );
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\r") continue;
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

const raw = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(raw);
const header = rows[0].map((h) => h.trim().toLowerCase());
const emailIdx = header.indexOf("email");
const nameIdx = header.indexOf("name");

if (emailIdx === -1) {
  console.error(`✗ Keine "Email"-Spalte gefunden. Header: ${rows[0].join(", ")}`);
  process.exit(1);
}

function splitName(fullName, email) {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }
  const local = email.split("@")[0] ?? "";
  const firstName = local.charAt(0).toUpperCase() + local.slice(1);
  return { firstName: firstName || "Trader", lastName: "" };
}

const seen = new Map();
for (const r of rows.slice(1)) {
  const email = (r[emailIdx] ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) continue;
  if (seen.has(email)) continue;
  const name = nameIdx !== -1 ? r[nameIdx] : "";
  seen.set(email, splitName(name, email));
}

console.log(`→ ${rows.length - 1} Zeilen, ${seen.size} eindeutige Email-Adressen.`);

if (dryRun) {
  console.log("→ --dry-run: kein Resend-Aufruf, keine Änderungen.");
  process.exit(0);
}

const resend = new Resend(resendKey);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Der Resend-SDK-Aufruf hat kein eigenes Timeout — vereinzelt hängt ein
 * einzelner Request (beobachtet, Ursache unklar) und blockiert damit die
 * komplette sequenzielle Schleife für immer. Deshalb hartes Timeout pro
 * Versuch; ein Timeout zählt wie ein Rate-Limit als retrybar.
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function upsertContact({ email, firstName, lastName }) {
  const { error: updateError } = await resend.contacts.update({
    email,
    firstName,
    lastName: lastName || null,
    unsubscribed: false,
  });

  if (updateError && updateError.name === "not_found") {
    const { error: createError } = await resend.contacts.create({
      email,
      firstName,
      lastName: lastName || undefined,
      unsubscribed: false,
      segments: [{ id: segmentId }],
    });
    if (createError) throw new Error(createError.message);
  } else if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: segError } = await resend.contacts.segments.add({ email, segmentId });
  if (segError) throw new Error(segError.message);
}

let synced = 0;
let failed = 0;
for (const [email, { firstName, lastName }] of seen) {
  let attempt = 0;
  for (;;) {
    try {
      await withTimeout(upsertContact({ email, firstName, lastName }), 15000);
      synced += 1;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if ((/rate.?limit/i.test(msg) || msg === "timeout") && attempt < 3) {
        attempt += 1;
        await sleep(500 * attempt);
        continue;
      }
      failed += 1;
      console.error(`✗ ${email}: ${msg}`);
      break;
    }
  }
  if ((synced + failed) % 50 === 0) console.log(`  … ${synced + failed}/${seen.size}`);
  await sleep(120);
}

console.log(`✓ Fertig: ${synced} synct, ${failed} fehlgeschlagen. Segment: ${segmentId}`);
