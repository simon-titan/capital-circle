/**
 * CSV-Export: alle Mitglieder ohne Paid-Account (Whop-Migrations-Kampagne).
 *
 * Filter: `is_paid = false AND is_admin = false AND unsubscribed_at IS NULL
 * AND email IS NOT NULL` — bewusst simpel, siehe `config/whop-migration-campaign.ts`.
 *
 * Spalten (`email,first_name,last_name`) entsprechen dem CSV-Import-Format
 * von Resend (Contacts → Import), damit die Datei sich 1:1 in ein bestehendes
 * Segment hochladen lässt — z. B. um sie dort mit anderen, nicht auf der
 * Plattform registrierten Mitgliedern zusammenzuführen.
 *
 * Nutzung:
 *   npm run export:unpaid-members                      # -> exports/whop-migration-unpaid-members.csv
 *   npm run export:unpaid-members -- --out=./custom.csv
 *
 * Die Datei landet unter `/exports/` (siehe `.gitignore`) — nie committen,
 * sie enthält personenbezogene Daten.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error("✗ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env first.");
  process.exit(1);
}

const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith("--out="));
const outPath = outArg
  ? path.resolve(process.cwd(), outArg.slice("--out=".length))
  : path.resolve(process.cwd(), "exports/whop-migration-unpaid-members.csv");

const supabase = createClient(url, serviceRole);

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

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * `profiles` hat keine `email`-Spalte (die liegt in `auth.users`, nicht per
 * PostgREST erreichbar) — Email kommt daher über die Admin-API, paginiert
 * über alle Nutzer:innen.
 */
async function fetchEmailById() {
  const map = new Map();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("✗ auth.admin.listUsers fehlgeschlagen:", error.message);
      process.exit(1);
    }
    for (const u of data.users) {
      if (u.email) map.set(u.id, u.email);
    }
    if (data.users.length < 1000) break;
  }
  return map;
}

const emailById = await fetchEmailById();

const PAGE_SIZE = 1000;
const profileRows = [];
let from = 0;
for (;;) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("is_paid", false)
    .eq("is_admin", false)
    .is("unsubscribed_at", null)
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error("✗ Supabase-Query fehlgeschlagen:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) break;

  profileRows.push(...data);
  if (data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}

const lines = ["email,first_name,last_name"];
let skippedNoEmail = 0;
for (const row of profileRows) {
  const email = emailById.get(row.id);
  if (!email) {
    skippedNoEmail += 1;
    continue;
  }
  const { firstName, lastName } = splitName(row.full_name, email);
  lines.push([csvEscape(email), csvEscape(firstName), csvEscape(lastName)].join(","));
}
if (skippedNoEmail > 0) {
  console.warn(`⚠ ${skippedNoEmail} Profile ohne auffindbare Email übersprungen.`);
}

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

console.log(`✓ ${lines.length - 1} unbezahlte Mitglieder exportiert -> ${outPath}`);
